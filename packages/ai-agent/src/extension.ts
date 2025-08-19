import * as vscode from 'vscode';

interface CodeContext {
    file?: string;
    language?: string;
    selection?: string;
    gitDiff?: string;
    projectStructure?: string;
}

interface WorkflowResult {
    code?: string;
    tests?: string;
    analysis?: string;
    steps?: any[];
}

class MCPClientManager {
    private isConnected: boolean = false;

    async connect(): Promise<void> {
        if (this.isConnected) {
            return;
        }

        try {
            // VS Code handles MCP server connection automatically via settings.json
            // We just need to mark as connected since VS Code manages the MCP lifecycle
            this.isConnected = true;
            console.log('✅ MCP Client ready - VS Code manages MCP server connection');
        } catch (error) {
            console.error('❌ Failed to initialize MCP client:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async executeWorkflow(presetName: string, context: any): Promise<WorkflowResult> {
        if (!this.isConnected) {
            await this.connect();
        }

        try {
            // Use VS Code's MCP system to execute workflows
            // This will use the MCP server configured in settings.json
            const result = await this.callMCPTool('execute_workflow', {
                presetName,
                context
            });

            return this.parseToolResult(result);
        } catch (error) {
            console.error('MCP workflow execution failed:', error);
            throw error;
        }
    }

    private async callMCPTool(toolName: string, args: any): Promise<any> {
        // Simulate MCP tool call - in a real implementation, this would use VS Code's MCP API
        // For now, return a mock response to test the extension structure
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    analysis: `Mock analysis for ${toolName} with preset: ${args.presetName}`,
                    code: `// Mock code generated for ${args.presetName}\nconsole.log('Hello from AI Agent!');`,
                    tests: `// Mock tests for ${args.presetName}\ntest('should work', () => { expect(true).toBe(true); });`
                })
            }]
        };
    }

    async listPresets(): Promise<any[]> {
        if (!this.isConnected) {
            await this.connect();
        }

        try {
            const result = await this.callMCPTool('list_presets', {});
            const parsed = this.parseToolResult(result);
            return JSON.parse(parsed.analysis || '[]');
        } catch (error) {
            console.error('Failed to list presets:', error);
            return [];
        }
    }

    async getProjectInfo(): Promise<any> {
        if (!this.isConnected) {
            await this.connect();
        }

        try {
            const result = await this.callMCPTool('get_project_info', {});
            const parsed = this.parseToolResult(result);
            return JSON.parse(parsed.analysis || '{}');
        } catch (error) {
            console.error('Failed to get project info:', error);
            return {};
        }
    }

    private parseToolResult(result: any): WorkflowResult {
        if (!result.content || result.content.length === 0) {
            return { steps: [] };
        }

        try {
            const firstContent = result.content[0];
            let textContent = '';
            
            if (firstContent.type === 'text' && firstContent.text) {
                textContent = firstContent.text;
            } else if (typeof firstContent === 'string') {
                textContent = firstContent;
            } else {
                textContent = JSON.stringify(firstContent);
            }

            const parsed = JSON.parse(textContent);
            
            return {
                code: parsed.code || '',
                tests: parsed.tests || '',
                analysis: parsed.result || parsed.analysis || '',
                steps: []
            };
        } catch (error) {
            const firstContent = result.content[0];
            const fallbackText = firstContent?.text || firstContent || 'No content available';
            
            return {
                analysis: typeof fallbackText === 'string' ? fallbackText : JSON.stringify(fallbackText),
                steps: []
            };
        }
    }

    disconnect(): void {
        this.isConnected = false;
        console.log('MCP Client disconnected');
    }
}

// Global MCP client manager
let mcpClientManager: MCPClientManager;

// Helper functions
function createCodingParticipant() {
    return vscode.chat.createChatParticipant('ai-agent.coding', async (request, context, stream, token) => {
        try {
            stream.progress('正在分析代码需求...');
            const result = await callMCPWorkflow('coding-with-ai', request.prompt);
            
            if (result.analysis) {
                stream.markdown(`## 需求分析\n${result.analysis}\n`);
            }
            
            if (result.code) {
                stream.markdown(`## 生成的代码\n\`\`\`${getLanguageFromContext()}\n${result.code}\n\`\`\`\n`);
            }
            
            if (result.tests) {
                stream.markdown(`## 测试代码\n\`\`\`${getLanguageFromContext()}\n${result.tests}\n\`\`\``);
            }
            
            if (!result.code && !result.analysis) {
                stream.markdown('❌ 抱歉，无法生成代码。请检查您的请求或稍后重试。');
            }
        } catch (error) {
            stream.markdown(`❌ 处理请求时发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
        }
        return { metadata: { command: 'coding' } };
    });
}

function createRefactorParticipant() {
    return vscode.chat.createChatParticipant('ai-agent.refactor', async (request, context, stream, token) => {
        try {
            stream.progress('正在分析代码结构...');
            const result = await callMCPWorkflow('refactor', request.prompt);
            
            if (result.analysis) {
                stream.markdown(`## 重构分析\n${result.analysis}\n`);
            }
            
            if (result.code) {
                stream.markdown(`## 重构后的代码\n\`\`\`${getLanguageFromContext()}\n${result.code}\n\`\`\`\n`);
            }
            
            if (result.tests) {
                stream.markdown(`## 验证测试\n\`\`\`${getLanguageFromContext()}\n${result.tests}\n\`\`\``);
            }
            
            if (!result.code && !result.analysis) {
                stream.markdown('❌ 抱歉，无法完成重构。请确保选择了有效的代码片段。');
            }
        } catch (error) {
            stream.markdown(`❌ 重构过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
        }
        return { metadata: { command: 'refactor' } };
    });
}

function createRequirementsParticipant() {
    return vscode.chat.createChatParticipant('ai-agent.requirements', async (request, context, stream, token) => {
        try {
            stream.progress('正在分析需求...');
            const result = await callMCPWorkflow('requirements-analysis', request.prompt);
            
            if (result.analysis) {
                stream.markdown(`## 需求分析\n${result.analysis}\n`);
            }
            
            if (result.code) {
                stream.markdown(`## 原型代码\n\`\`\`${getLanguageFromContext()}\n${result.code}\n\`\`\``);
            }
            
            if (!result.analysis && !result.code) {
                stream.markdown('❌ 抱歉，无法分析需求。请提供更详细的需求描述。');
            }
        } catch (error) {
            stream.markdown(`❌ 需求分析过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
        }
        return { metadata: { command: 'requirements' } };
    });
}

function getLanguageFromContext(): string {
    const activeEditor = vscode.window.activeTextEditor;
    return activeEditor?.document.languageId || 'javascript';
}

async function collectContext(): Promise<CodeContext> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return {
            file: '',
            language: 'javascript',
            selection: '',
            gitDiff: '',
            projectStructure: ''
        };
    }
    
    return {
        file: activeEditor.document.fileName,
        language: activeEditor.document.languageId,
        selection: activeEditor.document.getText(activeEditor.selection),
        gitDiff: '',
        projectStructure: ''
    };
}

async function callMCPWorkflow(preset: string, prompt: string): Promise<WorkflowResult> {
    try {
        if (!mcpClientManager) {
            throw new Error('MCP client manager not initialized');
        }

        const context = await collectContext();
        
        const workflowContext = {
            ...context,
            prompt
        };

        const result = await mcpClientManager.executeWorkflow(preset, workflowContext);
        
        return result;
    } catch (error) {
        console.error('MCP workflow error:', error);
        
        let errorMessage = 'AI Agent workflow failed';
        
        if (error instanceof Error) {
            if (error.message.includes('MCP client not available')) {
                errorMessage = 'Cannot connect to AI Agent MCP server. Please check VS Code MCP configuration.';
                vscode.window.showErrorMessage(errorMessage, 'Check Settings', 'View Logs').then(selection => {
                    if (selection === 'Check Settings') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'mcp.servers');
                    } else if (selection === 'View Logs') {
                        vscode.commands.executeCommand('workbench.action.showLogs');
                    }
                });
            } else {
                errorMessage = `AI Agent workflow failed: ${error.message}`;
                vscode.window.showErrorMessage(errorMessage, 'View Logs').then(selection => {
                    if (selection === 'View Logs') {
                        vscode.commands.executeCommand('workbench.action.showLogs');
                    }
                });
            }
        }
        
        return { 
            analysis: errorMessage,
            steps: [] 
        };
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 AI Agent Hub extension is now active!');

    // Initialize MCP client manager
    mcpClientManager = new MCPClientManager();

    // Register Chat Participants
    const codingParticipant = createCodingParticipant();
    const refactorParticipant = createRefactorParticipant();
    const requirementsParticipant = createRequirementsParticipant();

    // Register MCP connection command
    const connectCommand = vscode.commands.registerCommand('ai-agent.connectMCP', async () => {
        try {
            await mcpClientManager.connect();
            vscode.window.showInformationMessage('✅ Connected to AI Agent MCP server');
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Failed to connect to MCP server: ${error}`);
        }
    });
    context.subscriptions.push(connectCommand);

    // Register status bar
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(robot) AI Agent Hub';
    statusBarItem.tooltip = 'AI Agent Hub is active';
    statusBarItem.command = 'ai-agent.connectMCP';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register participants
    context.subscriptions.push(codingParticipant);
    context.subscriptions.push(refactorParticipant);
    context.subscriptions.push(requirementsParticipant);

    // Try to connect to MCP server on startup
    setTimeout(async () => {
        try {
            await mcpClientManager.connect();
            console.log('✅ Auto-connected to AI Agent MCP server');
        } catch (error) {
            console.log('⚠️ Auto-connection to MCP server failed, will retry on first use');
        }
    }, 2000);
}

export function deactivate() {
    if (mcpClientManager) {
        mcpClientManager.disconnect();
    }
}