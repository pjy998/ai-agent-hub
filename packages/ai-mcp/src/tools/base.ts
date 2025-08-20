/**
 * 基础工具接口定义
 * 
 * 定义了所有AI Agent工具必须实现的接口
 */

export interface ToolExecutionResult {
    success: boolean;
    result?: string;
    error?: string;
    metadata?: Record<string, any>;
}

export interface ToolConfig {
    name: string;
    description: string;
    version: string;
    author?: string;
    // 工具参数schema
    parameters: ToolParameterSchema;
    // 安全配置
    security?: ToolSecurityConfig;
}

export interface ToolParameterSchema {
    type: 'object';
    properties: Record<string, {
        type: string;
        description: string;
        required?: boolean;
        default?: any;
        enum?: any[];
    }>;
    required?: string[];
}

export interface ToolSecurityConfig {
    // 允许的文件扩展名
    allowedExtensions?: string[];
    // 禁止的文件扩展名
    forbiddenExtensions?: string[];
    // 允许的目录（相对于workspace root）
    allowedDirectories?: string[];
    // 禁止的目录
    forbiddenDirectories?: string[];
    // 允许的shell命令模式
    allowedCommands?: RegExp[];
    // 禁止的shell命令模式
    forbiddenCommands?: RegExp[];
    // 最大文件大小 (bytes)
    maxFileSize?: number;
    // 是否允许执行shell命令
    allowShellExecution?: boolean;
    // 是否允许网络访问
    allowNetworkAccess?: boolean;
}

/**
 * 抽象基础工具类
 * 
 * 所有具体工具都应该继承此类
 */
export abstract class BaseTool {
    protected workspaceRoot: string;
    protected config: ToolConfig;

    constructor(workspaceRoot: string, config: ToolConfig) {
        this.workspaceRoot = workspaceRoot;
        this.config = config;
    }

    /**
     * 获取工具配置信息
     */
    getConfig(): ToolConfig {
        return this.config;
    }

    /**
     * 获取工具名称
     */
    getName(): string {
        return this.config.name;
    }

    /**
     * 验证工具参数
     */
    protected validateParameters(params: any): boolean {
        const schema = this.config.parameters;
        
        // 检查必需参数
        if (schema.required) {
            for (const required of schema.required) {
                if (!(required in params)) {
                    throw new Error(`Missing required parameter: ${required}`);
                }
            }
        }

        // 检查参数类型（简化版）
        for (const [key, value] of Object.entries(params)) {
            if (key in schema.properties) {
                const paramSchema = schema.properties[key];
                if (paramSchema.enum && !paramSchema.enum.includes(value)) {
                    throw new Error(`Invalid value for ${key}: ${value}. Expected one of: ${paramSchema.enum.join(', ')}`);
                }
            }
        }

        return true;
    }

    /**
     * 安全检查：验证文件路径
     */
    protected validateFilePath(filePath: string): boolean {
        const security = this.config.security;
        if (!security) return true;

        const path = require('path');
        const normalizedPath = path.resolve(this.workspaceRoot, filePath);
        
        // 确保路径在workspace内
        if (!normalizedPath.startsWith(this.workspaceRoot)) {
            throw new Error('File path must be within workspace');
        }

        // 检查文件扩展名
        const ext = path.extname(filePath).toLowerCase();
        if (security.forbiddenExtensions?.includes(ext)) {
            throw new Error(`File extension ${ext} is not allowed`);
        }
        
        if (security.allowedExtensions && !security.allowedExtensions.includes(ext)) {
            throw new Error(`File extension ${ext} is not in allowed list`);
        }

        // 检查目录路径
        const relativePath = path.relative(this.workspaceRoot, normalizedPath);
        const dir = path.dirname(relativePath);
        
        if (security.forbiddenDirectories?.some(forbidden => dir.startsWith(forbidden))) {
            throw new Error(`Directory ${dir} is forbidden`);
        }
        
        if (security.allowedDirectories && !security.allowedDirectories.some(allowed => dir.startsWith(allowed))) {
            throw new Error(`Directory ${dir} is not in allowed list`);
        }

        return true;
    }

    /**
     * 安全检查：验证shell命令
     */
    protected validateShellCommand(command: string): boolean {
        const security = this.config.security;
        if (!security) return true;

        if (!security.allowShellExecution) {
            throw new Error('Shell command execution is disabled for this tool');
        }

        // 检查禁止的命令
        if (security.forbiddenCommands?.some(pattern => pattern.test(command))) {
            throw new Error(`Command pattern is forbidden: ${command}`);
        }

        // 检查允许的命令
        if (security.allowedCommands && !security.allowedCommands.some(pattern => pattern.test(command))) {
            throw new Error(`Command pattern is not allowed: ${command}`);
        }

        return true;
    }

    /**
     * 执行工具
     * 子类必须实现此方法
     */
    abstract execute(params: any): Promise<ToolExecutionResult>;
}

/**
 * 工具执行上下文
 */
export interface ToolExecutionContext {
    workspaceRoot: string;
    currentFile?: string;
    userIntent?: string;
    sessionId?: string;
    timestamp: number;
}

/**
 * 工具执行统计
 */
export interface ToolExecutionStats {
    toolName: string;
    executionTime: number;
    success: boolean;
    errorMessage?: string;
    timestamp: number;
}
