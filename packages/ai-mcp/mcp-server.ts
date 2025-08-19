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

    constructor() {
        this.server = new Server(
            {
                name: 'ai-agent-hub',
                version: '0.0.4',
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
            const tools: Tool[] = [
                {
                    name: 'run_workflow',
                    description: 'Execute an AI workflow preset',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            preset: {
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
                                    gitDiff: { type: 'string', description: 'Git diff' }
                                }
                            }
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
                }
            ];
            return { tools };
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

            switch (name) {
                case 'run_workflow':
                    if (!args) throw new Error('Missing arguments');
                    return await this.runWorkflow(args.preset as string, args.context || {});
                
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

                default:
                    throw new Error(`Unknown tool: ${name}`);
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
        // Mock implementation - in real scenario, this would call AI models
        switch (step.agent) {
            case 'coder':
                return `// Generated code for ${context.file || 'unknown file'}\nfunction generatedFunction() {\n    console.log('Generated by AI Agent Hub');\n}`;
            case 'tester':
                return `// Generated tests\ndescribe('Tests', () => {\n    test('should work', () => {\n        expect(true).toBe(true);\n    });\n});`;
            case 'requirements':
                return `Requirements Analysis:\n1. Input validation needed\n2. Error handling required\n3. Performance optimization\n4. Comprehensive testing`;
            default:
                return `Mock response for ${step.agent}`;
        }
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