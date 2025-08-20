/**
 * 工具管理器
 * 
 * 负责工具的注册、发现、执行和管理
 */

import { BaseTool, ToolExecutionResult, ToolExecutionContext, ToolExecutionStats } from './base.js';

export class ToolManager {
    private tools: Map<string, BaseTool> = new Map();
    private executionStats: ToolExecutionStats[] = [];
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * 注册工具
     */
    registerTool(tool: BaseTool): void {
        const name = tool.getName();
        if (this.tools.has(name)) {
            throw new Error(`Tool ${name} is already registered`);
        }
        
        this.tools.set(name, tool);
        console.log(`✅ Registered tool: ${name}`);
    }

    /**
     * 获取所有已注册的工具
     */
    getTools(): BaseTool[] {
        return Array.from(this.tools.values());
    }

    /**
     * 获取工具配置列表（用于MCP工具发现）
     */
    getToolConfigs() {
        return Array.from(this.tools.values()).map(tool => ({
            name: tool.getName(),
            description: tool.getConfig().description,
            inputSchema: {
                type: 'object',
                properties: tool.getConfig().parameters.properties,
                required: tool.getConfig().parameters.required || []
            }
        }));
    }

    /**
     * 执行工具
     */
    async executeTool(
        toolName: string, 
        params: any, 
        context?: ToolExecutionContext
    ): Promise<ToolExecutionResult> {
        const tool = this.tools.get(toolName);
        if (!tool) {
            const error = `Tool not found: ${toolName}. Available tools: ${Array.from(this.tools.keys()).join(', ')}`;
            return {
                success: false,
                error
            };
        }

        const executionContext: ToolExecutionContext = {
            workspaceRoot: this.workspaceRoot,
            timestamp: Date.now(),
            ...context
        };

        const startTime = Date.now();
        let result: ToolExecutionResult;
        let success = false;
        let errorMessage: string | undefined;

        try {
            console.log(`🔧 Executing tool: ${toolName} with params:`, JSON.stringify(params, null, 2));
            result = await tool.execute(params);
            success = result.success;
            if (!success) {
                errorMessage = result.error;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            errorMessage = message;
            result = {
                success: false,
                error: message
            };
        }

        const executionTime = Date.now() - startTime;
        
        // 记录执行统计
        this.executionStats.push({
            toolName,
            executionTime,
            success,
            errorMessage,
            timestamp: startTime
        });

        // 保持统计记录在合理范围内
        if (this.executionStats.length > 1000) {
            this.executionStats = this.executionStats.slice(-500);
        }

        console.log(`${success ? '✅' : '❌'} Tool ${toolName} executed in ${executionTime}ms`);
        
        return result;
    }

    /**
     * 获取工具执行统计
     */
    getExecutionStats(): ToolExecutionStats[] {
        return [...this.executionStats];
    }

    /**
     * 获取工具执行摘要
     */
    getExecutionSummary() {
        const stats = this.executionStats;
        if (stats.length === 0) {
            return {
                totalExecutions: 0,
                successRate: 0,
                averageExecutionTime: 0,
                toolUsage: {}
            };
        }

        const successful = stats.filter(s => s.success).length;
        const totalTime = stats.reduce((sum, s) => sum + s.executionTime, 0);
        
        // 统计每个工具的使用频率
        const toolUsage: Record<string, number> = {};
        stats.forEach(s => {
            toolUsage[s.toolName] = (toolUsage[s.toolName] || 0) + 1;
        });

        return {
            totalExecutions: stats.length,
            successRate: successful / stats.length,
            averageExecutionTime: totalTime / stats.length,
            toolUsage
        };
    }

    /**
     * 清理执行统计
     */
    clearStats(): void {
        this.executionStats = [];
    }

    /**
     * 检查工具是否存在
     */
    hasTool(name: string): boolean {
        return this.tools.has(name);
    }

    /**
     * 获取特定工具
     */
    getTool(name: string): BaseTool | undefined {
        return this.tools.get(name);
    }

    /**
     * 注销工具
     */
    unregisterTool(name: string): boolean {
        const removed = this.tools.delete(name);
        if (removed) {
            console.log(`🗑️ Unregistered tool: ${name}`);
        }
        return removed;
    }

    /**
     * 列出所有工具名称
     */
    listToolNames(): string[] {
        return Array.from(this.tools.keys());
    }

    /**
     * 验证工具参数格式
     */
    validateToolParams(toolName: string, params: any): boolean {
        const tool = this.tools.get(toolName);
        if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
        }

        // 这会在工具内部验证，如果验证失败会抛出异常
        return true;
    }
}
