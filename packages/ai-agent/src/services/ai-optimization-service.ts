/**
 * AI调用优化服务
 * 提供请求缓存、批处理、重试机制等性能优化功能
 */

import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { outputManager } from '../utils/output-manager';

export interface AIRequest {
  id: string;
  prompt: string;
  context?: string;
  systemMessage?: string;
  temperature?: number;
  maxTokens?: number;
  priority?: 'high' | 'medium' | 'low';
}

export interface AIResponse {
  id: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cached?: boolean;
  timestamp: number;
  processingTime: number;
}

interface CacheEntry {
  response: AIResponse;
  timestamp: number;
  hash: string;
  accessCount: number;
  lastAccess: number;
}

interface BatchRequest {
  requests: AIRequest[];
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

interface OptimizationConfig {
  enableCache: boolean;
  cacheMaxSize: number;
  cacheTTL: number; // milliseconds
  enableBatching: boolean;
  batchSize: number;
  batchTimeout: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
  enableRateLimiting: boolean;
  requestsPerMinute: number;
  enablePrioritization: boolean;
}

export class AIOptimizationService {
  private static instance: AIOptimizationService;
  private cache = new Map<string, CacheEntry>();
  private requestQueue: AIRequest[] = [];
  private batchQueue: BatchRequest[] = [];
  private rateLimitTracker = new Map<string, number[]>();
  private processingBatch = false;
  private batchTimer?: NodeJS.Timeout;

  private config: OptimizationConfig = {
    enableCache: true,
    cacheMaxSize: 1000,
    cacheTTL: 30 * 60 * 1000, // 30 minutes
    enableBatching: true,
    batchSize: 5,
    batchTimeout: 2000, // 2 seconds
    maxRetries: 3,
    retryDelay: 1000,
    enableRateLimiting: true,
    requestsPerMinute: 60,
    enablePrioritization: true,
  };

  private constructor() {
    this.loadConfiguration();
    this.startCacheCleanup();
    this.startBatchProcessor();
  }

  static getInstance(): AIOptimizationService {
    if (!AIOptimizationService.instance) {
      AIOptimizationService.instance = new AIOptimizationService();
    }
    return AIOptimizationService.instance;
  }

  /**
   * 优化的AI请求方法
   */
  async optimizedRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // 1. 检查缓存
      if (this.config.enableCache) {
        const cached = this.getCachedResponse(request);
        if (cached) {
          cached.cached = true;
          this.updateCacheAccess(this.generateRequestHash(request));
          return cached;
        }
      }

      // 2. 检查速率限制
      if (this.config.enableRateLimiting) {
        await this.checkRateLimit();
      }

      // 3. 添加到队列或直接处理
      if (this.config.enableBatching && request.priority !== 'high') {
        return await this.addToBatch(request);
      } else {
        return await this.processRequestWithRetry(request, startTime);
      }
    } catch (error) {
      const errorResponse: AIResponse = {
        id: request.id,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
      };
      return errorResponse;
    }
  }

  /**
   * 批量处理AI请求
   */
  async batchRequest(requests: AIRequest[]): Promise<AIResponse[]> {
    const startTime = Date.now();
    const results: AIResponse[] = [];

    // 检查缓存
    const uncachedRequests: AIRequest[] = [];

    for (const request of requests) {
      if (this.config.enableCache) {
        const cached = this.getCachedResponse(request);
        if (cached) {
          cached.cached = true;
          results.push(cached);
          continue;
        }
      }
      uncachedRequests.push(request);
    }

    // 处理未缓存的请求
    if (uncachedRequests.length > 0) {
      const batchResults = await this.processBatchWithRetry(uncachedRequests, startTime);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 生成请求哈希用于缓存
   */
  private generateRequestHash(request: AIRequest): string {
    const hashInput = {
      prompt: request.prompt,
      context: request.context || '',
      systemMessage: request.systemMessage || '',
      temperature: request.temperature || 0.7,
      maxTokens: request.maxTokens || 2000,
    };

    return crypto.createHash('sha256').update(JSON.stringify(hashInput)).digest('hex');
  }

  /**
   * 获取缓存的响应
   */
  private getCachedResponse(request: AIRequest): AIResponse | null {
    const hash = this.generateRequestHash(request);
    const cached = this.cache.get(hash);

    if (!cached) {
      return null;
    }

    // 检查TTL
    if (Date.now() - cached.timestamp > this.config.cacheTTL) {
      this.cache.delete(hash);
      return null;
    }

    return { ...cached.response };
  }

  /**
   * 更新缓存访问记录
   */
  private updateCacheAccess(hash: string): void {
    const cached = this.cache.get(hash);
    if (cached) {
      cached.accessCount++;
      cached.lastAccess = Date.now();
    }
  }

  /**
   * 缓存响应
   */
  private cacheResponse(request: AIRequest, response: AIResponse): void {
    if (!this.config.enableCache) {
      return;
    }

    const hash = this.generateRequestHash(request);

    // LRU缓存清理
    if (this.cache.size >= this.config.cacheMaxSize) {
      this.evictLRUCache();
    }

    this.cache.set(hash, {
      response: { ...response },
      timestamp: Date.now(),
      hash,
      accessCount: 1,
      lastAccess: Date.now(),
    });
  }

  /**
   * LRU缓存淘汰
   */
  private evictLRUCache(): void {
    let oldestTime = Date.now();
    let oldestKey = '';

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 检查速率限制
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    const key = 'ai-requests';

    let requests = this.rateLimitTracker.get(key) || [];

    // 清理过期的请求记录
    requests = requests.filter(timestamp => timestamp > windowStart);

    if (requests.length >= this.config.requestsPerMinute) {
      const waitTime = requests[0] + 60000 - now;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    requests.push(now);
    this.rateLimitTracker.set(key, requests);
  }

  /**
   * 添加到批处理队列
   */
  private async addToBatch(request: AIRequest): Promise<AIResponse> {
    return new Promise((resolve, reject) => {
      // 添加回调到请求
      (request as any).resolve = resolve;
      (request as any).reject = reject;

      this.requestQueue.push(request);

      // 如果队列满了或者是高优先级，立即处理
      if (this.requestQueue.length >= this.config.batchSize || request.priority === 'high') {
        this.processBatchQueue();
      } else if (!this.batchTimer) {
        // 设置超时处理
        this.batchTimer = setTimeout(() => {
          this.processBatchQueue();
        }, this.config.batchTimeout);
      }
    });
  }

  /**
   * 处理批处理队列
   */
  private async processBatchQueue(): Promise<void> {
    if (this.processingBatch || this.requestQueue.length === 0) {
      return;
    }

    this.processingBatch = true;

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    const batch = this.requestQueue.splice(0, this.config.batchSize);

    try {
      const results = await this.processBatchWithRetry(batch, Date.now());

      // 解析批处理结果
      for (let i = 0; i < batch.length; i++) {
        const request = batch[i] as any;
        const result = results[i];

        if (request.resolve) {
          request.resolve(result);
        }
      }
    } catch (error) {
      // 处理批处理错误
      for (const request of batch) {
        const req = request as any;
        if (req.reject) {
          req.reject(error);
        }
      }
    } finally {
      this.processingBatch = false;

      // 如果还有请求在队列中，继续处理
      if (this.requestQueue.length > 0) {
        setTimeout(() => this.processBatchQueue(), 100);
      }
    }
  }

  /**
   * 带重试的请求处理
   */
  private async processRequestWithRetry(
    request: AIRequest,
    startTime: number
  ): Promise<AIResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.executeAIRequest(request, startTime);

        // 缓存成功的响应
        this.cacheResponse(request, response);

        return response;
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // 指数退避
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * 带重试的批处理
   */
  private async processBatchWithRetry(
    requests: AIRequest[],
    startTime: number
  ): Promise<AIResponse[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const responses = await this.executeBatchAIRequest(requests, startTime);

        // 缓存成功的响应
        for (let i = 0; i < requests.length; i++) {
          this.cacheResponse(requests[i], responses[i]);
        }

        return responses;
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Batch request failed after all retries');
  }

  /**
   * 执行单个AI请求（模拟实现）
   */
  private async executeAIRequest(request: AIRequest, startTime: number): Promise<AIResponse> {
    // 这里应该调用实际的AI服务（如ChatGPT、Claude等）
    // 目前使用模拟实现

    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000)); // 模拟网络延迟

    const response: AIResponse = {
      id: request.id,
      content: `AI response for: ${request.prompt.substring(0, 50)}...`,
      usage: {
        promptTokens: Math.floor(request.prompt.length / 4),
        completionTokens: 100,
        totalTokens: Math.floor(request.prompt.length / 4) + 100,
      },
      timestamp: Date.now(),
      processingTime: Date.now() - startTime,
    };

    return response;
  }

  /**
   * 执行批量AI请求（模拟实现）
   */
  private async executeBatchAIRequest(
    requests: AIRequest[],
    startTime: number
  ): Promise<AIResponse[]> {
    // 批量请求通常比单个请求更高效
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));

    return requests.map(request => ({
      id: request.id,
      content: `Batch AI response for: ${request.prompt.substring(0, 50)}...`,
      usage: {
        promptTokens: Math.floor(request.prompt.length / 4),
        completionTokens: 100,
        totalTokens: Math.floor(request.prompt.length / 4) + 100,
      },
      timestamp: Date.now(),
      processingTime: Date.now() - startTime,
    }));
  }

  /**
   * 启动缓存清理
   */
  private startCacheCleanup(): void {
    setInterval(
      () => {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.cache.entries()) {
          if (now - entry.timestamp > this.config.cacheTTL) {
            keysToDelete.push(key);
          }
        }

        keysToDelete.forEach(key => this.cache.delete(key));

        if (keysToDelete.length > 0) {
          outputManager
            .getProjectScanChannel()
            .appendLine(`🧹 清理了 ${keysToDelete.length} 个过期缓存项`);
        }
      },
      5 * 60 * 1000
    ); // 每5分钟清理一次
  }

  /**
   * 启动批处理器
   */
  private startBatchProcessor(): void {
    // 定期检查批处理队列
    setInterval(() => {
      if (this.requestQueue.length > 0 && !this.processingBatch) {
        this.processBatchQueue();
      }
    }, 1000);
  }

  /**
   * 加载配置
   */
  private loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration('ai-agent-hub.optimization');

    this.config = {
      enableCache: config.get('enableCache', true),
      cacheMaxSize: config.get('cacheMaxSize', 1000),
      cacheTTL: config.get('cacheTTL', 30 * 60 * 1000),
      enableBatching: config.get('enableBatching', true),
      batchSize: config.get('batchSize', 5),
      batchTimeout: config.get('batchTimeout', 2000),
      maxRetries: config.get('maxRetries', 3),
      retryDelay: config.get('retryDelay', 1000),
      enableRateLimiting: config.get('enableRateLimiting', true),
      requestsPerMinute: config.get('requestsPerMinute', 60),
      enablePrioritization: config.get('enablePrioritization', true),
    };
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    cacheSize: number;
    cacheHitRate: number;
    queueLength: number;
    averageResponseTime: number;
  } {
    let totalAccess = 0;
    let totalHits = 0;

    for (const entry of this.cache.values()) {
      totalAccess += entry.accessCount;
      totalHits += entry.accessCount;
    }

    return {
      cacheSize: this.cache.size,
      cacheHitRate: totalAccess > 0 ? totalHits / totalAccess : 0,
      queueLength: this.requestQueue.length,
      averageResponseTime: 0, // 需要实际统计
    };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
    outputManager.getProjectScanChannel().appendLine('🧹 AI请求缓存已清理');
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * 获取AI优化服务实例
 */
export function getAIOptimizationService(): AIOptimizationService {
  return AIOptimizationService.getInstance();
}
