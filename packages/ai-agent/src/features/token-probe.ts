import * as vscode from 'vscode';
import { OptimizedSelfProjectScanAgent } from '../agents/OptimizedSelfProjectScanAgent';
import { getCopilotChatAPI } from '../integrations/copilot-chat-api';
import { outputManager } from '../utils/output-manager';
import { calculateTokens } from '../utils/token-calculator';

/**
 * GitHub Copilot Chat 支持的模型列表
 */
export const COPILOT_MODELS = {
  'gpt-4.1': {
    name: 'GPT-4.1',
    description: '最新的GPT-4模型，支持长上下文',
    maxTokens: 128000,
    costMultiplier: 0, // 免费
    provider: 'OpenAI',
    isPreview: false,
    isLegacy: false,
  },
  'gpt-4o': {
    name: 'GPT-4o',
    description: 'GPT-4 Omni模型，多模态能力',
    maxTokens: 128000,
    costMultiplier: 0, // 免费
    provider: 'OpenAI',
    isPreview: false,
    isLegacy: false,
  },
  'gpt-4': {
    name: 'GPT-4',
    description: '高质量的GPT-4模型',
    maxTokens: 8192,
    costMultiplier: 1,
    provider: 'OpenAI',
    isPreview: false,
    isLegacy: true,
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    description: '快速且经济的模型',
    maxTokens: 4096,
    costMultiplier: 0.33,
    provider: 'OpenAI',
    isPreview: false,
    isLegacy: true,
  },
  'claude-3-sonnet': {
    name: 'Claude 3 Sonnet',
    description: 'Anthropic的平衡模型',
    maxTokens: 200000,
    costMultiplier: 1,
    provider: 'Anthropic',
    isPreview: true,
    isLegacy: false,
  },
  'claude-3-haiku': {
    name: 'Claude 3 Haiku',
    description: 'Anthropic的快速模型',
    maxTokens: 200000,
    costMultiplier: 0.33,
    provider: 'Anthropic',
    isPreview: true,
    isLegacy: false,
  },
} as const;

export type CopilotModel = keyof typeof COPILOT_MODELS;

/**
 * Token Probe 配置接口
 */
export interface TokenProbeConfig {
  /** 使用的模型 */
  model: CopilotModel;
  /** 起始Token数 */
  startTokens: number;
  /** 最大Token数 */
  maxTokens: number;
  /** 步长 */
  stepSize: number;
  /** 是否启用二分法搜索 */
  enableBinarySearch: boolean;
  /** 超时时间(毫秒) */
  timeout: number;
  /** 重试次数 */
  retryCount: number;
}

/**
 * Token Probe 测试结果
 */
export interface TokenProbeResult {
  /** 测试配置 */
  config: TokenProbeConfig;
  /** 测试开始时间 */
  startTime: Date;
  /** 测试结束时间 */
  endTime: Date;
  /** 测试持续时间(毫秒) */
  duration: number;
  /** 最大成功Token数 */
  maxSuccessTokens: number;
  /** 最大内容长度 */
  maxContentLength: number;
  /** 测试步骤详情 */
  steps: TokenProbeStep[];
  /** 测试结果 */
  result: 'success' | 'failed' | 'error';
  /** 错误信息 */
  error?: string;
  /** 项目路径 */
  projectPath: string;
  /** 项目摘要 */
  projectSummary: string;
}

/**
 * Token Probe 测试步骤
 */
export interface TokenProbeStep {
  /** 步骤序号 */
  step: number;
  /** 测试的Token数 */
  tokens: number;
  /** 内容长度 */
  contentLength: number;
  /** 测试结果 */
  result: 'success' | 'failed' | 'error';
  /** 响应时间(毫秒) */
  responseTime: number;
  /** 错误信息 */
  error?: string;
  /** 测试方法 */
  method: 'linear' | 'binary';
}

/**
 * Token Probe 核心类
 */
export class TokenProbe {
  private config: TokenProbeConfig;
  private projectSummary: string = '';
  private basePrompt: string = '';

  constructor(config: Partial<TokenProbeConfig> = {}) {
    this.config = {
      model: 'gpt-4.1',
      startTokens: 10000,
      maxTokens: 200000,
      stepSize: 10000,
      enableBinarySearch: true,
      timeout: 30000,
      retryCount: 3,
      ...config,
    };
  }

  /**
   * 执行Token Probe测试
   */
  async probe(projectPath: string): Promise<TokenProbeResult> {
    const startTime = new Date();
    const steps: TokenProbeStep[] = [];
    let maxSuccessTokens = 0;
    let maxContentLength = 0;
    let result: 'success' | 'failed' | 'error' = 'failed';
    let error: string | undefined;

    try {
      // 生成项目摘要
      await this.generateProjectSummary(projectPath);

      // 准备基础提示词
      this.prepareBasePrompt();

      // 执行测试
      if (this.config.enableBinarySearch) {
        const binaryResult = await this.binarySearchTest(steps);
        maxSuccessTokens = binaryResult.maxTokens;
        maxContentLength = binaryResult.maxContentLength;
      } else {
        const linearResult = await this.linearSearchTest(steps);
        maxSuccessTokens = linearResult.maxTokens;
        maxContentLength = linearResult.maxContentLength;
      }

      result = maxSuccessTokens > 0 ? 'success' : 'failed';
    } catch (err) {
      result = 'error';
      error = err instanceof Error ? err.message : String(err);
      outputManager.logError('Token Probe测试失败', err as Error);
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    return {
      config: this.config,
      startTime,
      endTime,
      duration,
      maxSuccessTokens,
      maxContentLength,
      steps,
      result,
      error,
      projectPath,
      projectSummary: this.projectSummary,
    };
  }

  /**
   * 生成项目摘要
   */
  private async generateProjectSummary(projectPath: string): Promise<void> {
    try {
      const agent = new OptimizedSelfProjectScanAgent();
      const analysis = await agent.scanProject();
      this.projectSummary = `项目路径: ${analysis.projectRoot}\n项目结构: ${analysis.structure.totalFiles}个文件\n核心组件: ${analysis.components.length}个`;
    } catch (error) {
      outputManager.logWarning('无法生成项目摘要，使用默认摘要');
      this.projectSummary = `项目路径: ${projectPath}\n这是一个软件开发项目。`;
    }
  }

  /**
   * 准备基础提示词
   */
  private prepareBasePrompt(): void {
    this.basePrompt = `请分析以下项目信息并提供建议：\n\n项目摘要：\n${this.projectSummary}\n\n`;
  }

  /**
   * 线性搜索测试
   */
  private async linearSearchTest(
    steps: TokenProbeStep[]
  ): Promise<{ maxTokens: number; maxContentLength: number }> {
    let maxTokens = 0;
    let maxContentLength = 0;
    let currentTokens = this.config.startTokens;
    let stepNumber = 1;

    while (currentTokens <= this.config.maxTokens) {
      const stepStartTime = Date.now();

      try {
        const testContent = await this.generateTestContent(currentTokens);
        const success = await this.testTokenLimit(testContent);
        const responseTime = Date.now() - stepStartTime;

        steps.push({
          step: stepNumber++,
          tokens: currentTokens,
          contentLength: testContent.length,
          result: success ? 'success' : 'failed',
          responseTime,
          method: 'linear',
        });

        if (success) {
          maxTokens = currentTokens;
          maxContentLength = testContent.length;
        } else {
          break;
        }
      } catch (error) {
        const responseTime = Date.now() - stepStartTime;
        steps.push({
          step: stepNumber++,
          tokens: currentTokens,
          contentLength: 0,
          result: 'error',
          responseTime,
          error: error instanceof Error ? error.message : String(error),
          method: 'linear',
        });
        break;
      }

      currentTokens += this.config.stepSize;
    }

    return { maxTokens, maxContentLength };
  }

  /**
   * 二分法搜索测试
   */
  private async binarySearchTest(
    steps: TokenProbeStep[]
  ): Promise<{ maxTokens: number; maxContentLength: number }> {
    let left = this.config.startTokens;
    let right = this.config.maxTokens;
    let maxTokens = 0;
    let maxContentLength = 0;
    let stepNumber = 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const stepStartTime = Date.now();

      try {
        const testContent = await this.generateTestContent(mid);
        const success = await this.testTokenLimit(testContent);
        const responseTime = Date.now() - stepStartTime;

        steps.push({
          step: stepNumber++,
          tokens: mid,
          contentLength: testContent.length,
          result: success ? 'success' : 'failed',
          responseTime,
          method: 'binary',
        });

        if (success) {
          maxTokens = mid;
          maxContentLength = testContent.length;
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      } catch (error) {
        const responseTime = Date.now() - stepStartTime;
        steps.push({
          step: stepNumber++,
          tokens: mid,
          contentLength: 0,
          result: 'error',
          responseTime,
          error: error instanceof Error ? error.message : String(error),
          method: 'binary',
        });
        right = mid - 1;
      }
    }

    return { maxTokens, maxContentLength };
  }

  /**
   * 生成指定token数量的测试内容
   */
  private async generateTestContent(targetTokens: number): Promise<string> {
    let content = this.basePrompt;

    // 计算当前内容的token数
    let currentTokens = await calculateTokens(content, this.config.model);

    // 如果需要更多token，添加填充内容
    if (currentTokens < targetTokens) {
      const paddingNeeded = targetTokens - currentTokens;
      const padding = this.generatePaddingContent(paddingNeeded);
      content += padding;
    }

    return content;
  }

  /**
   * 生成填充内容
   */
  private generatePaddingContent(tokenCount: number): string {
    // 估算每个字符大约对应1个token（粗略估算）
    const estimatedChars = tokenCount * 4; // 保守估计
    const paddingText = '这是用于测试Token限制的填充内容。';
    const repeatCount = Math.ceil(estimatedChars / paddingText.length);

    return '\n\n附加测试内容：\n' + paddingText.repeat(repeatCount);
  }

  /**
   * 测试token限制
   */
  private async testTokenLimit(content: string): Promise<boolean> {
    try {
      const api = await this.getCopilotChatApi();
      if (!api) {
        throw new Error('无法获取Copilot Chat API');
      }

      // 创建测试请求
      const request = {
        messages: [
          {
            role: 'user' as const,
            content: content,
          },
        ],
        model: this.config.model,
      };

      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), this.config.timeout);
      });

      // 发送请求
      const responsePromise = api.sendMessage(request);
      await Promise.race([responsePromise, timeoutPromise]);

      return true;
    } catch (error) {
      // 如果是token限制错误，返回false
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('token') ||
        errorMessage.includes('limit') ||
        errorMessage.includes('context')
      ) {
        return false;
      }
      // 其他错误重新抛出
      throw error;
    }
  }

  /**
   * 获取GitHub Copilot Chat API
   */
  private async getCopilotChatApi(): Promise<any> {
    try {
      return await getCopilotChatAPI();
    } catch (error) {
      throw new Error('无法连接到GitHub Copilot Chat API');
    }
  }

  /**
   * 生成测试报告
   */
  generateReport(result: TokenProbeResult): string {
    const lines = [
      '# Token Probe 测试报告',
      '',
      '## 📊 测试概览',
      `- **模型**: ${COPILOT_MODELS[result.config.model].name}`,
      `- **测试状态**: ${result.result === 'success' ? '✅ 成功' : result.result === 'failed' ? '❌ 失败' : '⚠️ 错误'}`,
      `- **最大Token数**: ${result.maxSuccessTokens.toLocaleString()}`,
      `- **最大内容长度**: ${result.maxContentLength.toLocaleString()} 字符`,
      `- **测试时长**: ${this.formatDuration(result.duration)}`,
      `- **测试步骤**: ${result.steps.length} 步`,
      '',
      '## ⚙️ 测试配置',
      `- **起始Token数**: ${result.config.startTokens.toLocaleString()}`,
      `- **最大Token数**: ${result.config.maxTokens.toLocaleString()}`,
      `- **步长**: ${result.config.stepSize.toLocaleString()}`,
      `- **搜索方法**: ${result.config.enableBinarySearch ? '二分法' : '线性搜索'}`,
      `- **超时时间**: ${result.config.timeout / 1000}秒`,
      `- **重试次数**: ${result.config.retryCount}`,
      '',
      '## 📈 测试步骤详情',
      '| 步骤 | Token数 | 内容长度 | 结果 | 响应时间 | 方法 |',
      '|------|---------|----------|------|----------|------|',
    ];

    result.steps.forEach(step => {
      const statusIcon = step.result === 'success' ? '✅' : step.result === 'failed' ? '❌' : '⚠️';
      lines.push(
        `| ${step.step} | ${step.tokens.toLocaleString()} | ${step.contentLength.toLocaleString()} | ${statusIcon} ${step.result} | ${step.responseTime}ms | ${step.method} |`
      );
    });

    if (result.error) {
      lines.push('', '## ❌ 错误信息', `\`\`\`\n${result.error}\n\`\`\``);
    }

    lines.push(
      '',
      '## 📋 项目信息',
      `**项目路径**: ${result.projectPath}`,
      '',
      '**项目摘要**:',
      '```',
      result.projectSummary,
      '```',
      '',
      '## 💡 建议',
      this.getTokenRange(result.maxSuccessTokens),
      '',
      `*报告生成时间: ${new Date().toLocaleString()}*`
    );

    return lines.join('\n');
  }

  /**
   * 格式化持续时间
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}毫秒`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}秒`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}分${seconds}秒`;
    }
  }

  /**
   * 获取Token范围描述
   */
  private getTokenRange(maxTokens: number): string {
    if (maxTokens === 0) {
      return '⚠️ 未能成功测试任何Token数量，建议检查网络连接和API配置。';
    } else if (maxTokens < 10000) {
      return '📝 适合处理简短的代码片段和基本查询。';
    } else if (maxTokens < 50000) {
      return '📄 适合处理中等规模的文档和代码文件。';
    } else if (maxTokens < 100000) {
      return '📚 适合处理大型文档和复杂的代码项目。';
    } else {
      return '🚀 支持超大规模的上下文，适合处理整个项目的分析任务。';
    }
  }
}

/**
 * Token Probe 管理器
 */
export class TokenProbeManager {
  private static instance: TokenProbeManager;
  private testHistory: TokenProbeResult[] = [];

  static getInstance(): TokenProbeManager {
    if (!TokenProbeManager.instance) {
      TokenProbeManager.instance = new TokenProbeManager();
    }
    return TokenProbeManager.instance;
  }

  /**
   * 执行Token Probe测试
   */
  async runProbe(config?: Partial<TokenProbeConfig>): Promise<TokenProbeResult> {
    const probe = new TokenProbe(config);
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('没有打开的工作区');
    }

    const projectPath = workspaceFolders[0].uri.fsPath;
    const result = await probe.probe(projectPath);

    // 保存到历史记录
    this.testHistory.push(result);

    return result;
  }

  /**
   * 获取测试历史
   */
  getTestHistory(): TokenProbeResult[] {
    return [...this.testHistory];
  }

  /**
   * 清除测试历史
   */
  clearHistory(): void {
    this.testHistory = [];
  }

  /**
   * 生成历史对比报告
   */
  generateHistoryReport(): string {
    if (this.testHistory.length === 0) {
      return '暂无测试历史记录。';
    }

    const lines = [
      '# Token Probe 历史报告',
      '',
      `总测试次数: ${this.testHistory.length}`,
      '',
      '## 测试历史',
      '| 时间 | 模型 | 最大Token数 | 结果 | 持续时间 |',
      '|------|------|-------------|------|----------|',
    ];

    this.testHistory.forEach((result, index) => {
      const statusIcon =
        result.result === 'success' ? '✅' : result.result === 'failed' ? '❌' : '⚠️';
      lines.push(
        `| ${result.startTime.toLocaleString()} | ${COPILOT_MODELS[result.config.model].name} | ${result.maxSuccessTokens.toLocaleString()} | ${statusIcon} | ${result.duration}ms |`
      );
    });

    return lines.join('\n');
  }
}
