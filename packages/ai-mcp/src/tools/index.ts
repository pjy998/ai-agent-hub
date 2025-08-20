/**
 * 工具注册中心
 * 
 * 负责初始化和注册所有可用工具
 */

import { ToolManager } from './manager.js';
import { WriteFileTool, ReadFileTool, SearchFilesTool } from './file-tools.js';
import { RunShellTool, GitTool } from './shell-tools.js';

/**
 * 创建并配置工具管理器
 */
export function createToolManager(workspaceRoot: string): ToolManager {
    const manager = new ToolManager(workspaceRoot);

    // 注册文件操作工具
    manager.registerTool(new WriteFileTool(workspaceRoot));
    manager.registerTool(new ReadFileTool(workspaceRoot));
    manager.registerTool(new SearchFilesTool(workspaceRoot));

    // 注册Shell执行工具
    manager.registerTool(new RunShellTool(workspaceRoot));
    manager.registerTool(new GitTool(workspaceRoot));

    console.log(`🔧 Initialized tool manager with ${manager.listToolNames().length} tools`);
    console.log(`📝 Available tools: ${manager.listToolNames().join(', ')}`);

    return manager;
}

/**
 * 获取所有工具的MCP配置
 */
export function getToolsForMCP(workspaceRoot: string) {
    const manager = createToolManager(workspaceRoot);
    return manager.getToolConfigs();
}

/**
 * 验证工作区根目录
 */
export function validateWorkspaceRoot(workspaceRoot: string): boolean {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const stats = fs.statSync(workspaceRoot);
        if (!stats.isDirectory()) {
            throw new Error(`Workspace root is not a directory: ${workspaceRoot}`);
        }
        
        // 检查是否可写
        fs.accessSync(workspaceRoot, fs.constants.W_OK);
        
        console.log(`✅ Workspace root validated: ${workspaceRoot}`);
        return true;
    } catch (error) {
        console.error(`❌ Invalid workspace root: ${workspaceRoot}`, error);
        return false;
    }
}

/**
 * 工具执行的便捷函数
 */
export async function executeToolSafely(
    manager: ToolManager,
    toolName: string,
    params: any,
    context?: any
) {
    try {
        const result = await manager.executeTool(toolName, params, context);
        
        if (!result.success) {
            console.warn(`⚠️ Tool execution failed: ${toolName}`, result.error);
        }
        
        return result;
    } catch (error) {
        console.error(`💥 Tool execution error: ${toolName}`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown execution error'
        };
    }
}

/**
 * 批量执行工具（按顺序）
 */
export async function executeToolSequence(
    manager: ToolManager,
    toolSequence: Array<{ tool: string; params: any; context?: any }>
) {
    const results = [];
    
    for (const { tool, params, context } of toolSequence) {
        const result = await executeToolSafely(manager, tool, params, context);
        results.push({
            tool,
            params,
            result
        });
        
        // 如果某个工具失败，是否继续执行后续工具
        if (!result.success) {
            console.warn(`⚠️ Tool ${tool} failed in sequence, continuing...`);
        }
    }
    
    return results;
}
