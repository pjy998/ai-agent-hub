#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema,
  CallToolRequest 
} from '@modelcontextprotocol/sdk/types.js';
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { createToolManager } from './tools/index';
import { AIServiceManager } from './ai/manager';
import { AIRequest } from './ai/types';
import { ConfigManager, Logger, LogLevel, logger } from './utils';
import { z } from 'zod';

// 版本信息显示函数
function showVersionInfo(): string {
    try {
        // 读取根目录的package.json获取版本信息
        const currentDir = process.cwd();
        const packageJsonPath = path.join(currentDir, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const version = packageJson.version || 'unknown';
            const name = packageJson.name || 'ai-agent-hub';
            
            const versionInfo = `🤖 AI Agent Hub MCP Server - ${name} v${version}`;
            const logger = new Logger(LogLevel.INFO);
            logger.info('='.repeat(60));
            logger.info(versionInfo);
            logger.info(`📅 Started at: ${new Date().toISOString()}`);
            logger.info(`📁 Working directory: ${currentDir}`);
            logger.info('='.repeat(60));
            
            return versionInfo;
        } else {
            // 如果根目录没有package.json，尝试读取当前包的package.json
            const localPackageJsonPath = path.join(__dirname, '..', 'package.json');
            if (fs.existsSync(localPackageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(localPackageJsonPath, 'utf8'));
                const version = packageJson.version || 'unknown';
                const name = packageJson.name || 'ai-agent-hub-mcp';
                
                const versionInfo = `🤖 AI Agent Hub MCP Server - ${name} v${version}`;
                const logger = new Logger(LogLevel.INFO);
                logger.info('='.repeat(60));
                logger.info(versionInfo);
                logger.info(`📅 Started at: ${new Date().toISOString()}`);
                logger.info('='.repeat(60));
                
                return versionInfo;
            }
        }
    } catch (error) {
        console.error('Failed to read version info:', error);
    }
    
    const fallbackInfo = '🤖 AI Agent Hub MCP Server - version unknown';
    const logger = new Logger(LogLevel.INFO);
    logger.info('='.repeat(60));
    logger.info(fallbackInfo);
    logger.info('='.repeat(60));
    return fallbackInfo;
}

// 预设接口
interface PresetStep {
    name: string;
    type: string;
    prompt: string;
    output?: string;
}

interface Preset {
    name: string;
    description: string;
    steps: PresetStep[];
}

// MCP服务器类
class MCPServer {
    private server: Server;
    private presets: Map<string, Preset> = new Map();
    private presetsDir: string;
    private toolManager: any;
    private aiManager: AIServiceManager;
    private configManager: ConfigManager;
    private logger: Logger;

    constructor() {
        this.presetsDir = path.join(process.cwd() || process.env.WORKSPACE_ROOT || '.', 'agents/presets', 'presets');
        
        // 初始化配置和日志
        this.configManager = new ConfigManager();
        this.logger = new Logger(LogLevel.INFO);
        
        this.ensurePresetsDir();
        this.loadPresets();
        this.toolManager = createToolManager(process.cwd());
        this.aiManager = new AIServiceManager(this.configManager, this.logger);
        
        this.server = new Server(
            {
                name: 'ai-agent-mcp',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                },
            }
        );
        
        this.setupHandlers();
    }

    private ensurePresetsDir(): void {
        if (!fs.existsSync(this.presetsDir)) {
            fs.mkdirSync(this.presetsDir, { recursive: true });
        }
    }

    private loadPresets(): void {
        const presetsPath = path.join(this.presetsDir, '../../../agents/presets');
        if (!fs.existsSync(presetsPath)) {
            console.error(`Presets directory not found: ${presetsPath}`);
            return;
        }

        const presetFiles = fs.readdirSync(presetsPath).filter(file => file.endsWith('.yaml'));

        for (const file of presetFiles) {
            try {
                const content = fs.readFileSync(path.join(presetsPath, file), 'utf8');
                const preset = yaml.parse(content) as Preset;
                this.presets.set(preset.name, preset);
                logger.info(`📋 Loaded preset: ${preset.name}`);
            } catch (error) {
                logger.error(`Failed to load preset ${file}: ${error}`);
            }
        }
    }

    private setupHandlers(): void {
         // 设置工具处理器
         this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'execute_workflow',
                        description: 'Execute a predefined workflow preset',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                preset: { type: 'string', description: 'Name of the preset to execute' },
                                context: { type: 'object', description: 'Context variables for the workflow' }
                            },
                            required: ['preset']
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
                        name: 'ai_generate',
                        description: 'Generate AI response using configured AI services',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                prompt: { type: 'string', description: 'The prompt to send to AI' },
                                systemMessage: { type: 'string', description: 'System message for AI' },
                                temperature: { type: 'number', description: 'Temperature for AI generation' },
                                maxTokens: { type: 'number', description: 'Maximum tokens for response' },
                                provider: { type: 'string', description: 'AI provider to use' }
                            },
                            required: ['prompt']
                        }
                    },
                    {
                        name: 'ai_status',
                        description: 'Get AI services status',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    }
                ]
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
             const { name, arguments: args } = request.params;

            switch (name) {
                case 'execute_workflow':
                    try {
                        const { preset, context } = args as any;
                        const result = await this.executeWorkflow(preset, context || {});
                        return {
                            content: [{
                                type: 'text',
                                text: JSON.stringify(result, null, 2)
                            }]
                        };
                    } catch (error) {
                        throw new Error(`Workflow execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }

                case 'list_presets':
                    const presetList = Array.from(this.presets.values()).map(p => ({
                        name: p.name,
                        description: p.description,
                        steps: p.steps
                    }));
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(presetList, null, 2)
                        }]
                    };

                case 'ai_generate':
                    try {
                        const { prompt, systemMessage, temperature, maxTokens, provider } = args as any;
                        
                        if (!prompt) {
                            throw new Error('Prompt is required');
                        }

                        const request = {
                            prompt,
                            systemMessage,
                            temperature,
                            maxTokens
                        };

                        const response = await this.aiManager.generateResponse(request, provider);
                        return {
                            content: [{
                                type: 'text',
                                text: JSON.stringify(response, null, 2)
                            }]
                        };
                    } catch (error) {
                        this.logger.error('AI generation failed:', error);
                        throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }

                case 'ai_status':
                    try {
                        const managerStatus = this.aiManager.getManagerStatus();
                        const servicesInfo = this.aiManager.getAllServicesInfo();
                        const status = {
                            manager: managerStatus,
                            services: servicesInfo,
                            timestamp: new Date().toISOString()
                        };
                        return {
                            content: [{
                                type: 'text',
                                text: JSON.stringify(status, null, 2)
                            }]
                        };
                    } catch (error) {
                        throw new Error('Failed to get AI service status');
                    }

                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        });
    }

    private async executeWorkflow(presetName: string, context: any): Promise<any> {
        const preset = this.presets.get(presetName);
        if (!preset) {
            throw new Error(`Preset not found: ${presetName}`);
        }

        console.error(`🔄 Executing workflow: ${presetName}`);
        const steps: any[] = [];
        const outputs: any = {};

        for (const step of preset.steps) {
            const prompt = this.interpolatePrompt(step.prompt, context);
            const response = await this.executeStep(step, prompt, context);

            steps.push({
                name: step.name,
                type: step.type,
                prompt,
                response,
                timestamp: new Date().toISOString()
            });

            if (step.output) {
                outputs[step.output] = response;
            }
        }

        // 保存执行历史
        const historyPath = path.join(this.presetsDir, `${presetName}_${Date.now()}.json`);
        fs.writeFileSync(historyPath, JSON.stringify(steps, null, 2));

        return { ...outputs, steps };
    }

    private interpolatePrompt(template: string, context: any): string {
        let result = template;

        // 替换上下文变量 {{variable}}
        Object.keys(context).forEach(key => {
            const placeholder = `{{${key}}}`;
            if (result.includes(placeholder)) {
                result = result.replace(new RegExp(placeholder, 'g'), context[key] || '');
            }
        });

        return result;
    }

    private async executeStep(step: PresetStep, prompt: string, context: any): Promise<string> {
        console.error(`🔧 Executing step: ${step.name} (type: ${step.type})`);

        try {
            const aiRequest: AIRequest = {
                prompt: prompt,
                systemMessage: this.getSystemMessage(step.type),
                temperature: this.getTemperature(step.type),
                maxTokens: 2000
            };

            const response = await this.aiManager.generateResponse(aiRequest);
            return response.content;
        } catch (error) {
            console.error(`AI service failed for step ${step.name}:`, error);
            // 回退到模拟响应
            return this.getFallbackResponse(step.type, prompt, context);
        }
    }

    private getSystemMessage(stepType: string): string {
        switch (stepType) {
            case 'coding':
                return 'You are an expert software developer. Generate clean, well-documented, and production-ready code.';
            case 'testing':
                return 'You are an expert in software testing. Generate comprehensive, well-structured test cases.';
            case 'requirements':
                return 'You are a senior business analyst and technical architect. Provide detailed, actionable requirements analysis.';
            default:
                return 'You are a helpful AI assistant. Provide accurate and useful responses.';
        }
    }

    private getTemperature(stepType: string): number {
        switch (stepType) {
            case 'coding':
                return 0.3;
            case 'testing':
                return 0.2;
            case 'requirements':
                return 0.4;
            default:
                return 0.5;
        }
    }

    private getFallbackResponse(stepType: string, prompt: string, context: any): string {
        switch (stepType) {
            case 'coding':
                return `// Generated code for: ${context.file || 'unknown file'}\n// Based on prompt: ${prompt.substring(0, 50)}...\n\nfunction generatedFunction() {\n    // TODO: Implement actual functionality\n    // This is fallback generated code\n}`;
            case 'testing':
                return `// Generated tests for: ${context.file || 'unknown file'}\n// Based on prompt: ${prompt.substring(0, 50)}...\n\ndescribe('Generated Test Suite', () => {\n    it('should pass fallback test', () => {\n        expect(true).toBe(true);\n    });\n});`;
            case 'requirements':
                return `## Requirements Analysis\n\n**Context**: ${context.file || 'Unknown'}\n**Prompt**: ${prompt.substring(0, 100)}...\n\n### Analysis Results\n- This is a fallback analysis\n- AI service temporarily unavailable\n- Please try again later`;
            default:
                return `Fallback response for ${stepType}: ${prompt.substring(0, 100)}...`;
        }
    }

    public async start(): Promise<void> {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        
        this.logger.info('🚀 MCP Server started with stdio transport');
        this.logger.info(`📊 Loaded ${this.presets.size} presets`);
        
        // 显示可用工具信息
        const toolNames = this.toolManager.getToolNames();
        this.logger.info(`🔧 Available tools: ${toolNames.length}`);
        this.logger.info('   Tools: ' + toolNames.join(', '));
        
        // 显示AI服务信息
        const servicesInfo = this.aiManager.getAllServicesInfo();
        this.logger.info(`🤖 AI services: ${servicesInfo.length}`);
        this.logger.info('   Services: ' + servicesInfo.map(info => `${info.provider}(${info.status})`).join(', '));
        
        this.logger.info('\n📖 Usage:');
        this.logger.info('   • Configure in VS Code: .vscode/settings.json');
        this.logger.info('   • Available commands: start, status, version');
        this.logger.info('   • Documentation: VS_CODE_USAGE.md');
        this.logger.info('='.repeat(60));
    }
}

// CLI程序设置
const program = new Command();

program
    .name('ai-agent-mcp')
    .description('AI Agent Hub MCP Server')
    .version('0.0.5');

program
    .command('start')
    .description('Start the MCP server')
    .action(() => {
        showVersionInfo();
        
        const app = new MCPServer();
        app.start();
    });

program
    .command('status')
    .description('Check server status')
    .action(async () => {
        console.error('MCP Server status check not available in stdio mode');
        console.error('Server runs via stdio transport when started');
    });

program
    .command('version')
    .description('Show version information')
    .action(() => {
        showVersionInfo();
    });

if (require.main === module) {
    program.parse();
}

export { Server, showVersionInfo };