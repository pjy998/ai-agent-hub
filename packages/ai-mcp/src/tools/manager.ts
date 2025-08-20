/**
 * 工具管理器 - 统一管理所有MCP工具
 * 提供工具注册、执行、统计和配置管理功能
 */

import { BaseTool, ToolResult, ToolParams, ToolContext } from './base';
import { logger } from '../utils/index.js';

// 工具统计信息
interface ToolStats {
    totalCalls: number;
    successCalls: number;
    failedCalls: number;
    lastUsed: string;
    averageExecutionTime: number;
}

// 工具配置
interface ToolConfig {
    enabled: boolean;
    maxConcurrentCalls: number;
    timeoutMs: number;
    rateLimitPerMinute: number;
}

/**
 * 工具管理器类
 */
export class ToolManager {
    private tools: Map<string, BaseTool> = new Map();
    private toolStats: Map<string, ToolStats> = new Map();
    private toolConfigs: Map<string, ToolConfig> = new Map();
    private activeCalls: Map<string, number> = new Map();
    private rateLimitTracker: Map<string, number[]> = new Map();
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        logger.info(`🔧 Tool Manager initialized for workspace: ${workspaceRoot}`);
    }

    /**
     * 注册工具
     */
    registerTool(tool: BaseTool, config?: Partial<ToolConfig>): void {
        const toolName = tool.getName();
        
        if (this.tools.has(toolName)) {
            logger.warn(`⚠️ Tool ${toolName} is already registered, overwriting...`);
        }

        this.tools.set(toolName, tool);
        
        // 初始化统计信息
        this.toolStats.set(toolName, {
            totalCalls: 0,
            successCalls: 0,
            failedCalls: 0,
            lastUsed: '',
            averageExecutionTime: 0
        });

        // 设置默认配置
        const defaultConfig: ToolConfig = {
            enabled: true,
            maxConcurrentCalls: 5,
            timeoutMs: 30000, // 30秒
            rateLimitPerMinute: 60
        };

        this.toolConfigs.set(toolName, { ...defaultConfig, ...config });
        this.activeCalls.set(toolName, 0);
        this.rateLimitTracker.set(toolName, []);

        logger.info(`✅ Registered tool: ${toolName}`);
    }

    /**
     * 获取工具
     */
    getTool(toolName: string): BaseTool | undefined {
        return this.tools.get(toolName);
    }

    /**
     * 获取所有工具名称
     */
    getToolNames(): string[] {
        return Array.from(this.tools.keys());
    }

    /**
     * 获取工具模式定义
     */
    getToolsSchema(): any[] {
        return Array.from(this.tools.values()).map(tool => ({
            name: tool.getName(),
            description: tool.getDescription(),
            inputSchema: tool.getSchema()
        }));
    }

    /**
     * 执行工具
     */
    async executeTool(
        toolName: string, 
        params: ToolParams, 
        context?: ToolContext
    ): Promise<ToolResult> {
        const startTime = Date.now();
        
        try {
            // 验证工具存在
            const tool = this.tools.get(toolName);
            if (!tool) {
                return {
                    success: false,
                    error: `Tool not found: ${toolName}`
                };
            }

            // 检查工具是否启用
            const config = this.toolConfigs.get(toolName);
            if (!config?.enabled) {
                return {
                    success: false,
                    error: `Tool is disabled: ${toolName}`
                };
            }

            // 检查并发限制
            const activeCalls = this.activeCalls.get(toolName) || 0;
            if (activeCalls >= config.maxConcurrentCalls) {
                return {
                    success: false,
                    error: `Tool concurrent limit exceeded: ${toolName} (${activeCalls}/${config.maxConcurrentCalls})`
                };
            }

            // 检查速率限制
            if (!this.checkRateLimit(toolName)) {
                return {
                    success: false,
                    error: `Tool rate limit exceeded: ${toolName}`
                };
            }

            // 增加活跃调用计数
            this.activeCalls.set(toolName, activeCalls + 1);

            // 执行工具（带超时）
            const result = await this.executeWithTimeout(
                tool.execute(params, context),
                config.timeoutMs
            );

            // 更新统计信息
            this.updateStats(toolName, result, Date.now() - startTime);

            return result;

        } catch (error) {
            const result: ToolResult = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown execution error'
            };
            
            this.updateStats(toolName, result, Date.now() - startTime);
            return result;

        } finally {
            // 减少活跃调用计数
            const activeCalls = this.activeCalls.get(toolName) || 0;
            this.activeCalls.set(toolName, Math.max(0, activeCalls - 1));
        }
    }

    /**
     * 带超时的执行
     */
    private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Tool execution timeout after ${timeoutMs}ms`));
            }, timeoutMs);

            promise
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(timer));
        });
    }

    /**
     * 检查速率限制
     */
    private checkRateLimit(toolName: string): boolean {
        const config = this.toolConfigs.get(toolName);
        if (!config) return false;

        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        let callTimes = this.rateLimitTracker.get(toolName) || [];
        
        // 清理一分钟前的记录
        callTimes = callTimes.filter(time => time > oneMinuteAgo);
        
        // 检查是否超过限制
        if (callTimes.length >= config.rateLimitPerMinute) {
            return false;
        }
        
        // 添加当前调用时间
        callTimes.push(now);
        this.rateLimitTracker.set(toolName, callTimes);
        
        return true;
    }

    /**
     * 更新工具统计信息
     */
    private updateStats(toolName: string, result: ToolResult, executionTime: number): void {
        const stats = this.toolStats.get(toolName);
        if (!stats) return;

        stats.totalCalls++;
        stats.lastUsed = new Date().toISOString();
        
        if (result.success) {
            stats.successCalls++;
        } else {
            stats.failedCalls++;
        }

        // 更新平均执行时间
        stats.averageExecutionTime = (
            (stats.averageExecutionTime * (stats.totalCalls - 1) + executionTime) / 
            stats.totalCalls
        );

        this.toolStats.set(toolName, stats);
    }

    /**
     * 获取工具统计信息
     */
    getToolStats(toolName?: string): Map<string, ToolStats> | ToolStats | undefined {
        if (toolName) {
            return this.toolStats.get(toolName);
        }
        return this.toolStats;
    }

    /**
     * 获取工具配置
     */
    getToolConfig(toolName: string): ToolConfig | undefined {
        return this.toolConfigs.get(toolName);
    }

    /**
     * 更新工具配置
     */
    updateToolConfig(toolName: string, config: Partial<ToolConfig>): boolean {
        const existingConfig = this.toolConfigs.get(toolName);
        if (!existingConfig) {
            logger.error(`❌ Tool not found for config update: ${toolName}`);
            return false;
        }

        const newConfig = { ...existingConfig, ...config };
        this.toolConfigs.set(toolName, newConfig);
        
        logger.info(`✅ Updated config for tool: ${toolName}`);
        return true;
    }

    /**
     * 启用/禁用工具
     */
    setToolEnabled(toolName: string, enabled: boolean): boolean {
        return this.updateToolConfig(toolName, { enabled });
    }

    /**
     * 获取管理器状态
     */
    getManagerStatus(): any {
        const totalTools = this.tools.size;
        const enabledTools = Array.from(this.toolConfigs.values())
            .filter(config => config.enabled).length;
        
        const totalCalls = Array.from(this.toolStats.values())
            .reduce((sum, stats) => sum + stats.totalCalls, 0);
        
        const totalSuccessCalls = Array.from(this.toolStats.values())
            .reduce((sum, stats) => sum + stats.successCalls, 0);

        return {
            workspaceRoot: this.workspaceRoot,
            totalTools,
            enabledTools,
            totalCalls,
            successRate: totalCalls > 0 ? (totalSuccessCalls / totalCalls * 100).toFixed(2) + '%' : '0%',
            activeCalls: Array.from(this.activeCalls.values()).reduce((sum, count) => sum + count, 0)
        };
    }

    /**
     * 重置统计信息
     */
    resetStats(toolName?: string): void {
        if (toolName) {
            const stats = this.toolStats.get(toolName);
            if (stats) {
                Object.assign(stats, {
                    totalCalls: 0,
                    successCalls: 0,
                    failedCalls: 0,
                    lastUsed: '',
                    averageExecutionTime: 0
                });
                logger.info(`📊 Reset stats for tool: ${toolName}`);
            }
        } else {
            this.toolStats.clear();
            // 重新初始化所有工具的统计信息
            for (const toolName of this.tools.keys()) {
                this.toolStats.set(toolName, {
                    totalCalls: 0,
                    successCalls: 0,
                    failedCalls: 0,
                    lastUsed: '',
                    averageExecutionTime: 0
                });
            }
            logger.info(`📊 Reset all tool statistics`);
        }
    }
}