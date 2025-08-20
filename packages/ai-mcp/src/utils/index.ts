/**
 * 工具实用程序 - 提供通用函数和配置管理
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * 配置接口
 */
export interface McpConfig {
    server: {
        name: string;
        version: string;
        port: number;
        host: string;
        timeout: number;
    };
    tools: {
        enabled: string[];
        disabled: string[];
        security: {
            workspace_restriction: boolean;
            command_whitelist: string[];
            max_file_size_mb: number;
            max_execution_time_ms: number;
        };
    };
    ai?: {
        defaultProvider: string;
        fallbackProviders: string[];
        maxRetries: number;
        retryDelay: number;
        requestTimeout: number;
        enableFallback: boolean;
        enableStats: boolean;
        providers: {
            [key: string]: {
                provider: string;
                model: string;
                apiKey?: string;
                baseUrl?: string;
                temperature?: number;
                maxTokens?: number;
                timeout?: number;
            };
        };
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        file: string;
    };
    presets: {
        directory: string;
        auto_load: boolean;
        cache_enabled: boolean;
    };
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: McpConfig = {
    server: {
        name: 'AI MCP Server',
        version: '0.0.9',
        port: 3000,
        host: 'localhost',
        timeout: 30000
    },
    tools: {
        enabled: ['write_file', 'read_file', 'search_files', 'run_shell', 'git'],
        disabled: [],
        security: {
            workspace_restriction: true,
            command_whitelist: ['npm', 'yarn', 'git', 'node', 'python', 'ls', 'dir', 'cat', 'type'],
            max_file_size_mb: 10,
            max_execution_time_ms: 30000
        }
    },
    ai: {
        defaultProvider: 'local',
        fallbackProviders: ['local'],
        maxRetries: 3,
        retryDelay: 1000,
        requestTimeout: 30000,
        enableFallback: true,
        enableStats: true,
        providers: {
            local: {
                provider: 'local',
                model: 'mock-gpt-4',
                temperature: 0.7,
                maxTokens: 2000
            },
            openai: {
                provider: 'openai',
                model: 'gpt-4o-mini',
                temperature: 0.7,
                maxTokens: 2000
                // apiKey: process.env.OPENAI_API_KEY
            },
            anthropic: {
                provider: 'anthropic',
                model: 'claude-3-5-haiku-20241022',
                temperature: 0.7,
                maxTokens: 2000
                // apiKey: process.env.ANTHROPIC_API_KEY
            }
        }
    },
    logging: {
        level: 'info',
        file: 'mcp-server.log'
    },
    presets: {
        directory: './agents/presets',
        auto_load: true,
        cache_enabled: true
    }
};

/**
 * 配置管理器
 */
export class ConfigManager {
    private config: McpConfig;
    private configPath: string;

    constructor(configPath?: string) {
        this.configPath = configPath || path.join(process.cwd(), 'mcp-config.json');
        this.config = this.loadConfig();
    }

    /**
     * 加载配置
     */
    private loadConfig(): McpConfig {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                const userConfig = JSON.parse(configData);
                return this.mergeConfig(DEFAULT_CONFIG, userConfig);
            }
        } catch (error) {
            // 使用stderr输出配置加载失败的警告
            process.stderr.write(`[WARN] Failed to load config from ${this.configPath}: ${error}\n`);
        }
        
        return { ...DEFAULT_CONFIG };
    }

    /**
     * 合并配置
     */
    private mergeConfig(defaultConfig: any, userConfig: any): any {
        const merged = { ...defaultConfig };
        
        for (const key in userConfig) {
            if (userConfig.hasOwnProperty(key)) {
                if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
                    merged[key] = this.mergeConfig(defaultConfig[key] || {}, userConfig[key]);
                } else {
                    merged[key] = userConfig[key];
                }
            }
        }
        
        return merged;
    }

    /**
     * 获取配置
     */
    getConfig(): McpConfig {
        return this.config;
    }

    /**
     * 更新配置
     */
    updateConfig(updates: Partial<McpConfig>): void {
        this.config = this.mergeConfig(this.config, updates);
    }

    /**
     * 保存配置
     */
    saveConfig(): void {
        try {
            const configData = JSON.stringify(this.config, null, 2);
            fs.writeFileSync(this.configPath, configData, 'utf8');
        } catch (error) {
            console.error(`Failed to save config to ${this.configPath}:`, error);
        }
    }

    /**
     * 重置为默认配置
     */
    resetToDefault(): void {
        this.config = { ...DEFAULT_CONFIG };
    }
}

/**
 * 日志级别
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

/**
 * 简单日志记录器
 */
export class Logger {
    private level: LogLevel;
    private logFile?: string;

    constructor(configOrLevel: McpConfig['logging'] | LogLevel) {
        if (typeof configOrLevel === 'number') {
            // 直接传入LogLevel
            this.level = configOrLevel;
            this.logFile = undefined;
        } else {
            // 传入配置对象
            this.level = this.parseLogLevel(configOrLevel.level);
            this.logFile = configOrLevel.file;
        }
    }

    private parseLogLevel(level: string): LogLevel {
        switch (level.toLowerCase()) {
            case 'debug': return LogLevel.DEBUG;
            case 'info': return LogLevel.INFO;
            case 'warn': return LogLevel.WARN;
            case 'error': return LogLevel.ERROR;
            default: return LogLevel.INFO;
        }
    }

    private log(level: LogLevel, message: string, ...args: any[]): void {
        if (level < this.level) return;

        const timestamp = new Date().toISOString();
        const levelName = LogLevel[level].toLowerCase();
        const logMessage = `[${timestamp}] [${levelName}] ${message}`;

        // 根据MCP协议规范：所有日志都应该通过stderr输出，stdout专用于JSON-RPC通信
        // VS Code将stderr显示为warning是正常的客户端行为，但我们需要保留级别标签来区分消息类型
        const simpleMessage = `[${levelName}] ${message}${args.length > 0 ? ' ' + JSON.stringify(args) : ''}`;
        process.stderr.write(`${simpleMessage}\n`);

        if (this.logFile) {
            try {
                const fullMessage = args.length > 0 
                    ? `${logMessage} ${JSON.stringify(args)}\n`
                    : `${logMessage}\n`;
                fs.appendFileSync(this.logFile, fullMessage, 'utf8');
            } catch (error) {
                process.stderr.write(`Failed to write to log file: ${error}\n`);
            }
        }
    }

    debug(message: string, ...args: any[]): void {
        this.log(LogLevel.DEBUG, message, ...args);
    }

    info(message: string, ...args: any[]): void {
        this.log(LogLevel.INFO, message, ...args);
    }

    warn(message: string, ...args: any[]): void {
        this.log(LogLevel.WARN, message, ...args);
    }

    error(message: string, ...args: any[]): void {
        this.log(LogLevel.ERROR, message, ...args);
    }
}

/**
 * 工具函数
 */
export class Utils {
    /**
     * 验证文件路径安全性
     */
    static validateFilePath(filePath: string, workspaceRoot: string): boolean {
        try {
            const normalizedPath = path.normalize(filePath);
            const absolutePath = path.resolve(workspaceRoot, normalizedPath);
            
            // 检查路径是否在工作区内
            if (!absolutePath.startsWith(workspaceRoot)) {
                return false;
            }
            
            // 检查危险路径模式
            const dangerousPatterns = [
                /\.\./,  // 父目录引用
                /^\//,   // 绝对路径
                /^[a-zA-Z]:/,  // Windows驱动器路径
                /\0/,    // 空字节
                /[<>:"|?*]/  // Windows非法字符
            ];
            
            for (const pattern of dangerousPatterns) {
                if (pattern.test(normalizedPath)) {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 验证命令安全性
     */
    static validateCommand(command: string, whitelist: string[]): boolean {
        const baseCommand = command.split(' ')[0].toLowerCase();
        
        // 检查是否在白名单中
        if (whitelist.length > 0 && !whitelist.includes(baseCommand)) {
            return false;
        }
        
        // 检查危险模式
        const dangerousPatterns = [
            /rm\s+-rf/i,
            /del\s+\/[sq]/i,
            /format/i,
            /shutdown/i,
            /reboot/i,
            /kill\s+-9/i,
            /dd\s+if=/i,
            />/,  // 重定向
            /\|\s*(sh|bash|cmd)/i
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(command)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 格式化文件大小
     */
    static formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    /**
     * 格式化执行时间
     */
    static formatExecutionTime(milliseconds: number): string {
        if (milliseconds < 1000) {
            return `${milliseconds}ms`;
        } else if (milliseconds < 60000) {
            return `${(milliseconds / 1000).toFixed(2)}s`;
        } else {
            const minutes = Math.floor(milliseconds / 60000);
            const seconds = ((milliseconds % 60000) / 1000).toFixed(2);
            return `${minutes}m ${seconds}s`;
        }
    }

    /**
     * 清理敏感信息
     */
    static sanitizeForLogging(data: any): any {
        if (typeof data !== 'object' || data === null) {
            return data;
        }
        
        const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
        const sanitized = Array.isArray(data) ? [] : {};
        
        for (const [key, value] of Object.entries(data)) {
            const keyLower = key.toLowerCase();
            const isSensitive = sensitiveKeys.some(sensitive => keyLower.includes(sensitive));
            
            if (isSensitive) {
                (sanitized as any)[key] = '[REDACTED]';
            } else if (typeof value === 'object' && value !== null) {
                (sanitized as any)[key] = this.sanitizeForLogging(value);
            } else {
                (sanitized as any)[key] = value;
            }
        }
        
        return sanitized;
    }

    /**
     * 生成唯一ID
     */
    static generateId(): string {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    /**
     * 延迟函数
     */
    static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 重试函数
     */
    static async retry<T>(
        fn: () => Promise<T>,
        maxAttempts: number = 3,
        delayMs: number = 1000
    ): Promise<T> {
        let lastError: Error;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                if (attempt === maxAttempts) {
                    throw lastError;
                }
                
                await this.delay(delayMs * attempt);
            }
        }
        
        throw lastError!;
    }

    /**
     * 深度克隆对象
     */
    static deepClone<T>(obj: T): T {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime()) as any;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item)) as any;
        }
        
        const cloned = {} as T;
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        
        return cloned;
    }
}

/**
 * 全局Logger实例
 */
export const logger = new Logger(DEFAULT_CONFIG.logging);