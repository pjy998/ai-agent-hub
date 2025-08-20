/**
 * 基础工具类 - 所有MCP工具的基类
 * 提供通用的安全验证和错误处理功能
 */

import * as path from 'path';
import * as fs from 'fs';

// 工具执行结果接口
export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
    metadata?: any;
}

// 工具参数接口
export interface ToolParams {
    [key: string]: any;
}

// 工具执行上下文
export interface ToolContext {
    userId?: string;
    sessionId?: string;
    timestamp?: string;
    workspaceRoot: string;
}

/**
 * 基础工具抽象类
 */
export abstract class BaseTool {
    protected workspaceRoot: string;
    protected toolName: string;
    protected description: string;

    constructor(workspaceRoot: string, toolName: string, description: string) {
        this.workspaceRoot = workspaceRoot;
        this.toolName = toolName;
        this.description = description;
    }

    /**
     * 获取工具名称
     */
    getName(): string {
        return this.toolName;
    }

    /**
     * 获取工具描述
     */
    getDescription(): string {
        return this.description;
    }

    /**
     * 获取工具参数模式
     */
    abstract getSchema(): any;

    /**
     * 执行工具
     */
    abstract execute(params: ToolParams, context?: ToolContext): Promise<ToolResult>;

    /**
     * 验证文件路径安全性
     * 防止路径遍历攻击
     */
    protected validateFilePath(filePath: string): boolean {
        try {
            // 解析绝对路径
            const absolutePath = path.resolve(filePath);
            const workspaceAbsolutePath = path.resolve(this.workspaceRoot);

            // 检查路径是否在工作区内
            const relativePath = path.relative(workspaceAbsolutePath, absolutePath);
            
            // 如果相对路径以..开头，说明试图访问工作区外的文件
            if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
                console.warn(`🚨 Security: Attempted to access file outside workspace: ${filePath}`);
                return false;
            }

            // 检查危险路径模式
            const dangerousPatterns = [
                /\.\.\//, // 路径遍历
                /\\\.\.\\/, // Windows路径遍历
                /\/etc\//, // Unix系统文件
                /\/proc\//, // Unix进程文件
                /\/sys\//, // Unix系统文件
                /C:\\Windows\\/, // Windows系统文件
                /C:\\Program Files\\/, // Windows程序文件
            ];

            for (const pattern of dangerousPatterns) {
                if (pattern.test(absolutePath)) {
                    console.warn(`🚨 Security: Dangerous path pattern detected: ${filePath}`);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error(`❌ Path validation error for ${filePath}:`, error);
            return false;
        }
    }

    /**
     * 验证命令安全性
     * 防止危险命令执行
     */
    protected validateCommand(command: string): boolean {
        try {
            // 危险命令黑名单
            const dangerousCommands = [
                // 系统管理命令
                'rm', 'del', 'format', 'fdisk', 'mkfs',
                // 网络命令
                'wget', 'curl', 'nc', 'netcat', 'telnet',
                // 进程管理
                'kill', 'killall', 'pkill', 'taskkill',
                // 权限提升
                'sudo', 'su', 'runas', 'chmod', 'chown',
                // 系统服务
                'systemctl', 'service', 'sc.exe',
                // 注册表操作
                'reg', 'regedit',
                // PowerShell危险命令
                'Invoke-Expression', 'iex', 'Invoke-Command', 'icm',
                // 脚本下载执行
                'powershell', 'cmd.exe', 'bash', 'sh'
            ];

            const lowerCommand = command.toLowerCase();
            
            for (const dangerous of dangerousCommands) {
                if (lowerCommand.includes(dangerous.toLowerCase())) {
                    console.warn(`🚨 Security: Dangerous command detected: ${command}`);
                    return false;
                }
            }

            // 检查危险字符
            const dangerousChars = ['|', '&', ';', '`', '$', '>', '<', '||', '&&'];
            for (const char of dangerousChars) {
                if (command.includes(char)) {
                    console.warn(`🚨 Security: Dangerous character '${char}' in command: ${command}`);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error(`❌ Command validation error for ${command}:`, error);
            return false;
        }
    }

    /**
     * 验证参数
     */
    protected validateParams(params: ToolParams): boolean {
        try {
            if (!params || typeof params !== 'object') {
                return false;
            }

            // 检查参数大小限制
            const paramsString = JSON.stringify(params);
            if (paramsString.length > 10000) { // 10KB限制
                console.warn(`🚨 Security: Parameters too large: ${paramsString.length} bytes`);
                return false;
            }

            return true;
        } catch (error) {
            console.error('❌ Parameter validation error:', error);
            return false;
        }
    }

    /**
     * 创建安全的执行上下文
     */
    protected createContext(context?: ToolContext): ToolContext {
        return {
            userId: context?.userId || 'anonymous',
            sessionId: context?.sessionId || `session_${Date.now()}`,
            timestamp: new Date().toISOString(),
            workspaceRoot: this.workspaceRoot,
            ...context
        };
    }

    /**
     * 记录工具执行日志
     */
    protected logExecution(params: ToolParams, result: ToolResult, context?: ToolContext): void {
        const logEntry = {
            tool: this.toolName,
            timestamp: new Date().toISOString(),
            params: this.sanitizeForLog(params),
            success: result.success,
            error: result.error,
            context: context ? {
                userId: context.userId,
                sessionId: context.sessionId
            } : undefined
        };

        if (result.success) {
            console.log(`✅ Tool executed: ${this.toolName}`, logEntry);
        } else {
            console.error(`❌ Tool failed: ${this.toolName}`, logEntry);
        }
    }

    /**
     * 清理敏感信息用于日志记录
     */
    private sanitizeForLog(params: any): any {
        const sanitized = { ...params };
        
        // 移除敏感字段
        const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth'];
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }

        return sanitized;
    }
}