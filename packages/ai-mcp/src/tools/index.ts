/**
 * 工具管理器 - 统一管理所有MCP工具
 * 提供工具注册、执行和安全验证功能
 */

import { ToolManager } from './manager';
import { WriteFileTool, ReadFileTool, SearchFilesTool } from './file-tools';
import { RunShellTool, GitTool } from './shell-tools';

/**
 * 创建并初始化工具管理器
 */
export function createToolManager(workspaceRoot: string): ToolManager {
    const manager = new ToolManager(workspaceRoot);

    // 注册文件工具
    manager.registerTool(new WriteFileTool(workspaceRoot));
    manager.registerTool(new ReadFileTool(workspaceRoot));
    manager.registerTool(new SearchFilesTool(workspaceRoot));

    // 注册Shell工具
    manager.registerTool(new RunShellTool(workspaceRoot));
    manager.registerTool(new GitTool(workspaceRoot));

    console.log(`🔧 Initialized tool manager with ${manager.getToolNames().length} tools`);
    console.log(`📋 Available tools: ${manager.getToolNames().join(', ')}`);

    return manager;
}

/**
 * 获取工具列表
 */
export function getToolsList(workspaceRoot: string): any[] {
    const manager = createToolManager(workspaceRoot);
    return manager.getToolsSchema();
}

/**
 * 验证工作区安全性
 */
export function validateWorkspaceSecurity(workspaceRoot: string): boolean {
    const fs = require('fs');
    const path = require('path');

    try {
        const stats = fs.statSync(workspaceRoot);
        if (!stats.isDirectory()) {
            throw new Error(`Workspace root is not a directory: ${workspaceRoot}`);
        }

        // 基本安全检查
        fs.accessSync(workspaceRoot, fs.constants.R_OK);

        console.log(`✅ Workspace security validated: ${workspaceRoot}`);
        return true;
    } catch (error) {
        console.error(`❌ Workspace security validation failed: ${workspaceRoot}`, error);
        return false;
    }
}

/**
 * 安全执行工具调用
 */
export async function safeExecuteTool(
    manager: ToolManager,
    toolName: string,
    params: any,
    context?: any
): Promise<any> {
    try {
        const result = await manager.executeTool(toolName, params, context);

        if (!result.success) {
            console.warn(`⚠️ Tool execution warning for ${toolName}:`, result.error);
        }

        return result;
    } catch (error) {
        console.error(`❌ Tool execution failed for ${toolName}:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown tool execution error'
        };
    }
}

/**
 * 批量执行工具调用
 */
export async function executeBatchTools(
    manager: ToolManager,
    toolCalls: Array<{ name: string; params: any; context?: any }>
): Promise<any[]> {
    const results = [];

    for (const { name, params, context } of toolCalls) {
        const result = await safeExecuteTool(manager, name, params, context);
        results.push({
            name,
            params,
            result
        });

        // 如果工具执行失败，记录警告但继续执行
        if (!result.success) {
            console.warn(`⚠️ Tool ${name} failed, continuing with remaining tools`);
        }
    }

    return results;
}

// 导出所有工具类
export * from './manager';
export * from './file-tools';
export * from './shell-tools';
export * from './base';