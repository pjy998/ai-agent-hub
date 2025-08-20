/**
 * AI服务相关类型定义
 */

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
    timestamp: string;
    requestId: string;
}

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
 * 工作流执行结果
 */
export interface WorkflowResult {
    success: boolean;
    data?: any;
    error?: string;
    model?: string;
    provider?: AIProvider;
    usage?: AIResponse['usage'];
    timestamp: string;
    requestId?: string;
}

/**
 * 代码生成输入
 */
export interface CodeGenerationInput {
    description: string;
    language?: string;
    framework?: string;
    requirements?: string;
    context?: string;
}

/**
 * 测试生成输入
 */
export interface TestGenerationInput {
    codeFile?: string;
    code?: string;
    framework?: string;
    testType?: 'unit' | 'integration' | 'e2e';
}

/**
 * 需求分析输入
 */
export interface RequirementsAnalysisInput {
    requirements: string;
    projectType?: string;
    constraints?: string;
    stakeholders?: string;
}

/**
 * 需求分析结果
 */
export interface RequirementsAnalysisResult {
    summary: string;
    features: string[];
    techStack: string[];
    timeline: string;
    risks: string[];
    resources: string[];
    architecture: string;
}