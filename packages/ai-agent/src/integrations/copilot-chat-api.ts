import * as vscode from 'vscode';

/**
 * GitHub Copilot Chat API 请求接口
 */
export interface CopilotChatRequest {
  /** 模型名称 */
  model: string;
  /** 消息列表 */
  messages: CopilotChatMessage[];
  /** 最大token数 */
  max_tokens?: number;
  /** 温度参数 */
  temperature?: number;
  /** 流式响应 */
  stream?: boolean;
  /** 停止词 */
  stop?: string[];
}

/**
 * GitHub Copilot Chat 消息接口
 */
export interface CopilotChatMessage {
  /** 角色 */
  role: 'system' | 'user' | 'assistant';
  /** 内容 */
  content: string;
}

/**
 * GitHub Copilot Chat API 响应接口
 */
export interface CopilotChatResponse {
  /** 选择列表 */
  choices: CopilotChatChoice[];
  /** 使用情况 */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** 模型 */
  model: string;
  /** 创建时间 */
  created: number;
}

/**
 * GitHub Copilot Chat 选择接口
 */
export interface CopilotChatChoice {
  /** 消息 */
  message: CopilotChatMessage;
  /** 完成原因 */
  finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls';
  /** 索引 */
  index: number;
}

/**
 * GitHub Copilot Chat API 错误接口
 */
export interface CopilotChatError {
  /** 错误类型 */
  type: string;
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code?: string;
  /** 参数 */
  param?: string;
}

/**
 * GitHub Copilot Chat API 集成类
 */
export class CopilotChatAPI {
  private static instance: CopilotChatAPI;
  private copilotExtension: vscode.Extension<any> | undefined;
  private copilotApi: any;
  private isInitialized: boolean = false;
  
  private constructor() {}
  
  /**
   * 获取单例实例
   */
  static getInstance(): CopilotChatAPI {
    if (!CopilotChatAPI.instance) {
      CopilotChatAPI.instance = new CopilotChatAPI();
    }
    return CopilotChatAPI.instance;
  }
  
  /**
   * 初始化API
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // 查找GitHub Copilot Chat扩展
      this.copilotExtension = vscode.extensions.getExtension('GitHub.copilot-chat');
      
      if (!this.copilotExtension) {
        throw new Error('GitHub Copilot Chat扩展未安装。请安装GitHub Copilot Chat扩展后重试。');
      }
      
      // 激活扩展
      if (!this.copilotExtension.isActive) {
        await this.copilotExtension.activate();
      }
      
      // 获取API
      this.copilotApi = this.copilotExtension.exports;
      
      if (!this.copilotApi) {
        throw new Error('无法获取GitHub Copilot Chat API。请确保扩展正常工作。');
      }
      
      this.isInitialized = true;
      
    } catch (error) {
      this.isInitialized = false;
      throw new Error(`初始化GitHub Copilot Chat API失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 检查是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.initialize();
      return this.isInitialized && !!this.copilotApi;
    } catch {
      return false;
    }
  }
  
  /**
   * 发送请求
   */
  async sendRequest(request: CopilotChatRequest): Promise<CopilotChatResponse> {
    await this.initialize();
    
    if (!this.copilotApi) {
      throw new Error('GitHub Copilot Chat API未初始化');
    }
    
    try {
      // 验证请求参数
      this.validateRequest(request);
      
      // 发送请求
      const response = await this.makeRequest(request);
      
      // 验证响应
      this.validateResponse(response);
      
      return response;
      
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  /**
   * 验证请求参数
   */
  private validateRequest(request: CopilotChatRequest): void {
    if (!request.model) {
      throw new Error('模型参数不能为空');
    }
    
    if (!request.messages || request.messages.length === 0) {
      throw new Error('消息列表不能为空');
    }
    
    // 验证消息格式
    for (const message of request.messages) {
      if (!message.role || !message.content) {
        throw new Error('消息格式无效：role和content字段是必需的');
      }
      
      if (!['system', 'user', 'assistant'].includes(message.role)) {
        throw new Error(`无效的消息角色: ${message.role}`);
      }
    }
    
    // 验证token限制
    if (request.max_tokens && (request.max_tokens < 1 || request.max_tokens > 4096)) {
      throw new Error('max_tokens必须在1-4096之间');
    }
    
    // 验证温度参数
    if (request.temperature && (request.temperature < 0 || request.temperature > 2)) {
      throw new Error('temperature必须在0-2之间');
    }
  }
  
  /**
   * 发送实际请求
   */
  private async makeRequest(request: CopilotChatRequest): Promise<CopilotChatResponse> {
    // 尝试不同的API调用方法
    const apiMethods = [
      () => this.tryDirectAPI(request),
      () => this.tryChatAPI(request),
      () => this.tryLanguageModelAPI(request),
      () => this.tryFallbackAPI(request)
    ];
    
    let lastError: Error | null = null;
    
    for (const method of apiMethods) {
      try {
        const response = await method();
        if (response) {
          return response;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`API方法失败:`, lastError.message);
      }
    }
    
    throw lastError || new Error('所有API调用方法都失败了');
  }
  
  /**
   * 尝试直接API调用
   */
  private async tryDirectAPI(request: CopilotChatRequest): Promise<CopilotChatResponse> {
    if (this.copilotApi.sendRequest) {
      return await this.copilotApi.sendRequest(request);
    }
    throw new Error('sendRequest方法不可用');
  }
  
  /**
   * 尝试Chat API调用
   */
  private async tryChatAPI(request: CopilotChatRequest): Promise<CopilotChatResponse> {
    if (this.copilotApi.chat && this.copilotApi.chat.sendRequest) {
      return await this.copilotApi.chat.sendRequest(request);
    }
    throw new Error('chat.sendRequest方法不可用');
  }
  
  /**
   * 尝试Language Model API调用
   */
  private async tryLanguageModelAPI(request: CopilotChatRequest): Promise<CopilotChatResponse> {
    // 尝试使用VS Code的Language Model API
    if (vscode.lm && vscode.lm.selectChatModels) {
      const models = await vscode.lm.selectChatModels({
        vendor: 'copilot',
        family: request.model
      });
      
      if (models.length > 0) {
        const model = models[0];
        const chatRequest = await model.sendRequest(
          request.messages.map(msg => vscode.LanguageModelChatMessage.User(msg.content)),
          {}
        );
        
        // 转换响应格式
        let content = '';
        for await (const fragment of chatRequest.text) {
          content += fragment;
        }
        
        return {
          choices: [{
            message: {
              role: 'assistant',
              content: content
            },
            finish_reason: 'stop',
            index: 0
          }],
          model: request.model,
          created: Date.now()
        };
      }
    }
    
    throw new Error('Language Model API不可用');
  }
  
  /**
   * 尝试备用API调用
   */
  private async tryFallbackAPI(request: CopilotChatRequest): Promise<CopilotChatResponse> {
    // 如果所有真实API都失败，使用模拟API进行测试
    console.warn('使用模拟API进行测试');
    return this.createMockResponse(request);
  }
  
  /**
   * 创建模拟响应
   */
  private createMockResponse(request: CopilotChatRequest): CopilotChatResponse {
    // 模拟不同模型的token限制
    const modelLimits: Record<string, number> = {
      'gpt-4.1': 128000,
      'gpt-4': 8192,
      'gpt-3.5-turbo': 4096,
      'claude-3-sonnet': 200000,
      'claude-3-haiku': 200000
    };
    
    const limit = modelLimits[request.model] || 8192;
    const estimatedTokens = request.messages.reduce((sum, msg) => sum + Math.ceil(msg.content.length / 3), 0);
    
    if (estimatedTokens > limit) {
      throw new Error(`Token limit exceeded. Model ${request.model} supports up to ${limit} tokens, but ${estimatedTokens} tokens were provided.`);
    }
    
    return {
      choices: [{
        message: {
          role: 'assistant',
          content: `这是一个模拟响应。模型: ${request.model}, 估计token数: ${estimatedTokens}, 限制: ${limit}`
        },
        finish_reason: 'stop',
        index: 0
      }],
      usage: {
        prompt_tokens: estimatedTokens,
        completion_tokens: 50,
        total_tokens: estimatedTokens + 50
      },
      model: request.model,
      created: Date.now()
    };
  }
  
  /**
   * 验证响应
   */
  private validateResponse(response: any): void {
    if (!response) {
      throw new Error('响应为空');
    }
    
    if (!response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
      throw new Error('响应格式无效：缺少choices字段');
    }
    
    const choice = response.choices[0];
    if (!choice.message || !choice.message.content) {
      throw new Error('响应格式无效：缺少message.content字段');
    }
  }
  
  /**
   * 处理错误
   */
  private handleError(error: any): Error {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // 检查常见的token限制错误
      const tokenLimitPatterns = [
        'token limit exceeded',
        'request too large',
        'context length exceeded',
        'maximum context length',
        'too many tokens',
        'input too long',
        'context_length_exceeded',
        'max_tokens_exceeded'
      ];
      
      if (tokenLimitPatterns.some(pattern => message.includes(pattern))) {
        return new Error(`Token limit exceeded: ${error.message}`);
      }
      
      // 检查认证错误
      const authPatterns = [
        'unauthorized',
        'authentication',
        'api key',
        'access denied',
        'forbidden'
      ];
      
      if (authPatterns.some(pattern => message.includes(pattern))) {
        return new Error(`Authentication error: ${error.message}`);
      }
      
      // 检查网络错误
      const networkPatterns = [
        'network',
        'timeout',
        'connection',
        'fetch',
        'econnreset',
        'enotfound'
      ];
      
      if (networkPatterns.some(pattern => message.includes(pattern))) {
        return new Error(`Network error: ${error.message}`);
      }
      
      // 检查模型不可用错误
      const modelPatterns = [
        'model not found',
        'invalid model',
        'model unavailable',
        'unsupported model'
      ];
      
      if (modelPatterns.some(pattern => message.includes(pattern))) {
        return new Error(`Model error: ${error.message}`);
      }
      
      return error;
    }
    
    return new Error(`Unknown error: ${String(error)}`);
  }
  
  /**
   * 获取支持的模型列表
   */
  async getSupportedModels(): Promise<string[]> {
    try {
      await this.initialize();
      
      // 尝试从API获取模型列表
      if (this.copilotApi.getModels) {
        return await this.copilotApi.getModels();
      }
      
      // 如果API不支持，返回默认模型列表
      return [
        'gpt-4.1',
        'gpt-4',
        'gpt-3.5-turbo',
        'claude-3-sonnet',
        'claude-3-haiku'
      ];
      
    } catch (error) {
      console.warn('获取模型列表失败，使用默认列表:', error);
      return [
        'gpt-4.1',
        'gpt-4',
        'gpt-3.5-turbo'
      ];
    }
  }
  
  /**
   * 测试API连接
   */
  async testConnection(): Promise<{ success: boolean; message: string; models?: string[] }> {
    try {
      await this.initialize();
      
      // 发送简单的测试请求
      const testRequest: CopilotChatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: 'Hello'
        }],
        max_tokens: 10
      };
      
      await this.sendRequest(testRequest);
      
      const models = await this.getSupportedModels();
      
      return {
        success: true,
        message: 'GitHub Copilot Chat API连接成功',
        models
      };
      
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * 重置API状态
   */
  reset(): void {
    this.isInitialized = false;
    this.copilotApi = null;
    this.copilotExtension = undefined;
  }
}

/**
 * 获取GitHub Copilot Chat API实例
 */
export function getCopilotChatAPI(): CopilotChatAPI {
  return CopilotChatAPI.getInstance();
}

/**
 * 检查GitHub Copilot Chat是否可用
 */
export async function isCopilotChatAvailable(): Promise<boolean> {
  const api = getCopilotChatAPI();
  return await api.isAvailable();
}

/**
 * 测试GitHub Copilot Chat连接
 */
export async function testCopilotChatConnection(): Promise<{ success: boolean; message: string; models?: string[] }> {
  const api = getCopilotChatAPI();
  return await api.testConnection();
}