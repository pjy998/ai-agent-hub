/**
 * AI模型集成配置
 * 
 * 支持多种AI模型提供商
 */

export interface ModelConfig {
    provider: 'openai' | 'claude' | 'groq' | 'local';
    apiKey?: string;
    baseURL?: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
}

export interface AIResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model?: string;
    timestamp: string;
}

export class AIModelManager {
    private config: ModelConfig;

    constructor(config: ModelConfig) {
        this.config = config;
    }

    async callModel(prompt: string, systemPrompt?: string): Promise<AIResponse> {
        switch (this.config.provider) {
            case 'openai':
                return this.callOpenAI(prompt, systemPrompt);
            case 'claude':
                return this.callClaude(prompt, systemPrompt);
            case 'groq':
                return this.callGroq(prompt, systemPrompt);
            default:
                return this.fallbackResponse(prompt);
        }
    }

    private async callOpenAI(prompt: string, systemPrompt?: string): Promise<AIResponse> {
        try {
            // 动态导入openai，避免必须安装的依赖
            // @ts-ignore - OpenAI package is optional
            const OpenAI = await import('openai').then(m => m.default || m);
            
            const openai = new OpenAI({
                apiKey: this.config.apiKey || process.env.OPENAI_API_KEY,
                baseURL: this.config.baseURL
            });

            const messages: any[] = [];
            if (systemPrompt) {
                messages.push({ role: 'system', content: systemPrompt });
            }
            messages.push({ role: 'user', content: prompt });

            const response = await openai.chat.completions.create({
                model: this.config.model || 'gpt-3.5-turbo',
                messages,
                max_tokens: this.config.maxTokens || 2000,
                temperature: this.config.temperature || 0.7,
            });

            const choice = response.choices[0];
            if (!choice?.message?.content) {
                throw new Error('No content in OpenAI response');
            }

            return {
                content: choice.message.content,
                usage: {
                    promptTokens: response.usage?.prompt_tokens || 0,
                    completionTokens: response.usage?.completion_tokens || 0,
                    totalTokens: response.usage?.total_tokens || 0
                },
                model: response.model,
                timestamp: new Date().toISOString()
            };

        } catch (error: any) {
            if (error.code === 'MODULE_NOT_FOUND') {
                console.warn('OpenAI package not installed, falling back to mock response');
                return this.fallbackResponse(prompt);
            }
            throw new Error(`OpenAI API call failed: ${error.message}`);
        }
    }

    private async callClaude(prompt: string, systemPrompt?: string): Promise<AIResponse> {
        try {
            // 这里可以集成Claude API
            // 目前返回fallback
            console.warn('Claude integration not implemented yet');
            return this.fallbackResponse(prompt);
        } catch (error: any) {
            throw new Error(`Claude API call failed: ${error.message}`);
        }
    }

    private async callGroq(prompt: string, systemPrompt?: string): Promise<AIResponse> {
        try {
            // 这里可以集成Groq API
            console.warn('Groq integration not implemented yet');
            return this.fallbackResponse(prompt);
        } catch (error: any) {
            throw new Error(`Groq API call failed: ${error.message}`);
        }
    }

    private fallbackResponse(prompt: string): AIResponse {
        return {
            content: this.generateIntelligentMockResponse(prompt),
            usage: {
                promptTokens: Math.floor(prompt.length / 4),
                completionTokens: 200,
                totalTokens: Math.floor(prompt.length / 4) + 200
            },
            model: 'mock-model',
            timestamp: new Date().toISOString()
        };
    }

    private generateIntelligentMockResponse(prompt: string): string {
        const lowerPrompt = prompt.toLowerCase();
        
        if (lowerPrompt.includes('code') || lowerPrompt.includes('implement') || lowerPrompt.includes('function')) {
            return `// AI Generated Code Response
// This is a mock implementation. To get real AI responses, please configure an API key.

function generatedFunction(input) {
    // Based on your prompt: ${prompt.substring(0, 100)}...
    console.log('Processing:', input);
    
    return {
        success: true,
        message: 'Mock implementation - configure AI model for real responses',
        data: input
    };
}

// To enable real AI responses:
// 1. Set OPENAI_API_KEY environment variable
// 2. Or configure model in mcp-server.ts
// 3. Install openai package: npm install openai

module.exports = { generatedFunction };`;
        }
        
        if (lowerPrompt.includes('test') || lowerPrompt.includes('spec') || lowerPrompt.includes('unit')) {
            return `// AI Generated Test Suite
// This is a mock test. Configure AI model for real test generation.

describe('Generated Test Suite', () => {
    // Based on prompt: ${prompt.substring(0, 100)}...
    
    test('should handle basic functionality', () => {
        expect(true).toBe(true);
    });
    
    test('should process input correctly', async () => {
        const result = await processFunction('test input');
        expect(result.success).toBe(true);
    });
    
    // TODO: Configure AI model (OpenAI/Claude/Groq) for intelligent test generation
});`;
        }
        
        if (lowerPrompt.includes('analysis') || lowerPrompt.includes('requirement') || lowerPrompt.includes('spec')) {
            return `# AI Requirements Analysis
*Mock analysis - configure AI model for intelligent analysis*

## User Request
${prompt}

## Analysis Summary
This is a mock analysis response. To get intelligent requirements analysis:

1. **Set up AI Model**: Configure OpenAI, Claude, or Groq API key
2. **Update Configuration**: Modify model settings in mcp-server.ts
3. **Install Dependencies**: \`npm install openai\` for OpenAI support

## Mock Recommendations
- Review existing codebase structure
- Identify key components and interfaces
- Plan implementation strategy
- Consider error handling and edge cases
- Design appropriate test coverage

## Available Tools
- \`writeFile\`: Create implementation files
- \`readFile\`: Analyze existing code
- \`searchFiles\`: Find related components
- \`runShell\`: Execute build/test commands

*Configure AI model integration for intelligent, context-aware analysis.*`;
        }
        
        return `AI Response (Mock Mode)

Based on your request: ${prompt}

This is a mock response. To enable intelligent AI responses:

1. **Configure API Key**:
   - Set OPENAI_API_KEY environment variable
   - Or update model configuration in mcp-server.ts

2. **Install AI Provider Package**:
   - For OpenAI: \`npm install openai\`
   - For other providers: install respective packages

3. **Update Model Settings**:
   - Choose your preferred model (GPT-4, GPT-3.5-turbo, etc.)
   - Adjust temperature and max_tokens as needed

Once configured, you'll get intelligent, context-aware responses tailored to your specific needs.

Current mock capabilities:
- Code generation (basic templates)
- Test generation (standard patterns)  
- Requirements analysis (generic suggestions)
- Tool recommendations

For production use, please configure a real AI model.`;
    }

    /**
     * 获取模型配置信息
     */
    getModelInfo(): { provider: string; model: string; configured: boolean } {
        const hasApiKey = !!(this.config.apiKey || process.env.OPENAI_API_KEY || process.env.CLAUDE_API_KEY);
        
        return {
            provider: this.config.provider,
            model: this.config.model,
            configured: hasApiKey
        };
    }
}

/**
 * 创建默认的AI模型管理器
 */
export function createDefaultAIManager(): AIModelManager {
    // 尝试从环境变量检测配置
    let provider: ModelConfig['provider'] = 'openai';
    let model = 'gpt-3.5-turbo';
    
    if (process.env.CLAUDE_API_KEY) {
        provider = 'claude';
        model = 'claude-3-sonnet-20240229';
    } else if (process.env.GROQ_API_KEY) {
        provider = 'groq';
        model = 'llama2-70b-4096';
    }

    return new AIModelManager({
        provider,
        model,
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000
    });
}
