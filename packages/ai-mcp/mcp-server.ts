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
import { AIModelManager, createDefaultAIManager } from './src/ai-model.js';

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
    private aiManager: AIModelManager;
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

        // 初始化AI模型管理器
        this.aiManager = createDefaultAIManager();

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
        logger.mcpDebug(`🤖 Executing step: ${step.name} with agent: ${step.agent}`);
        
        try {
            // 构建针对不同代理的系统提示
            const systemPrompt = this.buildSystemPrompt(step.agent, context);
            
            // 构建增强的用户提示
            const enhancedPrompt = this.buildEnhancedPrompt(step, prompt, context);
            
            // 尝试使用真实AI模型
            try {
                const aiResponse = await this.aiManager.callModel(enhancedPrompt, systemPrompt);
                
                return `${aiResponse.content}

---
**AI Model Info**: ${aiResponse.model} | **Tokens**: ${aiResponse.usage?.totalTokens || 0} | **Time**: ${aiResponse.timestamp}
🔧 **Available Tools**: ${this.toolManager.listToolNames().join(', ')}`;

            } catch (aiError: any) {
                // AI调用失败，使用增强的mock响应
                logger.mcpDebug(`AI model call failed, using enhanced mock: ${aiError.message}`);
                return this.generateEnhancedMockResponse(step, prompt, context);
            }
        } catch (error: any) {
            logger.mcpDebug(`❌ Step execution error: ${step.name}`, error);
            return `Error in ${step.agent}: ${error.message}`;
        }
    }

    private buildSystemPrompt(agent: string, context: any): string {
        const basePrompt = `You are a helpful AI assistant specialized in ${agent}. You have access to powerful tools for file operations, shell commands, and project analysis.`;
        
        switch (agent) {
            case 'coder':
                return `${basePrompt}

You are an expert software developer. Your task is to write clean, efficient, and well-documented code.

Available Tools:
- writeFile: Create or update files
- readFile: Analyze existing code  
- searchFiles: Find relevant files
- runShell: Execute build/test commands

Guidelines:
- Write production-ready code with proper error handling
- Include meaningful comments and documentation
- Follow best practices for the target language
- Consider security and performance implications
- Use appropriate design patterns`;

            case 'tester':
                return `${basePrompt}

You are a test automation expert. Your task is to create comprehensive test suites.

Available Tools:
- writeFile: Create test files
- readFile: Analyze code to test
- runShell: Execute tests and generate reports

Guidelines:
- Write thorough unit and integration tests
- Include edge cases and error scenarios
- Use appropriate testing frameworks
- Ensure good test coverage
- Write clear test descriptions`;

            case 'requirements':
                return `${basePrompt}

You are a business analyst and requirements engineer. Your task is to analyze and document requirements.

Available Tools:
- readFile: Analyze existing code and documentation
- searchFiles: Find related requirements or specs
- writeFile: Create requirement documents

Guidelines:
- Provide clear, actionable requirements
- Identify potential risks and dependencies
- Consider user experience and business value
- Break down complex requirements into manageable tasks
- Include acceptance criteria`;

            default:
                return `${basePrompt}

Context Information:
- Current file: ${context.file || 'Not specified'}
- Language: ${context.language || 'Not specified'}
- Has selection: ${context.selection ? 'Yes' : 'No'}

Please provide helpful, accurate, and actionable responses based on the user's request.`;
        }
    }

    private buildEnhancedPrompt(step: PresetStep, prompt: string, context: any): string {
        let enhancedPrompt = `User Request: ${prompt}

Context Information:`;

        if (context.file) {
            enhancedPrompt += `\n- Current File: ${context.file}`;
        }
        if (context.language) {
            enhancedPrompt += `\n- Programming Language: ${context.language}`;
        }
        if (context.selection) {
            enhancedPrompt += `\n- Selected Code:\n\`\`\`${context.language || ''}\n${context.selection}\n\`\`\``;
        }
        if (context.gitDiff) {
            enhancedPrompt += `\n- Git Changes:\n\`\`\`diff\n${context.gitDiff}\n\`\`\``;
        }

        enhancedPrompt += `\n\nStep Context:
- Step Name: ${step.name}
- Agent Type: ${step.agent}
- Step Prompt: ${step.prompt}

Available Tools: ${this.toolManager.listToolNames().join(', ')}

Please provide a detailed, actionable response that addresses the user's request.`;

        return enhancedPrompt;
    }

    private generateEnhancedMockResponse(step: PresetStep, prompt: string, context: any): string {
        const modelInfo = this.aiManager.getModelInfo();
        const toolNames = this.toolManager.listToolNames().join(', ');
        
        const mockHeader = `⚡ **Enhanced Mock Response** (AI Model: ${modelInfo.configured ? 'Configured but failed' : 'Not configured'})
🔧 **Available Tools**: ${toolNames}

`;

        switch (step.agent) {
            case 'coder':
                const fileName = context.file ? path.basename(context.file) : 'generated.js';
                const language = context.language || 'javascript';
                
                return mockHeader + `\`\`\`${language}
// AI Generated Code for ${fileName}
// Based on: ${prompt.substring(0, 80)}...

${this.generateMockCodeByLanguage(language, context)}
\`\`\`

**Next Steps:**
1. Review and customize the generated code
2. Use \`writeFile\` tool to save to project
3. Use \`runShell\` tool to test the implementation
4. Configure AI model (OPENAI_API_KEY) for intelligent code generation

**Tool Recommendations:**
- \`writeFile("${fileName}", code)\` - Save the generated code
- \`runShell("npm test")\` - Run tests after implementation`;

            case 'tester':
                return mockHeader + `\`\`\`javascript
// AI Generated Test Suite
// Based on: ${prompt.substring(0, 80)}...

describe('${context.file ? path.basename(context.file, path.extname(context.file)) : 'Component'} Tests', () => {
    beforeEach(() => {
        // Setup test environment
    });

    test('should handle valid input', () => {
        // Test implementation here
        expect(true).toBe(true);
    });

    test('should handle edge cases', () => {
        // Edge case testing
        expect(() => {
            // Error case
        }).toThrow();
    });

    test('should integrate with dependencies', async () => {
        // Integration testing
        const result = await processFunction();
        expect(result).toBeDefined();
    });
});
\`\`\`

**Testing Strategy:**
1. Unit tests for core functionality
2. Integration tests for external dependencies  
3. Edge case and error handling tests
4. Performance tests if applicable

**Tool Usage:**
- \`writeFile("test.spec.js", testCode)\` - Save test suite
- \`runShell("npm test")\` - Execute tests`;

            case 'requirements':
                return mockHeader + `# Requirements Analysis Report

## User Request Analysis
**Original Request:** ${prompt}

## Context Assessment
- **File Context:** ${context.file || 'Not specified'}
- **Language:** ${context.language || 'Multiple/Unknown'}
- **Code Selection:** ${context.selection ? 'Yes - specific code block' : 'No - general request'}

## Functional Requirements
1. **Core Functionality**
   - Primary feature implementation
   - User interaction handling
   - Data processing requirements

2. **Technical Requirements**
   - Technology stack compatibility
   - Performance expectations
   - Security considerations

3. **Integration Requirements**
   - External service dependencies
   - Database interactions
   - API integrations

## Implementation Roadmap
### Phase 1: Foundation
- Set up project structure
- Implement core interfaces
- Basic functionality

### Phase 2: Enhancement
- Advanced features
- Error handling
- Optimization

### Phase 3: Integration
- Testing suite
- Documentation
- Deployment preparation

## Risk Assessment
- **Technical Risks:** Framework compatibility, performance
- **Business Risks:** User adoption, maintenance overhead
- **Mitigation:** Proper testing, documentation, monitoring

## Recommended Tools
- \`readFile\` - Analyze existing codebase
- \`searchFiles\` - Find related components
- \`writeFile\` - Document specifications
- \`runShell\` - Validate technical feasibility

**Note:** Configure AI model for intelligent, context-aware analysis.`;

            default:
                return mockHeader + `**Response for "${step.agent}" agent:**

Based on your request: "${prompt}"

This is an enhanced mock response with tool integration capabilities.

**Context Analysis:**
${Object.entries(context).map(([key, value]) => 
    `- ${key}: ${typeof value === 'string' ? value.substring(0, 100) : JSON.stringify(value)}`
).join('\n')}

**Available Actions:**
- Use \`writeFile\` to create or update files
- Use \`readFile\` to analyze existing code
- Use \`searchFiles\` to find relevant files  
- Use \`runShell\` to execute commands

**To Enable AI Intelligence:**
1. Set OPENAI_API_KEY environment variable
2. Install OpenAI package: \`npm install openai\`
3. Restart MCP server

Current tool statistics: ${JSON.stringify(this.toolManager.getExecutionSummary())}`;
        }
    }

    private generateMockCodeByLanguage(language: string, context: any): string {
        switch (language.toLowerCase()) {
            case 'typescript':
            case 'ts':
                return `interface GeneratedInterface {
    id: string;
    data: any;
    process(): Promise<boolean>;
}

export class AIGeneratedClass implements GeneratedInterface {
    constructor(public id: string, public data: any) {}
    
    async process(): Promise<boolean> {
        try {
            console.log('Processing with AI Agent Hub');
            // TODO: Implement actual business logic
            return true;
        } catch (error) {
            console.error('Processing failed:', error);
            return false;
        }
    }
}

export default AIGeneratedClass;`;

            case 'python':
            case 'py':
                return `class AIGeneratedClass:
    def __init__(self, id: str, data: any):
        self.id = id
        self.data = data
    
    async def process(self) -> bool:
        """Process the data and return success status"""
        try:
            print(f"Processing {self.id} with AI Agent Hub")
            # TODO: Implement actual business logic
            return True
        except Exception as e:
            print(f"Processing failed: {e}")
            return False

if __name__ == "__main__":
    processor = AIGeneratedClass("test", {"key": "value"})
    result = processor.process()
    print(f"Result: {result}")`;

            default: // JavaScript
                return `function aiGeneratedFunction(data) {
    console.log('Generated by AI Agent Hub');
    console.log('Context:', data);
    
    try {
        // TODO: Implement actual business logic
        return { 
            success: true, 
            processed: true,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Processing failed:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

module.exports = { aiGeneratedFunction };`;
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