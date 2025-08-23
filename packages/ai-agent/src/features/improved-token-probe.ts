import * as vscode from 'vscode';
import { TokenCalculator, SupportedModel, TokenCalculationResult, ChatMessage } from '../utils/token-calculator';
import { LLMMonitor, LLMCallRecord } from '../monitoring/llm-monitor';
import { CopilotChatAPI, CopilotChatRequest, CopilotChatResponse } from '../integrations/copilot-chat-api';
import { outputManager } from '../utils/output-manager';

/**
 * 改进的模型配置
 */
export interface ImprovedModelConfig {
  /** 模型名称 */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 最大上下文长度 */
  maxContextLength: number;
  /** 最大输出长度 */
  maxOutputLength: number;
  /** 成本倍数 */
  costMultiplier: number;
  /** 输入token价格（每1K tokens） */
  inputTokenPrice: number;
  /** 输出token价格（每1K tokens） */
  outputTokenPrice: number;
  /** 是否支持精确token计算 */
  supportsPreciseTokenization: boolean;
  /** tokenizer编码 */
  encoding?: string;
}

/**
 * 改进的测试配置
 */
export interface ImprovedTokenProbeConfig {
  /** 目标模型 */
  model: string;
  /** 测试模式 */
  testMode: 'binary_search' | 'linear_search' | 'adaptive';
  /** 最小测试长度 */
  minTestLength: number;
  /** 最大测试长度 */
  maxTestLength: number;
  /** 测试步长 */
  stepSize: number;
  /** 最大测试次数 */
  maxAttempts: number;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 是否包含项目上下文 */
  includeProjectContext: boolean;
  /** 是否计算输出token */
  includeOutputTokens: boolean;
  /** 测试输出长度 */
  testOutputLength: number;
  /** 精度阈值 */
  precisionThreshold: number;
}

/**
 * 改进的测试步骤
 */
export interface ImprovedTokenProbeStep {
  /** 步骤编号 */
  stepNumber: number;
  /** 输入token数量 */
  inputTokenCount: number;
  /** 预期输出token数量 */
  expectedOutputTokenCount: number;
  /** 总token数量 */
  totalTokenCount: number;
  /** 内容长度 */
  contentLength: number;
  /** 测试结果 */
  result: 'success' | 'failure' | 'error';
  /** 响应时间（毫秒） */
  responseTime: number;
  /** 实际输出token数量 */
  actualOutputTokenCount?: number;
  /** 错误信息 */
  errorMessage?: string;
  /** 成本估算 */
  estimatedCost: number;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 改进的测试结果
 */
export interface ImprovedTokenProbeResult {
  /** 模型名称 */
  model: string;
  /** 最大上下文长度 */
  maxContextLength: number;
  /** 实际测试的最大token数 */
  actualMaxTokens: number;
  /** 测试开始时间 */
  startTime: number;
  /** 测试结束时间 */
  endTime: number;
  /** 总测试时间（毫秒） */
  totalTestTime: number;
  /** 测试步骤 */
  steps: ImprovedTokenProbeStep[];
  /** 成功率 */
  successRate: number;
  /** 平均响应时间 */
  averageResponseTime: number;
  /** 总成本 */
  totalCost: number;
  /** 精度评估 */
  precisionAssessment: {
    /** 是否达到精度要求 */
    isPrecise: boolean;
    /** 精度百分比 */
    precisionPercentage: number;
    /** 置信区间 */
    confidenceInterval: { min: number; max: number };
  };
  /** 性能指标 */
  performanceMetrics: {
    /** 吞吐量（tokens/秒） */
    throughput: number;
    /** 延迟分布 */
    latencyDistribution: { p50: number; p90: number; p95: number; p99: number };
    /** 错误率 */
    errorRate: number;
  };
}

/**
 * 改进的Token Probe类
 */
export class ImprovedTokenProbe {
  private tokenCalculator: TokenCalculator;
  private llmMonitor: LLMMonitor;
  private copilotAPI: CopilotChatAPI;
  
  // 更新的模型配置
  private static readonly IMPROVED_MODELS: Record<string, ImprovedModelConfig> = {
    'gpt-4': {
      name: 'gpt-4',
      displayName: 'GPT-4',
      maxContextLength: 8192,
      maxOutputLength: 4096,
      costMultiplier: 1.0,
      inputTokenPrice: 0.03,
      outputTokenPrice: 0.06,
      supportsPreciseTokenization: true,
      encoding: 'cl100k_base'
    },
    'gpt-4-32k': {
      name: 'gpt-4-32k',
      displayName: 'GPT-4 32K',
      maxContextLength: 32768,
      maxOutputLength: 4096,
      costMultiplier: 2.0,
      inputTokenPrice: 0.06,
      outputTokenPrice: 0.12,
      supportsPreciseTokenization: true,
      encoding: 'cl100k_base'
    },
    'gpt-4-turbo': {
      name: 'gpt-4-turbo',
      displayName: 'GPT-4 Turbo',
      maxContextLength: 128000,
      maxOutputLength: 4096,
      costMultiplier: 0.5,
      inputTokenPrice: 0.01,
      outputTokenPrice: 0.03,
      supportsPreciseTokenization: true,
      encoding: 'cl100k_base'
    },
    'gpt-4.1': {
      name: 'gpt-4.1',
      displayName: 'GPT-4.1',
      maxContextLength: 200000,
      maxOutputLength: 8192,
      costMultiplier: 0.3,
      inputTokenPrice: 0.005,
      outputTokenPrice: 0.015,
      supportsPreciseTokenization: true,
      encoding: 'cl100k_base'
    },
    'gpt-5-mini': {
      name: 'gpt-5-mini',
      displayName: 'GPT-5 Mini',
      maxContextLength: 128000,
      maxOutputLength: 16384,
      costMultiplier: 0.1,
      inputTokenPrice: 0.0015,
      outputTokenPrice: 0.006,
      supportsPreciseTokenization: true,
      encoding: 'cl100k_base'
    },
    'gpt-5': {
      name: 'gpt-5',
      displayName: 'GPT-5',
      maxContextLength: 1000000,
      maxOutputLength: 32768,
      costMultiplier: 1.5,
      inputTokenPrice: 0.01,
      outputTokenPrice: 0.03,
      supportsPreciseTokenization: true,
      encoding: 'cl100k_base'
    },
    'claude-3-sonnet': {
      name: 'claude-3-sonnet',
      displayName: 'Claude 3 Sonnet',
      maxContextLength: 200000,
      maxOutputLength: 4096,
      costMultiplier: 0.8,
      inputTokenPrice: 0.003,
      outputTokenPrice: 0.015,
      supportsPreciseTokenization: false,
      encoding: 'claude'
    },
    'claude-sonnet-4': {
      name: 'claude-sonnet-4',
      displayName: 'Claude Sonnet 4',
      maxContextLength: 500000,
      maxOutputLength: 8192,
      costMultiplier: 1.2,
      inputTokenPrice: 0.005,
      outputTokenPrice: 0.025,
      supportsPreciseTokenization: false,
      encoding: 'claude'
    }
  };
  
  constructor() {
    this.tokenCalculator = TokenCalculator.getInstance();
    this.llmMonitor = LLMMonitor.getInstance();
    this.copilotAPI = CopilotChatAPI.getInstance();
  }
  
  /**
   * 执行改进的token探测
   */
  async runImprovedProbe(config: ImprovedTokenProbeConfig): Promise<ImprovedTokenProbeResult> {
    const modelConfig = ImprovedTokenProbe.IMPROVED_MODELS[config.model];
    if (!modelConfig) {
      throw new Error(`不支持的模型: ${config.model}`);
    }
    
    const channel = outputManager.getTokenProbeChannel();
    channel.show();
    channel.appendLine(`开始改进的Token Probe测试`);
    channel.appendLine(`模型: ${modelConfig.displayName}`);
    channel.appendLine(`测试模式: ${config.testMode}`);
    channel.appendLine(`包含输出token: ${config.includeOutputTokens}`);
    channel.appendLine('='.repeat(50));
    
    const startTime = Date.now();
    const steps: ImprovedTokenProbeStep[] = [];
    
    try {
      // 初始化API
      await this.copilotAPI.initialize();
      
      // 根据测试模式执行不同的测试策略
      let actualMaxTokens: number;
      
      switch (config.testMode) {
        case 'binary_search':
          actualMaxTokens = await this.binarySearchTest(config, modelConfig, steps);
          break;
        case 'linear_search':
          actualMaxTokens = await this.linearSearchTest(config, modelConfig, steps);
          break;
        case 'adaptive':
          actualMaxTokens = await this.adaptiveSearchTest(config, modelConfig, steps);
          break;
        default:
          throw new Error(`不支持的测试模式: ${config.testMode}`);
      }
      
      const endTime = Date.now();
      const totalTestTime = endTime - startTime;
      
      // 计算统计信息
      const successfulSteps = steps.filter(step => step.result === 'success');
      const successRate = steps.length > 0 ? (successfulSteps.length / steps.length) * 100 : 0;
      const averageResponseTime = steps.length > 0 
        ? steps.reduce((sum, step) => sum + step.responseTime, 0) / steps.length 
        : 0;
      const totalCost = steps.reduce((sum, step) => sum + step.estimatedCost, 0);
      
      // 精度评估
      const precisionAssessment = this.assessPrecision(actualMaxTokens, modelConfig.maxContextLength, config.precisionThreshold);
      
      // 性能指标
      const performanceMetrics = this.calculatePerformanceMetrics(steps);
      
      const result: ImprovedTokenProbeResult = {
        model: config.model,
        maxContextLength: modelConfig.maxContextLength,
        actualMaxTokens,
        startTime,
        endTime,
        totalTestTime,
        steps,
        successRate,
        averageResponseTime,
        totalCost,
        precisionAssessment,
        performanceMetrics
      };
      
      const channel = outputManager.getTokenProbeChannel();
      channel.appendLine('\n' + '='.repeat(50));
      channel.appendLine('测试完成!');
      channel.appendLine(`实际最大token数: ${actualMaxTokens}`);
      channel.appendLine(`成功率: ${successRate.toFixed(1)}%`);
      channel.appendLine(`平均响应时间: ${averageResponseTime.toFixed(0)}ms`);
      channel.appendLine(`总成本: $${totalCost.toFixed(4)}`);
      channel.appendLine(`精度: ${precisionAssessment.precisionPercentage.toFixed(1)}%`);
      
      return result;
      
    } catch (error) {
      outputManager.getTokenProbeChannel().appendLine(`\n错误: ${error}`);
      throw error;
    }
  }
  
  /**
   * 二分搜索测试
   */
  private async binarySearchTest(
    config: ImprovedTokenProbeConfig,
    modelConfig: ImprovedModelConfig,
    steps: ImprovedTokenProbeStep[]
  ): Promise<number> {
    let low = config.minTestLength;
    let high = Math.min(config.maxTestLength, modelConfig.maxContextLength);
    let lastSuccessfulTokens = 0;
    let consecutiveFailures = 0;
    
    outputManager.getTokenProbeChannel().appendLine(`二分搜索范围: ${low} - ${high} tokens`);
    
    while (low <= high && consecutiveFailures < 3 && steps.length < config.maxAttempts) {
      const mid = Math.floor((low + high) / 2);
      
      const channel = outputManager.getTokenProbeChannel();
      channel.appendLine(`\n测试 ${mid} tokens...`);
      
      const stepResult = await this.performSingleTest(mid, config, modelConfig, steps.length + 1);
      steps.push(stepResult);
      
      if (stepResult.result === 'success') {
        lastSuccessfulTokens = mid;
        low = mid + 1;
        consecutiveFailures = 0;
        channel.appendLine(`✓ 成功 (${stepResult.responseTime}ms)`);
      } else {
        high = mid - 1;
        consecutiveFailures++;
        channel.appendLine(`✗ 失败: ${stepResult.errorMessage}`);
      }
      
      // 如果达到精度要求，提前结束
      if (high - low < config.precisionThreshold) {
        break;
      }
    }
    
    return lastSuccessfulTokens;
  }
  
  /**
   * 线性搜索测试
   */
  private async linearSearchTest(
    config: ImprovedTokenProbeConfig,
    modelConfig: ImprovedModelConfig,
    steps: ImprovedTokenProbeStep[]
  ): Promise<number> {
    let currentTokens = config.minTestLength;
    let lastSuccessfulTokens = 0;
    let consecutiveFailures = 0;
    
    const channel = outputManager.getTokenProbeChannel();
    channel.appendLine(`线性搜索，步长: ${config.stepSize}`);
    
    while (currentTokens <= config.maxTestLength && 
           consecutiveFailures < 3 && 
           steps.length < config.maxAttempts) {
      
      channel.appendLine(`\n测试 ${currentTokens} tokens...`);
      
      const stepResult = await this.performSingleTest(currentTokens, config, modelConfig, steps.length + 1);
      steps.push(stepResult);
      
      if (stepResult.result === 'success') {
        lastSuccessfulTokens = currentTokens;
        consecutiveFailures = 0;
        channel.appendLine(`✓ 成功 (${stepResult.responseTime}ms)`);
      } else {
        consecutiveFailures++;
        channel.appendLine(`✗ 失败: ${stepResult.errorMessage}`);
        
        if (consecutiveFailures >= 2) {
          break; // 连续失败，停止测试
        }
      }
      
      currentTokens += config.stepSize;
    }
    
    return lastSuccessfulTokens;
  }
  
  /**
   * 自适应搜索测试
   */
  private async adaptiveSearchTest(
    config: ImprovedTokenProbeConfig,
    modelConfig: ImprovedModelConfig,
    steps: ImprovedTokenProbeStep[]
  ): Promise<number> {
    // 先进行快速二分搜索找到大致范围
    const roughResult = await this.binarySearchTest(
      { ...config, precisionThreshold: config.precisionThreshold * 10 },
      modelConfig,
      steps
    );
    
    // 然后在附近进行精细搜索
    const fineSearchRange = Math.max(1000, config.precisionThreshold * 2);
    const fineConfig = {
      ...config,
      minTestLength: Math.max(config.minTestLength, roughResult - fineSearchRange),
      maxTestLength: Math.min(config.maxTestLength, roughResult + fineSearchRange),
      stepSize: Math.max(1, config.stepSize / 10)
    };
    
    outputManager.getTokenProbeChannel().appendLine(`\n开始精细搜索，范围: ${fineConfig.minTestLength} - ${fineConfig.maxTestLength}`);
    
    return await this.linearSearchTest(fineConfig, modelConfig, steps);
  }
  
  /**
   * 执行单次测试
   */
  private async performSingleTest(
    targetTokens: number,
    config: ImprovedTokenProbeConfig,
    modelConfig: ImprovedModelConfig,
    stepNumber: number
  ): Promise<ImprovedTokenProbeStep> {
    const startTime = Date.now();
    
    try {
      // 生成测试内容
      const testContent = await this.generatePreciseTestContent(targetTokens, config, modelConfig);
      
      // 精确计算输入token数
      const inputTokenCount = this.tokenCalculator.calculateTokens(
         testContent,
         modelConfig.encoding as SupportedModel || 'gpt-4'
       );
      
      // 计算预期输出token数
      const expectedOutputTokens = config.includeOutputTokens ? config.testOutputLength : 0;
      const totalTokens = inputTokenCount + expectedOutputTokens;
      
      // 记录LLM调用开始
      const messages: ChatMessage[] = [{
        role: 'user',
        content: testContent
      }];
      const callId = this.llmMonitor.startCall(config.model, messages, 'improved-token-probe');
      
      // 发送请求
      const request: CopilotChatRequest = {
        messages: [
          {
            role: 'user',
            content: testContent
          }
        ],
        model: config.model,
        max_tokens: expectedOutputTokens,
        temperature: 0.1
      };
      
      const response = await this.copilotAPI.sendRequest(request);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // 计算实际输出token数
      let actualOutputTokens = 0;
      if (response.choices && response.choices.length > 0) {
        const outputContent = response.choices[0].message?.content || '';
        actualOutputTokens = this.tokenCalculator.calculateTokens(
           outputContent,
           modelConfig.encoding as SupportedModel || 'gpt-4'
         );
      }
      
      // 记录LLM调用结束
      const responseContent = response.choices?.[0]?.message?.content || '';
      this.llmMonitor.endCall(callId, responseContent, 'success');
      
      // 计算成本
      const inputCost = (inputTokenCount / 1000) * modelConfig.inputTokenPrice;
      const outputCost = (actualOutputTokens / 1000) * modelConfig.outputTokenPrice;
      const estimatedCost = inputCost + outputCost;
      
      return {
        stepNumber,
        inputTokenCount: inputTokenCount,
        expectedOutputTokenCount: expectedOutputTokens,
        totalTokenCount: totalTokens,
        contentLength: testContent.length,
        result: 'success',
        responseTime,
        actualOutputTokenCount: actualOutputTokens,
        estimatedCost,
        timestamp: startTime
      };
      
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // 估算token数（用于失败情况）
      const estimatedTokens = Math.floor(targetTokens * 0.9); // 保守估计
      const estimatedCost = (estimatedTokens / 1000) * modelConfig.inputTokenPrice;
      
      return {
        stepNumber,
        inputTokenCount: estimatedTokens,
        expectedOutputTokenCount: config.includeOutputTokens ? config.testOutputLength : 0,
        totalTokenCount: estimatedTokens + (config.includeOutputTokens ? config.testOutputLength : 0),
        contentLength: targetTokens * 3, // 估算字符数
        result: this.isTokenLimitError(error) ? 'failure' : 'error',
        responseTime,
        errorMessage: error instanceof Error ? error.message : String(error),
        estimatedCost,
        timestamp: startTime
      };
    }
  }
  
  /**
   * 生成精确的测试内容
   */
  private async generatePreciseTestContent(
    targetTokens: number,
    config: ImprovedTokenProbeConfig,
    modelConfig: ImprovedModelConfig
  ): Promise<string> {
    let content = '';
    
    // 添加项目上下文（如果需要）
    if (config.includeProjectContext) {
      const projectSummary = await this.generateProjectSummary();
      content += projectSummary + '\n\n';
    }
    
    // 添加系统提示
    content += '请分析以下内容并提供详细的技术总结：\n\n';
    
    // 计算当前token数
    let currentTokenCount = this.tokenCalculator.calculateTokens(
       content,
       modelConfig.encoding as SupportedModel || 'gpt-4'
     );
    
    // 生成填充内容以达到目标token数
    const remainingTokens = targetTokens - currentTokenCount;
    if (remainingTokens > 0) {
      const paddingContent = this.generateStructuredPadding(remainingTokens);
      content += paddingContent;
    }
    
    // 最终验证token数
    const finalTokenCount = this.tokenCalculator.calculateTokens(
       content,
       modelConfig.encoding as SupportedModel || 'gpt-4'
     );
    
    // 如果超出目标，进行微调
    if (finalTokenCount > targetTokens) {
      const excess = finalTokenCount - targetTokens;
      const excessChars = Math.floor(excess * 3); // 估算需要删除的字符数
      content = content.substring(0, content.length - excessChars);
    }
    
    return content;
  }
  
  /**
   * 生成结构化填充内容
   */
  private generateStructuredPadding(tokenCount: number): string {
    const sections = [
      '技术架构分析',
      '代码质量评估',
      '性能优化建议',
      '安全性审查',
      '可维护性分析',
      '扩展性评估'
    ];
    
    let padding = '';
    const tokensPerSection = Math.floor(tokenCount / sections.length);
    
    for (const section of sections) {
      padding += `\n## ${section}\n\n`;
      
      // 生成该部分的内容
      const sectionContent = this.generateSectionContent(tokensPerSection);
      padding += sectionContent;
    }
    
    return padding;
  }
  
  /**
   * 生成章节内容
   */
  private generateSectionContent(targetTokens: number): string {
    const sentences = [
      '这是一个重要的技术分析点，需要详细考虑各种因素和影响。',
      '在实际开发过程中，我们需要平衡性能、可维护性和开发效率。',
      '通过采用最佳实践和现代化的开发方法，可以显著提升项目质量。',
      '持续集成和持续部署是现代软件开发的重要组成部分。',
      '代码审查和自动化测试有助于确保代码质量和系统稳定性。',
      '架构设计应该考虑未来的扩展需求和技术演进趋势。'
    ];
    
    let content = '';
    const estimatedTokensPerSentence = 20; // 估算每句话的token数
    const targetSentences = Math.floor(targetTokens / estimatedTokensPerSentence);
    
    for (let i = 0; i < targetSentences; i++) {
      const sentence = sentences[i % sentences.length];
      content += sentence + ' ';
      
      if ((i + 1) % 3 === 0) {
        content += '\n\n';
      }
    }
    
    return content;
  }
  
  /**
   * 生成项目摘要
   */
  private async generateProjectSummary(): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return '当前工作区：无活动项目';
    }
    
    const projectPath = workspaceFolders[0].uri.fsPath;
    const projectName = workspaceFolders[0].name;
    
    return `项目分析报告\n` +
           `项目名称: ${projectName}\n` +
           `项目路径: ${projectPath}\n` +
           `分析时间: ${new Date().toLocaleString()}\n` +
           `\n这是一个详细的项目技术分析，包含代码结构、架构设计、性能评估等多个维度的深入分析。`;
  }
  
  /**
   * 判断是否为token限制错误
   */
  private isTokenLimitError(error: any): boolean {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const tokenLimitKeywords = [
      'token limit',
      'context length',
      'maximum context',
      'too many tokens',
      'context_length_exceeded',
      'max_tokens'
    ];
    
    return tokenLimitKeywords.some(keyword => errorMessage.includes(keyword));
  }
  
  /**
   * 评估精度
   */
  private assessPrecision(
    actualMaxTokens: number,
    expectedMaxTokens: number,
    threshold: number
  ): { isPrecise: boolean; precisionPercentage: number; confidenceInterval: { min: number; max: number } } {
    const difference = Math.abs(actualMaxTokens - expectedMaxTokens);
    const precisionPercentage = Math.max(0, 100 - (difference / expectedMaxTokens) * 100);
    const isPrecise = difference <= threshold;
    
    const confidenceInterval = {
      min: actualMaxTokens - threshold,
      max: actualMaxTokens + threshold
    };
    
    return {
      isPrecise,
      precisionPercentage,
      confidenceInterval
    };
  }
  
  /**
   * 计算性能指标
   */
  private calculatePerformanceMetrics(steps: ImprovedTokenProbeStep[]): {
    throughput: number;
    latencyDistribution: { p50: number; p90: number; p95: number; p99: number };
    errorRate: number;
  } {
    const successfulSteps = steps.filter(step => step.result === 'success');
    const responseTimes = steps.map(step => step.responseTime).sort((a, b) => a - b);
    
    // 计算吞吐量（tokens/秒）
    const totalTokens = successfulSteps.reduce((sum, step) => sum + step.totalTokenCount, 0);
    const totalTime = steps.reduce((sum, step) => sum + step.responseTime, 0) / 1000; // 转换为秒
    const throughput = totalTime > 0 ? totalTokens / totalTime : 0;
    
    // 计算延迟分布
    const getPercentile = (arr: number[], percentile: number) => {
      const index = Math.ceil((percentile / 100) * arr.length) - 1;
      return arr[Math.max(0, index)] || 0;
    };
    
    const latencyDistribution = {
      p50: getPercentile(responseTimes, 50),
      p90: getPercentile(responseTimes, 90),
      p95: getPercentile(responseTimes, 95),
      p99: getPercentile(responseTimes, 99)
    };
    
    // 计算错误率
    const errorSteps = steps.filter(step => step.result === 'error');
    const errorRate = steps.length > 0 ? (errorSteps.length / steps.length) * 100 : 0;
    
    return {
      throughput,
      latencyDistribution,
      errorRate
    };
  }
  
  /**
   * 获取支持的模型列表
   */
  static getSupportedModels(): ImprovedModelConfig[] {
    return Object.values(ImprovedTokenProbe.IMPROVED_MODELS);
  }
  
  /**
   * 获取模型配置
   */
  static getModelConfig(modelName: string): ImprovedModelConfig | undefined {
    return ImprovedTokenProbe.IMPROVED_MODELS[modelName];
  }
}

/**
 * 创建改进的Token Probe实例
 */
export function createImprovedTokenProbe(): ImprovedTokenProbe {
  return new ImprovedTokenProbe();
}