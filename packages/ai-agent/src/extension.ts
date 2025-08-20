import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client';
import * as fs from 'fs';
import * as path from 'path';

// 版本信息显示
function showVersionInfo() {
    try {
        // 读取根目录的package.json获取版本信息
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspaceRoot) {
            const packageJsonPath = path.join(workspaceRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const version = packageJson.version || 'unknown';
                const name = packageJson.name || 'ai-agent-hub';
                
                console.log(`🚀 AI Agent Hub Extension Started - ${name} v${version}`);
                vscode.window.showInformationMessage(`AI Agent Hub v${version} activated successfully!`);
            }
        }
    } catch (error) {
        console.error('Failed to read version info:', error);
        vscode.window.showInformationMessage('AI Agent Hub activated successfully!');
    }
}

// 代码上下文接口
interface CodeContext {
    filePath: string;
    language: string;
    content: string;
    selection?: vscode.Range;
    gitInfo?: any;
}

// MCP客户端管理器
class MCPClientManager {
    private client: Client | null = null;
    private isConnected = false;

    async connect(): Promise<void> {
        try {
            // 这里需要根据实际的MCP SDK API进行调整
            this.client = new Client({
                name: 'ai-agent-vscode',
                version: '0.0.9'
            });
            
            // 连接到MCP服务器
            await this.client.connect();
            this.isConnected = true;
            console.log('Connected to MCP server');
        } catch (error) {
            console.error('Failed to connect to MCP server:', error);
            this.isConnected = false;
        }
    }

    async executeWorkflow(preset: string, context: CodeContext): Promise<string> {
        if (!this.isConnected || !this.client) {
            throw new Error('MCP client not connected');
        }

        try {
            // 执行工作流
            const result = await this.client.request({
                method: 'tools/call',
                params: {
                    name: 'execute_workflow',
                    arguments: {
                        preset,
                        context
                    }
                }
            });
            
            return result.content || 'Workflow executed successfully';
        } catch (error) {
            console.error('Workflow execution failed:', error);
            throw error;
        }
    }

    disconnect(): void {
        if (this.client) {
            this.client.close();
            this.client = null;
            this.isConnected = false;
        }
    }
}

// Chat参与者基类
abstract class BaseChatParticipant {
    protected mcpManager: MCPClientManager;

    constructor(mcpManager: MCPClientManager) {
        this.mcpManager = mcpManager;
    }

    abstract handleRequest(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void>;

    protected async collectContext(): Promise<CodeContext> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            throw new Error('No active editor');
        }

        return {
            filePath: editor.document.fileName,
            language: editor.document.languageId,
            content: editor.document.getText(),
            selection: editor.selection.isEmpty ? undefined : editor.selection
        };
    }
}

// 编码助手
class CodingParticipant extends BaseChatParticipant {
    async handleRequest(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        try {
            const codeContext = await this.collectContext();
            const result = await this.mcpManager.executeWorkflow('coding-with-ai', codeContext);
            
            stream.markdown(result);
        } catch (error) {
            stream.markdown(`Error: ${error.message}`);
        }
    }
}

// 重构助手
class RefactorParticipant extends BaseChatParticipant {
    async handleRequest(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        try {
            const codeContext = await this.collectContext();
            const result = await this.mcpManager.executeWorkflow('refactor', codeContext);
            
            stream.markdown(result);
        } catch (error) {
            stream.markdown(`Error: ${error.message}`);
        }
    }
}

// 需求分析助手
class RequirementsParticipant extends BaseChatParticipant {
    async handleRequest(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        try {
            const codeContext = await this.collectContext();
            const result = await this.mcpManager.executeWorkflow('requirements-analysis', codeContext);
            
            stream.markdown(result);
        } catch (error) {
            stream.markdown(`Error: ${error.message}`);
        }
    }
}

// 全局变量
let mcpManager: MCPClientManager;
let statusBarItem: vscode.StatusBarItem;

// 扩展激活函数
export async function activate(context: vscode.ExtensionContext) {
    console.log('AI Agent Hub extension is being activated...');
    
    // 显示版本信息
    showVersionInfo();
    
    // 初始化MCP管理器
    mcpManager = new MCPClientManager();
    
    // 创建状态栏项
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(robot) AI Agent';
    statusBarItem.tooltip = 'AI Agent Hub Status';
    statusBarItem.show();
    
    try {
        // 连接到MCP服务器
        await mcpManager.connect();
        statusBarItem.text = '$(robot) AI Agent ✓';
        statusBarItem.tooltip = 'AI Agent Hub Connected';
        
        // 注册Chat参与者
        const codingParticipant = vscode.chat.createChatParticipant('ai-agent.coding', new CodingParticipant(mcpManager).handleRequest.bind(new CodingParticipant(mcpManager)));
        const refactorParticipant = vscode.chat.createChatParticipant('ai-agent.refactor', new RefactorParticipant(mcpManager).handleRequest.bind(new RefactorParticipant(mcpManager)));
        const requirementsParticipant = vscode.chat.createChatParticipant('ai-agent.requirements', new RequirementsParticipant(mcpManager).handleRequest.bind(new RequirementsParticipant(mcpManager)));
        
        // 添加到上下文
        context.subscriptions.push(codingParticipant, refactorParticipant, requirementsParticipant, statusBarItem);
        
        console.log('AI Agent Hub extension activated successfully');
    } catch (error) {
        console.error('Failed to activate AI Agent Hub extension:', error);
        statusBarItem.text = '$(robot) AI Agent ✗';
        statusBarItem.tooltip = `AI Agent Hub Error: ${error.message}`;
    }
}

// 扩展停用函数
export function deactivate() {
    console.log('AI Agent Hub extension is being deactivated...');
    
    if (mcpManager) {
        mcpManager.disconnect();
    }
    
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    
    console.log('AI Agent Hub extension deactivated');
}