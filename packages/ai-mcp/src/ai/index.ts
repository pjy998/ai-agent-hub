/**
 * AI模型服务 - 支持多种AI提供商的统一接口
 */

import { ConfigManager } from '../utils';

/**
 * AI模型提供商枚举
 */
export enum AIProvider {
    OPENAI = 'openai',
    ANTHROPIC = 'anthropic',
    AZURE_OPENAI = 'azure_openai',
    VSCODE_LM = 'vscode_lm',
    LOCAL = 'local'
}

/**
 * AI模型配置接口
 */
export interface AIModelConfig {
    provider: AIProvider;
    model: string;
    apiKey?: string;
    baseUrl?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
}

/**
 * AI请求接口
 */
export interface AIRequest {
    prompt: string;
    context?: string;
    systemMessage?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}

/**
 * AI响应接口
 */
export interface AIResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    provider: AIProvider;
    timestamp?: string;
    requestId?: string;
    finishReason?: string;
}

/**
 * AI服务基类
 */
export abstract class BaseAIService {
    protected config: AIModelConfig;
    protected configManager: ConfigManager;

    constructor(config: AIModelConfig, configManager: ConfigManager) {
        this.config = config;
        this.configManager = configManager;
    }

    abstract generateResponse(request: AIRequest): Promise<AIResponse>;
    abstract validateConfig(): boolean;
    abstract getAvailableModels(): string[];

    protected generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    protected createResponse(
        content: string,
        requestId: string,
        usage?: AIResponse['usage']
    ): AIResponse {
        return {
            content,
            usage,
            model: this.config.model,
            provider: this.config.provider,
            timestamp: new Date().toISOString(),
            requestId
        };
    }
}

/**
 * OpenAI服务实现
 */
export class OpenAIService extends BaseAIService {
    private apiKey: string;
    private baseUrl: string;

    constructor(config: AIModelConfig, configManager: ConfigManager) {
        super(config, configManager);
        this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
        this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    }

    validateConfig(): boolean {
        return !!this.apiKey && !!this.config.model;
    }

    getAvailableModels(): string[] {
        return [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'gpt-4',
            'gpt-3.5-turbo'
        ];
    }

    async generateResponse(request: AIRequest): Promise<AIResponse> {
        if (!this.validateConfig()) {
            throw new Error('OpenAI configuration is invalid');
        }

        const requestId = this.generateRequestId();
        
        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: [
                        ...(request.systemMessage ? [{ role: 'system', content: request.systemMessage }] : []),
                        ...(request.context ? [{ role: 'user', content: `Context: ${request.context}` }] : []),
                        { role: 'user', content: request.prompt }
                    ],
                    temperature: request.temperature ?? this.config.temperature ?? 0.7,
                    max_tokens: request.maxTokens ?? this.config.maxTokens ?? 2000,
                    stream: request.stream ?? false
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenAI API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const content = (data as any).choices?.[0]?.message?.content || '';
            const usage = (data as any).usage ? {
                promptTokens: (data as any).usage.prompt_tokens,
                completionTokens: (data as any).usage.completion_tokens,
                totalTokens: (data as any).usage.total_tokens
            } : undefined;

            const result = this.createResponse(content, requestId, usage);
            result.finishReason = (data as any).choices?.[0]?.finish_reason || 'stop';
            return result;

        } catch (error) {
            throw new Error(`OpenAI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

/**
 * Anthropic服务实现
 */
export class AnthropicService extends BaseAIService {
    private apiKey: string;
    private baseUrl: string;

    constructor(config: AIModelConfig, configManager: ConfigManager) {
        super(config, configManager);
        this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
        this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    }

    validateConfig(): boolean {
        return !!this.apiKey && !!this.config.model;
    }

    getAvailableModels(): string[] {
        return [
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307'
        ];
    }

    async generateResponse(request: AIRequest): Promise<AIResponse> {
        if (!this.validateConfig()) {
            throw new Error('Anthropic configuration is invalid');
        }

        const requestId = this.generateRequestId();
        
        try {
            const messages = [];
            if (request.context) {
                messages.push({ role: 'user', content: `Context: ${request.context}` });
            }
            messages.push({ role: 'user', content: request.prompt });

            const response = await fetch(`${this.baseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: messages,
                    system: request.systemMessage,
                    temperature: request.temperature ?? this.config.temperature ?? 0.7,
                    max_tokens: request.maxTokens ?? this.config.maxTokens ?? 2000
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Anthropic API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const content = (data as any).content[0]?.text || '';
            const usage = (data as any).usage ? {
                promptTokens: (data as any).usage.input_tokens,
                completionTokens: (data as any).usage.output_tokens,
                totalTokens: (data as any).usage.input_tokens + (data as any).usage.output_tokens
            } : undefined;

            const result = this.createResponse(content, requestId, usage);
            result.finishReason = (data as any).stop_reason || 'stop';
            return result;

        } catch (error) {
            throw new Error(`Anthropic request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

/**
 * VS Code Language Model服务实现
 */
export class VSCodeLMService extends BaseAIService {
    constructor(config: AIModelConfig, configManager: ConfigManager) {
        super(config, configManager);
    }

    validateConfig(): boolean {
        // VS Code LM不需要API密钥
        return !!this.config.model;
    }

    getAvailableModels(): string[] {
        return [
            'copilot-gpt-4o',
            'copilot-gpt-3.5-turbo'
        ];
    }

    async generateResponse(request: AIRequest): Promise<AIResponse> {
        const requestId = this.generateRequestId();
        
        try {
            // 这里需要VS Code扩展环境才能使用
            // 在MCP服务器中，我们返回一个提示信息
            const content = `[VS Code LM Service] This service requires VS Code extension environment.\n\nRequest: ${request.prompt}\n\nTo use VS Code Language Models, please run this through the VS Code extension.`;
            
            return this.createResponse(content, requestId);

        } catch (error) {
            throw new Error(`VS Code LM request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

/**
 * 模拟AI服务（用于测试和开发）
 */
export class MockAIService extends BaseAIService {
    constructor(config: AIModelConfig, configManager: ConfigManager) {
        super(config, configManager);
    }

    validateConfig(): boolean {
        return true; // 模拟服务总是有效
    }

    getAvailableModels(): string[] {
        return ['mock-gpt-4', 'mock-claude-3'];
    }

    async generateResponse(request: AIRequest): Promise<AIResponse> {
        const requestId = this.generateRequestId();
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        // 根据请求类型生成不同的模拟响应
        let content = '';
        
        if (request.prompt.toLowerCase().includes('code') || request.prompt.toLowerCase().includes('编程')) {
            content = this.generateMockCode(request.prompt);
        } else if (request.prompt.toLowerCase().includes('test') || request.prompt.toLowerCase().includes('测试')) {
            content = this.generateMockTest(request.prompt);
        } else if (request.prompt.toLowerCase().includes('analysis') || request.prompt.toLowerCase().includes('分析')) {
            content = this.generateMockAnalysis(request.prompt);
        } else {
            content = this.generateMockGeneral(request.prompt);
        }
        
        const usage = {
            promptTokens: Math.floor(request.prompt.length / 4),
            completionTokens: Math.floor(content.length / 4),
            totalTokens: Math.floor((request.prompt.length + content.length) / 4)
        };
        
        return this.createResponse(content, requestId, usage);
    }

    private generateMockCode(prompt: string): string {
        return `// Generated code based on prompt: ${prompt.substring(0, 50)}...
function exampleFunction() {
    // TODO: Implement functionality
    // This is mock generated code
    return 'success';
}

export { exampleFunction };`;
    }

    private generateMockTest(prompt: string): string {
        return `// Generated tests based on prompt: ${prompt.substring(0, 50)}...
import { exampleFunction } from './example';

describe('Example Function Tests', () => {
    test('should return success', () => {
        const result = exampleFunction();
        expect(result).toBe('success');
    });
    
    test('should log message', () => {
        const consoleSpy = jest.spyOn(console, 'log');
        exampleFunction();
        expect(consoleSpy).toHaveBeenCalledWith('This is mock generated code');
    });
});`;
    }

    private generateMockAnalysis(prompt: string): string {
        return `# Requirements Analysis

Based on the prompt: "${prompt.substring(0, 100)}..."

## Key Requirements:
1. Implement core functionality
2. Add proper error handling
3. Include comprehensive testing
4. Follow best practices

## Technical Considerations:
- Use TypeScript for type safety
- Implement proper logging
- Add input validation
- Consider performance implications

## Recommendations:
- Start with a minimal viable implementation
- Add features incrementally
- Maintain good documentation
- Regular testing and validation`;
    }

    private generateMockGeneral(prompt: string): string {
        return `基于您的提示 "${prompt}"，我理解您需要相关的帮助和建议。\n\n这是一个模拟的AI响应，用于演示系统功能。在实际使用中，这里会调用真实的AI模型来生成更准确和有用的回答。\n\n建议的后续步骤:\n1. 明确具体需求\n2. 收集相关资源\n3. 制定实施计划\n4. 开始执行并监控进度\n\n如果您需要更具体的帮助，请提供更详细的信息。`;
    }
}

/**
 * AI服务工厂
 */
export class AIServiceFactory {
    static createService(
        provider: AIProvider,
        config: AIModelConfig,
        configManager: ConfigManager
    ): BaseAIService {
        switch (provider) {
            case AIProvider.OPENAI:
                return new OpenAIService(config, configManager);
            case AIProvider.ANTHROPIC:
                return new AnthropicService(config, configManager);
            case AIProvider.VSCODE_LM:
                return new VSCodeLMService(config, configManager);
            case AIProvider.LOCAL:
            default:
                return new MockAIService(config, configManager);
        }
    }

    static getDefaultConfig(provider: AIProvider): Partial<AIModelConfig> {
        switch (provider) {
            case AIProvider.OPENAI:
                return {
                    model: 'gpt-4o-mini',
                    temperature: 0.7,
                    maxTokens: 2000
                };
            case AIProvider.ANTHROPIC:
                return {
                    model: 'claude-3-5-haiku-20241022',
                    temperature: 0.7,
                    maxTokens: 2000
                };
            case AIProvider.VSCODE_LM:
                return {
                    model: 'copilot-gpt-4o',
                    temperature: 0.7,
                    maxTokens: 2000
                };
            default:
                return {
                    model: 'mock-gpt-4',
                    temperature: 0.7,
                    maxTokens: 2000
                };
        }
    }
}