/**
 * Shell和Git工具 - 提供安全的命令执行功能
 */

import { spawn, exec } from 'child_process';
import * as path from 'path';
import { BaseTool, ToolResult, ToolParams, ToolContext } from './base';

/**
 * Shell命令执行工具
 */
export class RunShellTool extends BaseTool {
    private readonly allowedCommands: Set<string>;
    private readonly blockedCommands: Set<string>;

    constructor(workspaceRoot: string) {
        super(workspaceRoot, 'run_shell', 'Execute shell commands with security restrictions');
        
        // 允许的安全命令
        this.allowedCommands = new Set([
            'ls', 'dir', 'pwd', 'cd', 'cat', 'type', 'echo', 'find', 'grep',
            'npm', 'yarn', 'pnpm', 'node', 'python', 'pip',
            'git', 'mvn', 'gradle', 'make', 'cmake',
            'docker', 'kubectl', 'helm',
            'curl', 'wget', 'ping', 'nslookup',
            'ps', 'top', 'htop', 'df', 'du', 'free', 'uptime'
        ]);
        
        // 明确禁止的危险命令
        this.blockedCommands = new Set([
            'rm', 'del', 'rmdir', 'rd', 'format', 'fdisk',
            'sudo', 'su', 'chmod', 'chown', 'passwd',
            'shutdown', 'reboot', 'halt', 'poweroff',
            'kill', 'killall', 'pkill', 'taskkill',
            'dd', 'mkfs', 'mount', 'umount',
            'iptables', 'ufw', 'firewall-cmd',
            'crontab', 'at', 'systemctl', 'service'
        ]);
    }

    getSchema(): any {
        return {
            type: 'object',
            properties: {
                command: {
                    type: 'string',
                    description: 'Shell command to execute'
                },
                args: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Command arguments',
                    default: []
                },
                working_directory: {
                    type: 'string',
                    description: 'Working directory for command execution (relative to workspace)',
                    default: '.'
                },
                timeout_seconds: {
                    type: 'number',
                    description: 'Command timeout in seconds',
                    default: 30
                },
                capture_output: {
                    type: 'boolean',
                    description: 'Whether to capture command output',
                    default: true
                }
            },
            required: ['command']
        };
    }

    async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
        const safeContext = this.createContext(context);
        
        try {
            // 验证参数
            if (!this.validateParams(params)) {
                return { success: false, error: 'Invalid parameters' };
            }

            const {
                command,
                args = [],
                working_directory = '.',
                timeout_seconds = 30,
                capture_output = true
            } = params;

            if (!command || typeof command !== 'string') {
                return { success: false, error: 'command is required and must be a string' };
            }

            // 验证命令安全性
            if (!this.validateCommand(command)) {
                return { success: false, error: `Command not allowed or potentially dangerous: ${command}` };
            }

            // 验证工作目录
            const workingDir = path.resolve(this.workspaceRoot, working_directory);
            if (!workingDir.startsWith(this.workspaceRoot)) {
                return { success: false, error: 'Working directory must be within workspace' };
            }

            // 执行命令
            const result = await this.executeCommand(
                command,
                args,
                workingDir,
                timeout_seconds * 1000,
                capture_output
            );

            const toolResult: ToolResult = {
                success: result.exitCode === 0,
                data: {
                    command: command,
                    args: args,
                    exit_code: result.exitCode,
                    stdout: result.stdout,
                    stderr: result.stderr,
                    execution_time_ms: result.executionTime,
                    working_directory: working_directory
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    timeout_seconds: timeout_seconds
                }
            };

            if (result.exitCode !== 0) {
                toolResult.error = `Command failed with exit code ${result.exitCode}`;
            }

            this.logExecution(params, toolResult, safeContext);
            return toolResult;

        } catch (error) {
            const result: ToolResult = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown command execution error'
            };
            
            this.logExecution(params, result, safeContext);
            return result;
        }
    }

    protected validateCommand(command: string): boolean {
        const baseCommand = command.split(' ')[0].toLowerCase();
        
        // 检查是否在禁止列表中
        if (this.blockedCommands.has(baseCommand)) {
            return false;
        }
        
        // 检查危险模式
        const dangerousPatterns = [
            /rm\s+-rf/i,
            /del\s+\/[sq]/i,
            /format\s+[a-z]:/i,
            /shutdown/i,
            /reboot/i,
            /kill\s+-9/i,
            /dd\s+if=/i,
            />/,  // 重定向可能危险
            /\|\s*sh/i,
            /\|\s*bash/i,
            /\|\s*cmd/i
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(command)) {
                return false;
            }
        }
        
        return true;
    }

    private executeCommand(
        command: string,
        args: string[],
        workingDir: string,
        timeoutMs: number,
        captureOutput: boolean
    ): Promise<{ exitCode: number; stdout: string; stderr: string; executionTime: number }> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let stdout = '';
            let stderr = '';
            
            const child = spawn(command, args, {
                cwd: workingDir,
                stdio: captureOutput ? 'pipe' : 'inherit',
                shell: true
            });

            if (captureOutput) {
                child.stdout?.on('data', (data) => {
                    stdout += data.toString();
                });

                child.stderr?.on('data', (data) => {
                    stderr += data.toString();
                });
            }

            const timeout = setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error(`Command timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            child.on('close', (code) => {
                clearTimeout(timeout);
                const executionTime = Date.now() - startTime;
                
                resolve({
                    exitCode: code || 0,
                    stdout: stdout,
                    stderr: stderr,
                    executionTime: executionTime
                });
            });

            child.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }
}

/**
 * Git操作工具
 */
export class GitTool extends BaseTool {
    constructor(workspaceRoot: string) {
        super(workspaceRoot, 'git', 'Execute Git commands with safety checks');
    }

    getSchema(): any {
        return {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['status', 'log', 'diff', 'branch', 'add', 'commit', 'push', 'pull', 'clone', 'init'],
                    description: 'Git action to perform'
                },
                args: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Additional arguments for the git command',
                    default: []
                },
                message: {
                    type: 'string',
                    description: 'Commit message (required for commit action)'
                },
                files: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Files to add (for add action)',
                    default: []
                },
                safe_mode: {
                    type: 'boolean',
                    description: 'Enable safe mode (prevents destructive operations)',
                    default: true
                }
            },
            required: ['action']
        };
    }

    async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
        const safeContext = this.createContext(context);
        
        try {
            // 验证参数
            if (!this.validateParams(params)) {
                return { success: false, error: 'Invalid parameters' };
            }

            const { action, args = [], message, files = [], safe_mode = true } = params;

            if (!action || typeof action !== 'string') {
                return { success: false, error: 'action is required and must be a string' };
            }

            // 构建Git命令
            const gitCommand = this.buildGitCommand(action, args, message, files, safe_mode);
            
            if (!gitCommand) {
                return { success: false, error: `Invalid or unsafe git action: ${action}` };
            }

            // 执行Git命令
            const result = await this.executeGitCommand(gitCommand);

            const toolResult: ToolResult = {
                success: result.exitCode === 0,
                data: {
                    action: action,
                    command: gitCommand.join(' '),
                    exit_code: result.exitCode,
                    output: result.stdout,
                    error_output: result.stderr,
                    execution_time_ms: result.executionTime
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    safe_mode: safe_mode
                }
            };

            if (result.exitCode !== 0) {
                toolResult.error = `Git command failed with exit code ${result.exitCode}`;
            }

            this.logExecution(params, toolResult, safeContext);
            return toolResult;

        } catch (error) {
            const result: ToolResult = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown git error'
            };
            
            this.logExecution(params, result, safeContext);
            return result;
        }
    }

    private buildGitCommand(
        action: string,
        args: string[],
        message?: string,
        files?: string[],
        safeMode?: boolean
    ): string[] | null {
        const command = ['git'];
        
        switch (action) {
            case 'status':
                command.push('status', ...args);
                break;
                
            case 'log':
                command.push('log', '--oneline', '-10', ...args);
                break;
                
            case 'diff':
                command.push('diff', ...args);
                break;
                
            case 'branch':
                command.push('branch', ...args);
                break;
                
            case 'add':
                if (files && files.length > 0) {
                    // 验证文件路径
                    for (const file of files) {
                        if (!this.validateFilePath(file)) {
                            return null;
                        }
                    }
                    command.push('add', ...files, ...args);
                } else {
                    command.push('add', '.', ...args);
                }
                break;
                
            case 'commit':
                if (!message) {
                    return null;
                }
                command.push('commit', '-m', message, ...args);
                break;
                
            case 'push':
                if (safeMode) {
                    // 在安全模式下，只允许推送到当前分支
                    command.push('push', 'origin', 'HEAD', ...args);
                } else {
                    command.push('push', ...args);
                }
                break;
                
            case 'pull':
                command.push('pull', ...args);
                break;
                
            case 'clone':
                if (safeMode) {
                    // 安全模式下不允许克隆
                    return null;
                }
                command.push('clone', ...args);
                break;
                
            case 'init':
                command.push('init', ...args);
                break;
                
            default:
                return null;
        }
        
        return command;
    }

    private executeGitCommand(
        command: string[]
    ): Promise<{ exitCode: number; stdout: string; stderr: string; executionTime: number }> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            exec(command.join(' '), {
                cwd: this.workspaceRoot,
                timeout: 30000 // 30秒超时
            }, (error, stdout, stderr) => {
                const executionTime = Date.now() - startTime;
                
                if (error) {
                    resolve({
                        exitCode: error.code || 1,
                        stdout: stdout,
                        stderr: stderr,
                        executionTime: executionTime
                    });
                } else {
                    resolve({
                        exitCode: 0,
                        stdout: stdout,
                        stderr: stderr,
                        executionTime: executionTime
                    });
                }
            });
        });
    }
}