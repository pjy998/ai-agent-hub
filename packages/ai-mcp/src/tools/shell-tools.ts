/**
 * Shell 执行工具
 * 
 * 提供安全的命令行执行功能
 */

import { BaseTool, ToolConfig, ToolExecutionResult } from './base.js';
import { exec, spawn } from 'child_process';
import * as path from 'path';

export class RunShellTool extends BaseTool {
    constructor(workspaceRoot: string) {
        const config: ToolConfig = {
            name: 'runShell',
            description: '执行shell命令（受安全限制）',
            version: '1.0.0',
            author: 'AI Agent Hub',
            parameters: {
                type: 'object',
                properties: {
                    command: {
                        type: 'string',
                        description: '要执行的shell命令'
                    },
                    timeout: {
                        type: 'number',
                        description: '命令超时时间（毫秒）',
                        default: 30000
                    },
                    workingDirectory: {
                        type: 'string',
                        description: '命令执行的工作目录（相对于工作区根目录）',
                        default: '.'
                    }
                },
                required: ['command']
            },
            security: {
                allowShellExecution: true,
                // 允许的命令模式
                allowedCommands: [
                    /^git\s+/, // Git命令
                    /^npm\s+/, // NPM命令
                    /^yarn\s+/, // Yarn命令
                    /^node\s+/, // Node.js命令
                    /^python\s+/, // Python命令
                    /^pip\s+/, // Pip命令
                    /^ls\s*/, // 列表命令
                    /^dir\s*/, // Windows列表命令
                    /^echo\s+/, // Echo命令
                    /^cat\s+/, // Cat命令
                    /^type\s+/, // Windows type命令
                    /^pwd\s*$/, // 当前目录
                    /^cd\s+/, // 切换目录
                    /^mkdir\s+/, // 创建目录
                    /^tsc\s*/, // TypeScript编译
                    /^webpack\s*/, // Webpack构建
                ],
                // 禁止的危险命令模式
                forbiddenCommands: [
                    /rm\s+-rf/, // 强制删除
                    /del\s+\/[sq]/, // Windows强制删除
                    /format\s+/, // 格式化
                    /fdisk\s+/, // 磁盘分区
                    /dd\s+/, // 直接磁盘访问
                    /sudo\s+/, // 提权
                    /su\s+/, // 切换用户
                    />.*\/dev\//, // 重定向到设备文件
                    /curl\s+.*\|\s*sh/, // 下载并执行脚本
                    /wget\s+.*\|\s*sh/, // 下载并执行脚本
                    /\|\s*bash/, // 管道到bash
                    /exec\(/, // 代码执行
                    /eval\(/, // 动态执行
                ]
            }
        };

        super(workspaceRoot, config);
    }

    async execute(params: any): Promise<ToolExecutionResult> {
        try {
            this.validateParameters(params);

            const { command, timeout = 30000, workingDirectory = '.' } = params;
            
            // 验证命令安全性
            this.validateShellCommand(command);
            
            const workDir = path.resolve(this.workspaceRoot, workingDirectory);
            
            // 确保工作目录存在且在工作区内
            if (!workDir.startsWith(this.workspaceRoot)) {
                throw new Error('Working directory must be within workspace');
            }

            const result = await this.executeCommand(command, workDir, timeout);

            return {
                success: true,
                result: result.output,
                metadata: {
                    command,
                    exitCode: result.exitCode,
                    workingDirectory,
                    executionTime: result.executionTime,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    private executeCommand(command: string, workDir: string, timeout: number): Promise<{
        output: string;
        exitCode: number;
        executionTime: number;
    }> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            exec(command, {
                cwd: workDir,
                timeout,
                maxBuffer: 1024 * 1024, // 1MB buffer
                env: {
                    ...process.env,
                    // 限制某些环境变量以增强安全性
                    PATH: process.env.PATH,
                    NODE_ENV: process.env.NODE_ENV || 'development'
                }
            }, (error, stdout, stderr) => {
                const executionTime = Date.now() - startTime;
                
                if (error) {
                    // 超时错误特殊处理
                    if (error.killed || error.message.includes('timeout')) {
                        reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
                        return;
                    }
                    
                    // 其他错误包含stderr信息
                    const exitCode = (error as any).code || 1;
                    const errorMessage = `Command failed with exit code ${exitCode}: ${error.message}`;
                    const fullError = stderr ? `${errorMessage}\nstderr: ${stderr}` : errorMessage;
                    reject(new Error(fullError));
                    return;
                }
                
                // 组合stdout和stderr
                let output = stdout;
                if (stderr) {
                    output += stderr ? `\nstderr: ${stderr}` : '';
                }
                
                resolve({
                    output: output || '(no output)',
                    exitCode: 0,
                    executionTime
                });
            });
        });
    }
}

export class GitTool extends BaseTool {
    constructor(workspaceRoot: string) {
        const config: ToolConfig = {
            name: 'git',
            description: '执行Git命令（受限的安全子集）',
            version: '1.0.0',
            author: 'AI Agent Hub',
            parameters: {
                type: 'object',
                properties: {
                    subcommand: {
                        type: 'string',
                        description: 'Git子命令',
                        enum: ['status', 'log', 'diff', 'show', 'branch', 'add', 'commit', 'push', 'pull', 'checkout', 'stash']
                    },
                    args: {
                        type: 'string',
                        description: 'Git命令参数',
                        default: ''
                    }
                },
                required: ['subcommand']
            },
            security: {
                allowShellExecution: true,
                // 只允许安全的git命令
                allowedCommands: [
                    /^git\s+(status|log|diff|show|branch|add|commit|push|pull|checkout|stash)/
                ],
                forbiddenCommands: [
                    /git\s+clean\s+-f/, // 强制清理
                    /git\s+reset\s+--hard/, // 硬重置
                    /git\s+rm\s+-rf/, // 强制删除
                ]
            }
        };

        super(workspaceRoot, config);
    }

    async execute(params: any): Promise<ToolExecutionResult> {
        try {
            this.validateParameters(params);

            const { subcommand, args = '' } = params;
            const command = `git ${subcommand} ${args}`.trim();
            
            this.validateShellCommand(command);

            // 使用RunShellTool来执行git命令
            const shellTool = new RunShellTool(this.workspaceRoot);
            const result = await shellTool.execute({
                command,
                timeout: 10000, // Git命令通常较快
                workingDirectory: '.'
            });

            return {
                success: result.success,
                result: result.result,
                error: result.error,
                metadata: {
                    gitCommand: command,
                    ...result.metadata
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
}
