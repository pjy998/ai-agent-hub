/**
 * AI服务管理器 - 统一管理AI服务实例和配置
 */

import { BaseAIService, AIProvider, AIModelConfig, AIRequest, AIResponse, AIServiceFactory } from './index';
import { ConfigManager, Logger } from '../utils';

/**
 * AI服务统计信息
 */
export interface AIServiceStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalTokensUsed: number;
    averageResponseTime: number;
    lastRequestTime?: string;
    errorRate: number;
}

/**
 * AI服务状态
 */
export enum AIServiceStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    ERROR = 'error',
    CONFIGURING = 'configuring'
}

/**
 * AI服务信息
 */
export interface AIServiceInfo {
    provider: AIProvider;
    model: string;
    status: AIServiceStatus;
    config: AIModelConfig;
    stats: AIServiceStats;
    lastError?: string;
}

/**
 * AI服务管理器配置
 */
export interface AIManagerConfig {
    defaultProvider: AIProvider;
    fallbackProviders: AIProvider[];
    maxRetries: number;
    retryDelay: number;
    requestTimeout: number;
    enableFallback: boolean;
    enableStats: boolean;
}

/**
 * AI服务管理器
 */
export class AIServiceManager {
    private services: Map<AIProvider, BaseAIService> = new Map();
    private serviceStats: Map<AIProvider, AIServiceStats> = new Map();
    private serviceStatus: Map<AIProvider, AIServiceStatus> = new Map();
    private serviceErrors: Map<AIProvider, string> = new Map();
    private configManager: ConfigManager;
    private logger: Logger;
    private config: AIManagerConfig;

    constructor(configManager: ConfigManager, logger: Logger) {
        this.configManager = configManager;
        this.logger = logger;
        this.config = this.loadManagerConfig();
        this.initializeServices();
    }

    /**
     * 加载管理器配置
     */
    private loadManagerConfig(): AIManagerConfig {
        const config = this.configManager.getConfig();
        return {
            defaultProvider: (config as any).ai?.defaultProvider || AIProvider.LOCAL,
            fallbackProviders: (config as any).ai?.fallbackProviders || [AIProvider.LOCAL],
            maxRetries: (config as any).ai?.maxRetries || 3,
            retryDelay: (config as any).ai?.retryDelay || 1000,
            requestTimeout: (config as any).ai?.requestTimeout || 30000,
            enableFallback: (config as any).ai?.enableFallback ?? true,
            enableStats: (config as any).ai?.enableStats ?? true
        };
    }

    /**
     * 初始化AI服务
     */
    private initializeServices(): void {
        const aiConfig = (this.configManager.getConfig() as any).ai || {};
        
        // 初始化所有配置的提供商
        for (const [providerKey, providerConfig] of Object.entries((aiConfig as any).providers || {})) {
            const provider = providerKey as AIProvider;
            if (this.isValidProvider(provider)) {
                this.addService(provider, providerConfig as AIModelConfig);
            }
        }

        // 确保至少有一个服务（默认为模拟服务）
        if (this.services.size === 0) {
            this.addService(AIProvider.LOCAL, {
                provider: AIProvider.LOCAL,
                model: 'mock-gpt-4'
            });
        }
    }

    /**
     * 验证提供商是否有效
     */
    private isValidProvider(provider: string): provider is AIProvider {
        return Object.values(AIProvider).includes(provider as AIProvider);
    }

    /**
     * 添加AI服务
     */
    public addService(provider: AIProvider, config: AIModelConfig): void {
        try {
            this.setServiceStatus(provider, AIServiceStatus.CONFIGURING);
            
            const service = AIServiceFactory.createService(provider, config, this.configManager);
            
            if (service.validateConfig()) {
                this.services.set(provider, service);
                this.initializeServiceStats(provider);
                this.setServiceStatus(provider, AIServiceStatus.ACTIVE);
                this.logger.info(`AI service added: ${provider}`);
            } else {
                this.setServiceStatus(provider, AIServiceStatus.ERROR);
                this.setServiceError(provider, 'Invalid configuration');
                this.logger.error(`Failed to add AI service ${provider}: Invalid configuration`);
            }
        } catch (error) {
            this.setServiceStatus(provider, AIServiceStatus.ERROR);
            this.setServiceError(provider, error instanceof Error ? error.message : 'Unknown error');
            this.logger.error(`Failed to add AI service ${provider}:`, error);
        }
    }

    /**
     * 移除AI服务
     */
    public removeService(provider: AIProvider): void {
        this.services.delete(provider);
        this.serviceStats.delete(provider);
        this.serviceStatus.delete(provider);
        this.serviceErrors.delete(provider);
        this.logger.info(`AI service removed: ${provider}`);
    }

    /**
     * 获取AI服务
     */
    public getService(provider?: AIProvider): BaseAIService | null {
        const targetProvider = provider || this.config.defaultProvider;
        return this.services.get(targetProvider) || null;
    }

    /**
     * 获取可用的AI服务
     */
    public getAvailableService(): BaseAIService | null {
        // 首先尝试默认提供商
        const defaultService = this.getService(this.config.defaultProvider);
        if (defaultService && this.getServiceStatus(this.config.defaultProvider) === AIServiceStatus.ACTIVE) {
            return defaultService;
        }

        // 尝试备用提供商
        for (const provider of this.config.fallbackProviders) {
            const service = this.getService(provider);
            if (service && this.getServiceStatus(provider) === AIServiceStatus.ACTIVE) {
                return service;
            }
        }

        return null;
    }

    /**
     * 生成AI响应
     */
    public async generateResponse(
        request: AIRequest,
        provider?: AIProvider
    ): Promise<AIResponse> {
        const startTime = Date.now();
        let lastError: Error | null = null;
        
        // 确定要使用的提供商列表
        const providers = provider 
            ? [provider] 
            : [this.config.defaultProvider, ...this.config.fallbackProviders];

        for (const currentProvider of providers) {
            const service = this.getService(currentProvider);
            if (!service || this.getServiceStatus(currentProvider) !== AIServiceStatus.ACTIVE) {
                continue;
            }

            try {
                this.logger.debug(`Generating response with ${currentProvider}`);
                
                // 执行请求
                const response = await this.executeWithTimeout(
                    service.generateResponse(request),
                    this.config.requestTimeout
                );

                // 更新统计信息
                if (this.config.enableStats) {
                    this.updateServiceStats(currentProvider, true, Date.now() - startTime, response.usage?.totalTokens || 0);
                }

                this.logger.info(`AI response generated successfully with ${currentProvider}`);
                return response;

            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                this.logger.error(`AI request failed with ${currentProvider}:`, error);
                
                // 更新统计信息
                if (this.config.enableStats) {
                    this.updateServiceStats(currentProvider, false, Date.now() - startTime, 0);
                }

                // 设置服务错误状态
                this.setServiceError(currentProvider, lastError.message);
                
                // 如果不启用回退，直接抛出错误
                if (!this.config.enableFallback) {
                    throw lastError;
                }
            }
        }

        // 所有服务都失败了
        throw new Error(`All AI services failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    /**
     * 带超时的执行
     */
    private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
        return Promise.race([
            promise,
            new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), timeout);
            })
        ]);
    }

    /**
     * 初始化服务统计信息
     */
    private initializeServiceStats(provider: AIProvider): void {
        this.serviceStats.set(provider, {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalTokensUsed: 0,
            averageResponseTime: 0,
            errorRate: 0
        });
    }

    /**
     * 更新服务统计信息
     */
    private updateServiceStats(
        provider: AIProvider,
        success: boolean,
        responseTime: number,
        tokensUsed: number
    ): void {
        const stats = this.serviceStats.get(provider);
        if (!stats) return;

        stats.totalRequests++;
        stats.lastRequestTime = new Date().toISOString();
        stats.totalTokensUsed += tokensUsed;

        if (success) {
            stats.successfulRequests++;
        } else {
            stats.failedRequests++;
        }

        // 计算平均响应时间
        stats.averageResponseTime = (
            (stats.averageResponseTime * (stats.totalRequests - 1) + responseTime) / 
            stats.totalRequests
        );

        // 计算错误率
        stats.errorRate = stats.failedRequests / stats.totalRequests;

        this.serviceStats.set(provider, stats);
    }

    /**
     * 设置服务状态
     */
    private setServiceStatus(provider: AIProvider, status: AIServiceStatus): void {
        this.serviceStatus.set(provider, status);
    }

    /**
     * 获取服务状态
     */
    public getServiceStatus(provider: AIProvider): AIServiceStatus {
        return this.serviceStatus.get(provider) || AIServiceStatus.INACTIVE;
    }

    /**
     * 设置服务错误
     */
    private setServiceError(provider: AIProvider, error: string): void {
        this.serviceErrors.set(provider, error);
    }

    /**
     * 获取服务错误
     */
    public getServiceError(provider: AIProvider): string | undefined {
        return this.serviceErrors.get(provider);
    }

    /**
     * 获取服务统计信息
     */
    public getServiceStats(provider: AIProvider): AIServiceStats | undefined {
        return this.serviceStats.get(provider);
    }

    /**
     * 获取所有服务信息
     */
    public getAllServicesInfo(): AIServiceInfo[] {
        const services: AIServiceInfo[] = [];
        
        for (const [provider, service] of this.services) {
            const stats = this.getServiceStats(provider);
            const status = this.getServiceStatus(provider);
            const lastError = this.getServiceError(provider);
            
            if (stats) {
                services.push({
                    provider,
                    model: (service as any).config?.model || 'unknown',
                    status,
                    config: (service as any).config,
                    stats,
                    lastError
                });
            }
        }
        
        return services;
    }

    /**
     * 获取可用的模型列表
     */
    public getAvailableModels(provider?: AIProvider): string[] {
        if (provider) {
            const service = this.getService(provider);
            return service ? service.getAvailableModels() : [];
        }

        // 返回所有服务的模型
        const allModels: string[] = [];
        for (const service of this.services.values()) {
            allModels.push(...service.getAvailableModels());
        }
        
        return [...new Set(allModels)]; // 去重
    }

    /**
     * 重置服务统计信息
     */
    public resetServiceStats(provider?: AIProvider): void {
        if (provider) {
            this.initializeServiceStats(provider);
        } else {
            for (const serviceProvider of this.services.keys()) {
                this.initializeServiceStats(serviceProvider);
            }
        }
        this.logger.info(`Service stats reset for ${provider || 'all providers'}`);
    }

    /**
     * 更新管理器配置
     */
    public updateConfig(newConfig: Partial<AIManagerConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('AI manager configuration updated');
    }

    /**
     * 健康检查
     */
    public async healthCheck(): Promise<{ [provider: string]: boolean }> {
        const results: { [provider: string]: boolean } = {};
        
        for (const [provider, service] of this.services) {
            try {
                // 发送简单的测试请求
                await service.generateResponse({
                    prompt: 'Hello',
                    maxTokens: 10
                });
                results[provider] = true;
                this.setServiceStatus(provider, AIServiceStatus.ACTIVE);
            } catch (error) {
                results[provider] = false;
                this.setServiceStatus(provider, AIServiceStatus.ERROR);
                this.setServiceError(provider, error instanceof Error ? error.message : 'Health check failed');
            }
        }
        
        return results;
    }

    /**
     * 获取管理器状态
     */
    public getManagerStatus(): {
        totalServices: number;
        activeServices: number;
        defaultProvider: AIProvider;
        config: AIManagerConfig;
    } {
        const activeServices = Array.from(this.serviceStatus.values())
            .filter(status => status === AIServiceStatus.ACTIVE).length;
            
        return {
            totalServices: this.services.size,
            activeServices,
            defaultProvider: this.config.defaultProvider,
            config: this.config
        };
    }
}