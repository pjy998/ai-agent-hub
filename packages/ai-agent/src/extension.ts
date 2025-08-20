import * as vscode from 'vscode';
// import { Client } from '@modelcontextprotocol/sdk/client';
import * as fs from 'fs';
import * as path from 'path';
import { SelfProjectScanAgent } from './agents/SelfProjectScanAgent';

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
    private client: any | null = null;
    private isConnected = false;

    async connect(): Promise<void> {
        try {
            // 这里需要根据实际的MCP SDK API进行调整
            // this.client = new Client({
            //     name: 'ai-agent-vscode',
            //     version: '0.0.9'
            // });
            
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
            stream.markdown(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
            stream.markdown(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
        } catch (error: any) {
            stream.markdown(`Error: ${error.message}`);
        }
    }
}

// 自我分析助手
class SelfAnalysisParticipant extends BaseChatParticipant {
    async handleRequest(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        const prompt = request.prompt.toLowerCase();
        
        try {
            // 检查用户输入的指令类型
            if (prompt.includes('分析') || prompt.includes('analyze') || prompt.includes('扫描') || prompt.includes('scan')) {
                stream.markdown('🔍 **开始项目自我分析...**\n\n');
                
                const { SelfProjectScanAgent } = await import('./agents/SelfProjectScanAgent');
                const agent = new SelfProjectScanAgent();
                
                // 执行分析
                stream.markdown('📁 正在扫描项目结构...\n');
                const analysis = await agent.scanProject();
                
                stream.markdown('📊 正在生成分析报告...\n');
                const report = await agent.generateReport(analysis);
                
                // 显示摘要结果
                stream.markdown(`## 📋 分析结果摘要\n\n`);
                stream.markdown(`- **整体健康度**: ${report.summary.overallHealth}/100\n`);
                stream.markdown(`- **关键问题**: ${report.summary.criticalIssues} 个\n`);
                stream.markdown(`- **改进建议**: ${report.summary.recommendations} 条\n\n`);
                
                // 显示组件状态
                stream.markdown(`## 🔧 核心组件状态\n\n`);
                for (const component of analysis.components) {
                    const statusEmoji = this.getStatusEmoji(component.status);
                    stream.markdown(`- **${component.name}**: ${statusEmoji} ${component.status}\n`);
                    if (component.issues.length > 0) {
                        stream.markdown(`  - 问题: ${component.issues.join(', ')}\n`);
                    }
                }
                
                // 显示高优先级建议
                const highPriorityRecs = analysis.recommendations.filter(r => r.priority === 'high');
                if (highPriorityRecs.length > 0) {
                    stream.markdown(`\n## 🔥 高优先级建议\n\n`);
                    highPriorityRecs.slice(0, 5).forEach((rec, index) => {
                        stream.markdown(`${index + 1}. **${rec.title}**\n`);
                        stream.markdown(`   - ${rec.description}\n`);
                        stream.markdown(`   - 影响: ${rec.impact}\n`);
                        stream.markdown(`   - 工作量: ${rec.effort}\n\n`);
                    });
                }
                
                // 保存完整报告
                const reportPath = await agent.saveReport(report, 'markdown');
                stream.markdown(`\n📄 **完整报告已保存**: \`${reportPath}\`\n\n`);
                stream.markdown(`💡 **提示**: 使用命令 \`AI Agent Hub: View Recommendations\` 查看详细建议`);
                
            } else if (prompt.includes('建议') || prompt.includes('recommend') || prompt.includes('改进') || prompt.includes('improve')) {
                stream.markdown('💡 **获取改进建议...**\n\n');
                
                const { SelfProjectScanAgent } = await import('./agents/SelfProjectScanAgent');
                const agent = new SelfProjectScanAgent();
                const analysis = await agent.scanProject();
                
                const recommendations = analysis.recommendations
                    .sort((a, b) => {
                        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                        return priorityOrder[b.priority] - priorityOrder[a.priority];
                    })
                    .slice(0, 10);
                
                stream.markdown(`## 📋 改进建议 (共${recommendations.length}条)\n\n`);
                
                recommendations.forEach((rec, index) => {
                    const priorityEmoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
                    stream.markdown(`### ${index + 1}. ${priorityEmoji} ${rec.title}\n\n`);
                    stream.markdown(`**描述**: ${rec.description}\n\n`);
                    stream.markdown(`**影响**: ${rec.impact}\n\n`);
                    stream.markdown(`**工作量**: ${rec.effort}\n\n`);
                    stream.markdown(`**实施步骤**:\n`);
                    rec.implementation.forEach((step, stepIndex) => {
                        stream.markdown(`${stepIndex + 1}. ${step}\n`);
                    });
                    stream.markdown(`\n---\n\n`);
                });
                
            } else if (prompt.includes('状态') || prompt.includes('status') || prompt.includes('健康') || prompt.includes('health')) {
                stream.markdown('📊 **检查项目状态...**\n\n');
                
                const { SelfProjectScanAgent } = await import('./agents/SelfProjectScanAgent');
                const agent = new SelfProjectScanAgent();
                const analysis = await agent.scanProject();
                const report = await agent.generateReport(analysis);
                
                stream.markdown(`## 🎯 项目健康状态\n\n`);
                stream.markdown(`**整体评分**: ${report.summary.overallHealth}/100\n\n`);
                
                const healthLevel = report.summary.overallHealth >= 80 ? '优秀 🟢' : 
                                 report.summary.overallHealth >= 60 ? '良好 🟡' : '需要改进 🔴';
                stream.markdown(`**健康等级**: ${healthLevel}\n\n`);
                
                stream.markdown(`## 📈 详细指标\n\n`);
                stream.markdown(`- 总文件数: ${analysis.structure.totalFiles}\n`);
                stream.markdown(`- 总代码行数: ${analysis.structure.totalLines}\n`);
                stream.markdown(`- 核心组件: ${analysis.components.length} 个\n`);
                stream.markdown(`- 关键问题: ${report.summary.criticalIssues} 个\n`);
                stream.markdown(`- 改进建议: ${report.summary.recommendations} 条\n\n`);
                
                // 组件状态概览
                const statusCounts = analysis.components.reduce((acc, comp) => {
                    acc[comp.status] = (acc[comp.status] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                
                stream.markdown(`## 🔧 组件状态分布\n\n`);
                Object.entries(statusCounts).forEach(([status, count]) => {
                    const emoji = this.getStatusEmoji(status as any);
                    stream.markdown(`- ${emoji} ${status}: ${count} 个\n`);
                });
                
            } else {
                // 默认帮助信息
                stream.markdown(`## 🤖 AI Agent Hub 自我分析助手\n\n`);
                stream.markdown(`我可以帮您分析项目状态和提供改进建议。您可以使用以下指令:\n\n`);
                stream.markdown(`### 📋 可用指令\n\n`);
                stream.markdown(`- **"分析项目"** 或 **"analyze"** - 执行完整的项目分析\n`);
                stream.markdown(`- **"查看建议"** 或 **"recommend"** - 获取改进建议\n`);
                stream.markdown(`- **"项目状态"** 或 **"status"** - 查看项目健康状态\n\n`);
                stream.markdown(`### 💡 使用示例\n\n`);
                stream.markdown(`- "请分析一下当前项目"\n`);
                stream.markdown(`- "有什么改进建议吗？"\n`);
                stream.markdown(`- "项目健康状态如何？"\n\n`);
                stream.markdown(`### 🚀 快速开始\n\n`);
                stream.markdown(`直接输入 **"分析项目"** 开始完整分析！`);
            }
            
        } catch (error: any) {
            stream.markdown(`❌ **分析失败**: ${error.message}\n\n`);
            stream.markdown(`请确保项目结构完整，或尝试使用命令面板中的 \`AI Agent Hub: Analyze Self\` 命令。`);
        }
    }
    
    private getStatusEmoji(status: string): string {
        switch (status) {
            case 'complete': return '✅';
            case 'partial': return '⚠️';
            case 'missing': return '❌';
            case 'broken': return '🔴';
            default: return '❓';
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
        const selfAnalysisParticipant = vscode.chat.createChatParticipant('ai-agent.analyze', new SelfAnalysisParticipant(mcpManager).handleRequest.bind(new SelfAnalysisParticipant(mcpManager)));
        
        // 注册自我分析命令
        const analyzeSelfCommand = vscode.commands.registerCommand('ai-agent-hub.analyzeSelf', async () => {
            try {
                vscode.window.showInformationMessage('🔍 开始项目自我分析...');
                
                const agent = new SelfProjectScanAgent();
                const analysis = await agent.scanProject();
                const report = await agent.generateReport(analysis);
                
                // 保存报告
                const reportPath = await agent.saveReport(report, 'markdown');
                
                // 显示结果
                vscode.window.showInformationMessage(
                    `✅ 分析完成！发现 ${report.summary.criticalIssues} 个关键问题`,
                    '查看报告'
                ).then(selection => {
                    if (selection === '查看报告') {
                        vscode.workspace.openTextDocument(reportPath).then(doc => {
                            vscode.window.showTextDocument(doc);
                        });
                    }
                });
                
            } catch (error: any) {
                vscode.window.showErrorMessage(`分析失败: ${error.message}`);
            }
        });

        const generateReportCommand = vscode.commands.registerCommand('ai-agent-hub.generateReport', async () => {
            try {
                const agent = new SelfProjectScanAgent();
                const analysis = await agent.scanProject();
                const report = await agent.generateReport(analysis);
                
                // 询问报告格式
                const format = await vscode.window.showQuickPick(
                    ['markdown', 'json', 'html'],
                    { placeHolder: '选择报告格式' }
                );
                
                if (format) {
                    const reportPath = await agent.saveReport(report, format as any);
                    vscode.window.showInformationMessage(`报告已生成: ${reportPath}`);
                }
                
            } catch (error: any) {
                vscode.window.showErrorMessage(`生成报告失败: ${error.message}`);
            }
        });

        const viewRecommendationsCommand = vscode.commands.registerCommand('ai-agent-hub.viewRecommendations', async () => {
            try {
                const agent = new SelfProjectScanAgent();
                const analysis = await agent.scanProject();
                
                const recommendations = analysis.recommendations
                    .filter(r => r.priority === 'high')
                    .slice(0, 10);
                
                if (recommendations.length === 0) {
                    vscode.window.showInformationMessage('🎉 没有发现高优先级问题！');
                    return;
                }
                
                const items = recommendations.map(rec => ({
                    label: `${rec.category === 'critical-fix' ? '🔴' : '⚠️'} ${rec.title}`,
                    description: rec.description,
                    detail: `影响: ${rec.impact} | 工作量: ${rec.effort}`
                }));
                
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: '选择要查看的建议',
                    canPickMany: false
                });
                
                if (selected) {
                    const rec = recommendations.find(r => r.title === selected.label.replace(/^[🔴⚠️] /, ''));
                    if (rec) {
                        vscode.window.showInformationMessage(
                            `${rec.title}\n\n${rec.description}\n\n实施步骤:\n${rec.implementation.join('\n')}`
                        );
                    }
                }
                
            } catch (error: any) {
                vscode.window.showErrorMessage(`查看建议失败: ${error.message}`);
            }
        });
        
        // 添加到上下文
        context.subscriptions.push(
            codingParticipant, 
            refactorParticipant, 
            requirementsParticipant, 
            statusBarItem,
            analyzeSelfCommand,
            generateReportCommand,
            viewRecommendationsCommand
        );
        
        console.log('AI Agent Hub extension activated successfully');
    } catch (error) {
        console.error('Failed to activate AI Agent Hub extension:', error);
        statusBarItem.text = '$(robot) AI Agent ✗';
        statusBarItem.tooltip = `AI Agent Hub Error: ${error instanceof Error ? error.message : String(error)}`;
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