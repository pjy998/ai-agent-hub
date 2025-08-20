#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListRootsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
const { logger } = require('./utils/logger.js');

// 导入新的Tools框架
import { createToolManager, validateWorkspaceRoot, executeToolSafely } from './src/tools/index.js';
import { ToolManager } from './src/tools/manager.js';

interface PresetConfig {
    name: string;
    description: string;
    agents: string[];
    steps: PresetStep[];
}

interface PresetStep {
    name: string;
    agent: string;
    prompt: string;
    output?: string;
}

class AIAgentMCPServer {
    private server: Server;
    private presets: Map<string, PresetConfig> = new Map();
    private toolManager: ToolManager;
    private workspaceRoot: string;

    constructor() {
        // 确定工作区根目录
        this.workspaceRoot = process.cwd();
        
        // 验证并初始化工作区
        if (!validateWorkspaceRoot(this.workspaceRoot)) {
            console.error(`Invalid workspace root: ${this.workspaceRoot}`);
            process.exit(1);
        }

        // 初始化工具管理器
        this.toolManager = createToolManager(this.workspaceRoot);

        this.server = new Server(
            {
                name: 'ai-agent-hub',
                version: '0.0.5', // 升级版本
            },
            {
                capabilities: {
                    tools: {},
                    roots: {
                        listChanged: true
                    },
                },
            }
        );

        this.loadPresets();
        this.setupToolHandlers();
        this.setupErrorHandling();
    }

    private loadPresets() {
        // 智能查找预设目录：优先使用工作区路径，回退到相对路径
        let presetsDir = path.join(process.cwd(), 'agents', 'presets');
        
        // 如果当前工作目录下没有预设，尝试查找项目根目录
        if (!fs.existsSync(presetsDir)) {
            // 从当前脚本位置向上查找项目根目录
            const currentDir = path.dirname(__filename);
            const projectRoot = path.resolve(currentDir, '../../..');
            const rootPresetsDir = path.join(projectRoot, 'agents', 'presets');
            
            if (fs.existsSync(rootPresetsDir)) {
                presetsDir = rootPresetsDir;
                logger.mcpDebug(`Found presets in project root: ${presetsDir}`);
            } else {
                console.error(`Presets directory not found in either location:`);
                console.error(`  - Working directory: ${path.join(process.cwd(), 'agents', 'presets')}`);
                console.error(`  - Project root: ${rootPresetsDir}`);
                console.error(`Current working directory: ${process.cwd()}`);
                return;
            }
        } else {
            logger.mcpDebug(`Found presets in working directory: ${presetsDir}`);
        }

        const presetFiles = fs.readdirSync(presetsDir).filter(file => file.endsWith('.yaml'));
        
        for (const file of presetFiles) {
            try {
                const content = fs.readFileSync(path.join(presetsDir, file), 'utf8');
                const preset = yaml.parse(content) as PresetConfig;
                this.presets.set(preset.name, preset);
                console.error(`Loaded preset: ${preset.name}`);
            } catch (error) {
                console.error(`Failed to load preset ${file}:`, error);
            }
        }
    }

    private setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            // 组合预设工具和基础工具
            const presetTools: Tool[] = [
                {
                    name: 'execute_workflow',
                    description: 'Execute an AI workflow preset',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            presetName: {
                                type: 'string',
                                description: 'Name of the workflow preset to execute',
                                enum: Array.from(this.presets.keys())
                            },
                            context: {
                                type: 'object',
                                properties: {
                                    file: { type: 'string', description: 'File path' },
                                    language: { type: 'string', description: 'Programming language' },
                                    selection: { type: 'string', description: 'Selected code' },
                                    gitDiff: { type: 'string', description: 'Git diff' },
                                    prompt: { type: 'string', description: 'User prompt/query' }
                                }
                            }
                        },
                        required: ['presetName']
                    }
                },
                {
                    name: 'list_presets',
                    description: 'List all available workflow presets',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'get_project_info', 
                    description: 'Get project information and structure',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                }
            ];

            // 获取工具框架提供的工具
            const frameworkTools = this.toolManager.getToolConfigs();
            
            // 转换为MCP Tool格式
            const mcpFrameworkTools: Tool[] = frameworkTools.map(tool => ({
                name: tool.name,
                description: tool.description,
                inputSchema: {
                    type: "object" as const,
                    properties: tool.inputSchema.properties,
                    required: tool.inputSchema.required || []
                }
            }));

            // 组合所有工具
            const allTools = [...presetTools, ...mcpFrameworkTools];
            
            logger.mcpDebug(`🔧 Providing ${allTools.length} tools: ${allTools.map(t => t.name).join(', ')}`);
            
            return { tools: allTools };
        });

        // 添加Roots协议支持
        this.server.setRequestHandler(ListRootsRequestSchema, async () => {
            const workspaceRoot = process.cwd();
            const presetsPath = path.join(workspaceRoot, 'agents', 'presets');
            
            const roots = [
                {
                    uri: `file://${workspaceRoot}`,
                    name: path.basename(workspaceRoot) || 'Project Root'
                }
            ];
            
            // 如果预设目录存在，也添加为根目录
            if (fs.existsSync(presetsPath)) {
                roots.push({
                    uri: `file://${presetsPath}`,
                    name: 'AI Agent Presets'
                });
            }
            
            logger.mcpDebug(`📁 Providing roots: ${roots.map(r => r.name).join(', ')}`);
            return { roots };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    // 预设相关工具
                    case 'execute_workflow':
                        if (!args) throw new Error('Missing arguments');
                        return await this.runWorkflow(args.presetName as string, args.context || {});
                    
                    case 'list_presets':
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(
                                        Array.from(this.presets.values()).map(p => ({
                                            name: p.name,
                                            description: p.description,
                                            agents: p.agents
                                        })),
                                        null,
                                        2
                                    )
                                }
                            ]
                        };

                    case 'get_project_info':
                        return await this.getProjectInfo();

                    default:
                        // 尝试使用工具框架执行工具
                        if (this.toolManager.hasTool(name)) {
                            const result = await executeToolSafely(
                                this.toolManager,
                                name,
                                args || {},
                                {
                                    workspaceRoot: this.workspaceRoot,
                                    timestamp: Date.now()
                                }
                            );

                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: result.success 
                                            ? (result.result || 'Operation completed successfully')
                                            : `Error: ${result.error}`
                                    }
                                ]
                            };
                        }

                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                logger.mcpDebug(`💥 Tool execution error: ${name}`, error);
                
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
                        }
                    ]
                };
            }
        });
    }

    private async runWorkflow(presetName: string, context: any) {
        const preset = this.presets.get(presetName);
        if (!preset) {
            throw new Error(`Preset not found: ${presetName}`);
        }

        const results: any = {};
        const replay: any[] = [];

        for (const step of preset.steps) {
            const prompt = this.buildPrompt(step.prompt, context);
            const response = await this.executeStep(step, prompt, context);
            
            replay.push({
                step: step.name,
                agent: step.agent,
                prompt,
                response,
                timestamp: new Date().toISOString()
            });

            if (step.output) {
                results[step.output] = response;
            }
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ ...results, replay }, null, 2)
                }
            ]
        };
    }

    private async getProjectInfo() {
        const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
        let projectInfo: any = {
            workspaceRoot: this.workspaceRoot,
            timestamp: new Date().toISOString()
        };

        try {
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                projectInfo.package = {
                    name: packageJson.name,
                    version: packageJson.version,
                    description: packageJson.description,
                    main: packageJson.main,
                    scripts: packageJson.scripts,
                    dependencies: Object.keys(packageJson.dependencies || {}),
                    devDependencies: Object.keys(packageJson.devDependencies || {})
                };
            }

            // 获取工具统计信息
            const toolStats = this.toolManager.getExecutionSummary();
            projectInfo.tools = {
                available: this.toolManager.listToolNames(),
                stats: toolStats
            };

        } catch (error) {
            projectInfo.error = error instanceof Error ? error.message : 'Unknown error';
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(projectInfo, null, 2)
                }
            ]
        };
    }

    private buildPrompt(template: string, context: any): string {
        let prompt = template;
        Object.keys(context).forEach(key => {
            const placeholder = `{{${key}}}`;
            if (prompt.includes(placeholder)) {
                prompt = prompt.replace(new RegExp(placeholder, 'g'), context[key] || '');
            }
        });
        return prompt;
    }

    private async executeStep(step: PresetStep, prompt: string, context: any): Promise<string> {
        // 现在我们有真实的工具，但AI模型集成还在开发中
        // 暂时使用增强的mock响应，展示工具使用潜力
        
        logger.mcpDebug(`🤖 Executing step: ${step.name} with agent: ${step.agent}`);
        
        try {
            switch (step.agent) {
                case 'coder':
                    // 模拟使用文件写入工具
                    const fileName = context.file ? path.basename(context.file) : 'generated.js';
                    const codeContent = this.generateMockCode(prompt, context);
                    
                    return `${codeContent}\n\n// 💡 提示: 一旦AI模型集成完成，这将是真正由AI生成的代码\n// 🔧 可使用工具: ${this.toolManager.listToolNames().join(', ')}`;
                
                case 'tester':
                    const testContent = this.generateMockTests(prompt, context);
                    return `${testContent}\n\n// 💡 提示: 一旦AI模型集成完成，这将是真正由AI生成的测试\n// 🔧 可用工具: runShell (执行测试), writeFile (保存测试文件)`;
                
                case 'requirements':
                    const analysisContent = this.generateMockAnalysis(prompt, context);
                    return `${analysisContent}\n\n// 💡 提示: 一旦AI模型集成完成，这将是真正的需求分析\n// 🔧 可用工具: searchFiles (分析现有代码), readFile (理解项目结构)`;
                
                default:
                    return `🤖 Agent "${step.agent}" 准备就绪，等待AI模型集成\n📝 Prompt: ${prompt.substring(0, 100)}...\n🔧 可用工具: ${this.toolManager.listToolNames().join(', ')}\n⚡ 工具统计: ${JSON.stringify(this.toolManager.getExecutionSummary())}`;
            }
        } catch (error) {
            logger.mcpDebug(`❌ Step execution error: ${step.name}`, error);
            return `Error in ${step.agent}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }

    private generateMockCode(prompt: string, context: any): string {
        const language = context.language || 'javascript';
        const fileName = context.file ? path.basename(context.file) : 'unknown';
        
        return `// AI Generated Code for ${fileName} (${language})
// Based on prompt: ${prompt.substring(0, 50)}...

${language === 'typescript' ? `
interface GeneratedInterface {
    id: string;
    data: any;
    process(): Promise<boolean>;
}

class AIGeneratedClass implements GeneratedInterface {
    constructor(public id: string, public data: any) {}
    
    async process(): Promise<boolean> {
        console.log('Processing with AI Agent Hub');
        return true;
    }
}
` : `
function aiGeneratedFunction(data) {
    console.log('Generated by AI Agent Hub v0.0.5');
    console.log('Context:', data);
    return { success: true, processed: true };
}

module.exports = { aiGeneratedFunction };
`}`;
    }

    private generateMockTests(prompt: string, context: any): string {
        return `// AI Generated Tests
// Based on: ${prompt.substring(0, 50)}...

describe('AI Generated Test Suite', () => {
    test('should handle basic functionality', () => {
        expect(true).toBe(true);
    });
    
    test('should process data correctly', async () => {
        const result = await processData('test');
        expect(result.success).toBe(true);
    });
    
    test('should handle error cases', () => {
        expect(() => {
            throw new Error('test error');
        }).toThrow('test error');
    });
});`;
    }

    private generateMockAnalysis(prompt: string, context: any): string {
        return `# AI需求分析报告

## 用户需求
${prompt}

## 上下文分析
- 当前文件: ${context.file || '未指定'}
- 编程语言: ${context.language || '未指定'}
- 选中代码: ${context.selection ? '是' : '否'}

## 建议的实现步骤
1. 分析现有代码结构
2. 设计接口和数据模型
3. 实现核心功能
4. 添加错误处理
5. 编写单元测试
6. 集成测试

## 可用工具建议
- writeFile: 创建新文件
- readFile: 分析现有代码
- searchFiles: 查找相关文件
- git: 版本控制操作
- runShell: 执行构建和测试

## 预估复杂度
中等 - 预计需要使用多个工具协作完成`;
    }

    private setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error('[MCP Error]', error);
        };

        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        
        // 启动时显示版本信息
        logger.mcpStartup(`AI Agent Hub MCP Server v0.0.4 started successfully`);
        logger.mcpStartup(`Working directory: ${process.cwd()}`);
    }
}

const server = new AIAgentMCPServer();
server.run().catch(console.error);