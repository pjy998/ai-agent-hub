import { encoding_for_model, get_encoding } from 'tiktoken';

/**
 * 支持的模型类型
 */
export type SupportedModel = 
  | 'gpt-4' | 'gpt-4-32k' | 'gpt-4-turbo' | 'gpt-4o' | 'gpt-4.1'
  | 'gpt-3.5-turbo' | 'gpt-3.5-turbo-16k'
  | 'claude-3-sonnet' | 'claude-3-haiku' | 'claude-sonnet-3.5' | 'claude-sonnet-3.7' | 'claude-sonnet-4'
  | 'text-davinci-003' | 'text-davinci-002';

/**
 * Token计算结果接口
 */
export interface TokenCalculationResult {
  /** 总token数 */
  totalTokens: number;
  /** 消息token数组 */
  messageTokens: number[];
  /** 系统开销token数 */
  systemOverhead: number;
  /** 使用的编码器 */
  encoding: string;
  /** 模型名称 */
  model: string;
}

/**
 * 消息接口
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 精确的Token计算器
 */
export class TokenCalculator {
  private static instance: TokenCalculator;
  private encodingCache = new Map<string, any>();
  
  private constructor() {}
  
  static getInstance(): TokenCalculator {
    if (!TokenCalculator.instance) {
      TokenCalculator.instance = new TokenCalculator();
    }
    return TokenCalculator.instance;
  }
  
  /**
   * 计算文本的token数量
   */
  calculateTokens(text: string, model: SupportedModel = 'gpt-4'): number {
    try {
      const encoding = this.getEncoding(model);
      const tokens = encoding.encode(text);
      return tokens.length;
    } catch (error) {
      console.warn(`Token计算失败，使用估算方法: ${error}`);
      // 回退到估算方法
      return this.estimateTokens(text, model);
    }
  }
  
  /**
   * 计算聊天消息的token数量
   */
  calculateChatTokens(messages: ChatMessage[], model: SupportedModel = 'gpt-4'): TokenCalculationResult {
    try {
      const encoding = this.getEncoding(model);
      const messageTokens: number[] = [];
      let totalTokens = 0;
      
      // 计算每条消息的token数
      for (const message of messages) {
        const messageText = `${message.role}: ${message.content}`;
        const tokens = encoding.encode(messageText);
        const tokenCount = tokens.length;
        messageTokens.push(tokenCount);
        totalTokens += tokenCount;
      }
      
      // 添加系统开销（根据模型不同而不同）
      const systemOverhead = this.getSystemOverhead(model, messages.length);
      totalTokens += systemOverhead;
      
      return {
        totalTokens,
        messageTokens,
        systemOverhead,
        encoding: this.getEncodingName(model),
        model
      };
    } catch (error) {
      console.warn(`聊天token计算失败，使用估算方法: ${error}`);
      return this.estimateChatTokens(messages, model);
    }
  }
  
  /**
   * 获取模型对应的编码器
   */
  private getEncoding(model: SupportedModel) {
    const encodingName = this.getEncodingName(model);
    
    if (!this.encodingCache.has(encodingName)) {
      try {
        // 优先使用模型特定的编码器
        if (this.isOpenAIModel(model)) {
          const encoding = encoding_for_model(model as any);
          this.encodingCache.set(encodingName, encoding);
        } else {
          // 对于非OpenAI模型，使用通用编码器
          const encoding = get_encoding(encodingName as any);
          this.encodingCache.set(encodingName, encoding);
        }
      } catch (error) {
        // 如果特定编码器不可用，使用cl100k_base作为默认
        const encoding = get_encoding('cl100k_base');
        this.encodingCache.set(encodingName, encoding);
      }
    }
    
    return this.encodingCache.get(encodingName);
  }
  
  /**
   * 获取编码器名称
   */
  private getEncodingName(model: SupportedModel): string {
    const encodingMap: Record<string, string> = {
      'gpt-4': 'cl100k_base',
      'gpt-4-32k': 'cl100k_base',
      'gpt-4-turbo': 'cl100k_base',
      'gpt-4o': 'cl100k_base',
      'gpt-4.1': 'cl100k_base',
      'gpt-3.5-turbo': 'cl100k_base',
      'gpt-3.5-turbo-16k': 'cl100k_base',
      'claude-3-sonnet': 'cl100k_base', // Claude使用类似的编码
      'claude-3-haiku': 'cl100k_base',
      'claude-sonnet-3.5': 'cl100k_base',
      'claude-sonnet-3.7': 'cl100k_base',
      'claude-sonnet-4': 'cl100k_base',
      'text-davinci-003': 'p50k_base',
      'text-davinci-002': 'p50k_base'
    };
    
    return encodingMap[model] || 'cl100k_base';
  }
  
  /**
   * 判断是否为OpenAI模型
   */
  private isOpenAIModel(model: SupportedModel): boolean {
    return model.startsWith('gpt-') || model.startsWith('text-davinci');
  }
  
  /**
   * 获取系统开销token数
   */
  private getSystemOverhead(model: SupportedModel, messageCount: number): number {
    // 基于OpenAI官方文档的系统开销计算
    if (this.isOpenAIModel(model)) {
      // 每条消息大约3个token的开销，加上对话的固定开销
      return messageCount * 3 + 3;
    } else {
      // 其他模型的估算开销
      return messageCount * 2 + 2;
    }
  }
  
  /**
   * 估算token数量（回退方法）
   */
  private estimateTokens(text: string, model: SupportedModel): number {
    // 基于不同模型的字符到token比例
    const ratioMap: Record<string, number> = {
      'gpt-4': 3.5,
      'gpt-4-32k': 3.5,
      'gpt-4-turbo': 3.5,
      'gpt-4o': 3.5,
      'gpt-4.1': 3.5,
      'gpt-3.5-turbo': 4,
      'gpt-3.5-turbo-16k': 4,
      'claude-3-sonnet': 3.8,
      'claude-3-haiku': 3.8,
      'claude-sonnet-3.5': 3.8,
      'claude-sonnet-3.7': 3.8,
      'claude-sonnet-4': 3.8,
      'text-davinci-003': 4,
      'text-davinci-002': 4
    };
    
    const ratio = ratioMap[model] || 3.5;
    return Math.ceil(text.length / ratio);
  }
  
  /**
   * 估算聊天token数量（回退方法）
   */
  private estimateChatTokens(messages: ChatMessage[], model: SupportedModel): TokenCalculationResult {
    const messageTokens: number[] = [];
    let totalTokens = 0;
    
    for (const message of messages) {
      const messageText = `${message.role}: ${message.content}`;
      const tokenCount = this.estimateTokens(messageText, model);
      messageTokens.push(tokenCount);
      totalTokens += tokenCount;
    }
    
    const systemOverhead = this.getSystemOverhead(model, messages.length);
    totalTokens += systemOverhead;
    
    return {
      totalTokens,
      messageTokens,
      systemOverhead,
      encoding: 'estimated',
      model
    };
  }
  
  /**
   * 计算剩余可用token数
   */
  calculateRemainingTokens(
    currentTokens: number, 
    maxTokens: number, 
    reservedForResponse: number = 1000
  ): number {
    return Math.max(0, maxTokens - currentTokens - reservedForResponse);
  }
  
  /**
   * 检查是否超过token限制
   */
  isWithinLimit(
    currentTokens: number, 
    maxTokens: number, 
    reservedForResponse: number = 1000
  ): boolean {
    return currentTokens + reservedForResponse <= maxTokens;
  }
  
  /**
   * 清理缓存
   */
  clearCache(): void {
    for (const encoding of this.encodingCache.values()) {
      if (encoding && typeof encoding.free === 'function') {
        encoding.free();
      }
    }
    this.encodingCache.clear();
  }
}

/**
 * 获取Token计算器实例
 */
export function getTokenCalculator(): TokenCalculator {
  return TokenCalculator.getInstance();
}

/**
 * 快速计算文本token数
 */
export function calculateTokens(text: string, model: SupportedModel = 'gpt-4'): number {
  return getTokenCalculator().calculateTokens(text, model);
}

/**
 * 快速计算聊天消息token数
 */
export function calculateChatTokens(messages: ChatMessage[], model: SupportedModel = 'gpt-4'): TokenCalculationResult {
  return getTokenCalculator().calculateChatTokens(messages, model);
}