import * as vscode from 'vscode';
import { TokenCalculator, SupportedModel, ChatMessage } from '../utils/token-calculator';
import { outputManager } from '../utils/output-manager';

/**
 * LLM调用记录接口
 */
export interface LLMCallRecord {
  /** 唯一ID */
  id: string;
  /** 时间戳 */
  timestamp: number;
  /** 模型名称 */
  model: string;
  /** 请求token数 */
  inputTokens: number;
  /** 响应token数 */
  outputTokens: number;
  /** 总token数 */
  totalTokens: number;
  /** 成本（美元） */
  cost: number;
  /** 响应时间（毫秒） */
  responseTime: number;
  /** 请求状态 */
  status: 'success' | 'failed' | 'timeout';
  /** 错误信息 */
  error?: string;
  /** 请求内容摘要 */
  requestSummary: string;
  /** 响应内容摘要 */
  responseSummary?: string;
  /** 调用来源 */
  source: string;
}

/**
 * 模型定价配置
 */
export interface ModelPricing {
  /** 输入token价格（每1K token） */
  inputPrice: number;
  /** 输出token价格（每1K token） */
  outputPrice: number;
  /** 货币单位 */
  currency: 'USD';
}

/**
 * 统计数据接口
 */
export interface LLMUsageStats {
  /** 总调用次数 */
  totalCalls: number;
  /** 成功调用次数 */
  successfulCalls: number;
  /** 失败调用次数 */
  failedCalls: number;
  /** 总输入token数 */
  totalInputTokens: number;
  /** 总输出token数 */
  totalOutputTokens: number;
  /** 总token数 */
  totalTokens: number;
  /** 总成本 */
  totalCost: number;
  /** 平均响应时间 */
  averageResponseTime: number;
  /** 按模型分组的统计 */
  byModel: Record<string, Omit<LLMUsageStats, 'byModel'>>;
  /** 时间范围 */
  timeRange: {
    start: number;
    end: number;
  };
}

/**
 * LLM监控器
 */
export class LLMMonitor {
  private static instance: LLMMonitor;
  private records: LLMCallRecord[] = [];
  private tokenCalculator: TokenCalculator;
  private statusBarItem: vscode.StatusBarItem;

  // 模型定价配置（基于2024年最新定价）
  private modelPricing: Record<string, ModelPricing> = {
    'gpt-4': { inputPrice: 0.03, outputPrice: 0.06, currency: 'USD' },
    'gpt-4-32k': { inputPrice: 0.06, outputPrice: 0.12, currency: 'USD' },
    'gpt-4-turbo': { inputPrice: 0.01, outputPrice: 0.03, currency: 'USD' },
    'gpt-4o': { inputPrice: 0.005, outputPrice: 0.015, currency: 'USD' },
    'gpt-4.1': { inputPrice: 0.005, outputPrice: 0.015, currency: 'USD' },
    'gpt-3.5-turbo': { inputPrice: 0.001, outputPrice: 0.002, currency: 'USD' },
    'gpt-3.5-turbo-16k': { inputPrice: 0.003, outputPrice: 0.004, currency: 'USD' },
    'claude-3-sonnet': { inputPrice: 0.003, outputPrice: 0.015, currency: 'USD' },
    'claude-3-haiku': { inputPrice: 0.00025, outputPrice: 0.00125, currency: 'USD' },
    'claude-sonnet-3.5': { inputPrice: 0.003, outputPrice: 0.015, currency: 'USD' },
    'claude-sonnet-3.7': { inputPrice: 0.003, outputPrice: 0.015, currency: 'USD' },
    'claude-sonnet-4': { inputPrice: 0.005, outputPrice: 0.025, currency: 'USD' },
  };

  private constructor() {
    this.tokenCalculator = TokenCalculator.getInstance();
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'ai-agent.showLLMStats';
    this.updateStatusBar();
    this.statusBarItem.show();
  }

  static getInstance(): LLMMonitor {
    if (!LLMMonitor.instance) {
      LLMMonitor.instance = new LLMMonitor();
    }
    return LLMMonitor.instance;
  }

  /**
   * 记录LLM调用开始
   */
  startCall(model: string, messages: ChatMessage[], source: string = 'unknown'): string {
    const id = this.generateId();
    const inputTokens = this.tokenCalculator.calculateChatTokens(
      messages,
      model as SupportedModel
    ).totalTokens;

    const record: LLMCallRecord = {
      id,
      timestamp: Date.now(),
      model,
      inputTokens,
      outputTokens: 0,
      totalTokens: inputTokens,
      cost: 0,
      responseTime: 0,
      status: 'success',
      requestSummary: this.createRequestSummary(messages),
      source,
    };

    this.records.push(record);
    this.logCall('START', record);

    return id;
  }

  /**
   * 记录LLM调用完成
   */
  endCall(
    id: string,
    response: string,
    status: 'success' | 'failed' | 'timeout' = 'success',
    error?: string
  ): void {
    const record = this.records.find(r => r.id === id);
    if (!record) {
      outputManager.logWarning(`LLM调用记录未找到: ${id}`);
      return;
    }

    const responseTime = Date.now() - record.timestamp;
    const outputTokens = response
      ? this.tokenCalculator.calculateTokens(response, record.model as SupportedModel)
      : 0;
    const totalTokens = record.inputTokens + outputTokens;
    const cost = this.calculateCost(record.model, record.inputTokens, outputTokens);

    // 更新记录
    record.outputTokens = outputTokens;
    record.totalTokens = totalTokens;
    record.cost = cost;
    record.responseTime = responseTime;
    record.status = status;
    record.error = error;
    record.responseSummary = response ? this.createResponseSummary(response) : undefined;

    this.logCall('END', record);
    this.updateStatusBar();
  }

  /**
   * 获取使用统计
   */
  getUsageStats(timeRangeHours: number = 24): LLMUsageStats {
    const now = Date.now();
    const startTime = now - timeRangeHours * 60 * 60 * 1000;

    const filteredRecords = this.records.filter(r => r.timestamp >= startTime);

    const stats: LLMUsageStats = {
      totalCalls: filteredRecords.length,
      successfulCalls: filteredRecords.filter(r => r.status === 'success').length,
      failedCalls: filteredRecords.filter(r => r.status === 'failed').length,
      totalInputTokens: filteredRecords.reduce((sum, r) => sum + r.inputTokens, 0),
      totalOutputTokens: filteredRecords.reduce((sum, r) => sum + r.outputTokens, 0),
      totalTokens: filteredRecords.reduce((sum, r) => sum + r.totalTokens, 0),
      totalCost: filteredRecords.reduce((sum, r) => sum + r.cost, 0),
      averageResponseTime:
        filteredRecords.length > 0
          ? filteredRecords.reduce((sum, r) => sum + r.responseTime, 0) / filteredRecords.length
          : 0,
      byModel: {},
      timeRange: { start: startTime, end: now },
    };

    // 按模型分组统计
    const modelGroups = this.groupBy(filteredRecords, 'model');
    for (const [model, records] of Object.entries(modelGroups)) {
      stats.byModel[model] = {
        totalCalls: records.length,
        successfulCalls: records.filter(r => r.status === 'success').length,
        failedCalls: records.filter(r => r.status === 'failed').length,
        totalInputTokens: records.reduce((sum, r) => sum + r.inputTokens, 0),
        totalOutputTokens: records.reduce((sum, r) => sum + r.outputTokens, 0),
        totalTokens: records.reduce((sum, r) => sum + r.totalTokens, 0),
        totalCost: records.reduce((sum, r) => sum + r.cost, 0),
        averageResponseTime:
          records.length > 0
            ? records.reduce((sum, r) => sum + r.responseTime, 0) / records.length
            : 0,
        timeRange: { start: startTime, end: now },
      };
    }

    return stats;
  }

  /**
   * 生成详细报告
   */
  generateReport(timeRangeHours: number = 24): string {
    const stats = this.getUsageStats(timeRangeHours);

    let report = `# LLM使用报告\n\n`;
    report += `**时间范围**: ${new Date(stats.timeRange.start).toLocaleString()} - ${new Date(stats.timeRange.end).toLocaleString()}\n\n`;

    report += `## 总体统计\n`;
    report += `- 总调用次数: ${stats.totalCalls}\n`;
    report += `- 成功率: ${stats.totalCalls > 0 ? ((stats.successfulCalls / stats.totalCalls) * 100).toFixed(1) : 0}%\n`;
    report += `- 总Token数: ${stats.totalTokens.toLocaleString()}\n`;
    report += `- 输入Token: ${stats.totalInputTokens.toLocaleString()}\n`;
    report += `- 输出Token: ${stats.totalOutputTokens.toLocaleString()}\n`;
    report += `- 总成本: $${stats.totalCost.toFixed(4)}\n`;
    report += `- 平均响应时间: ${stats.averageResponseTime.toFixed(0)}ms\n\n`;

    report += `## 按模型统计\n`;
    for (const [model, modelStats] of Object.entries(stats.byModel)) {
      report += `### ${model}\n`;
      report += `- 调用次数: ${modelStats.totalCalls}\n`;
      report += `- 成功率: ${modelStats.totalCalls > 0 ? ((modelStats.successfulCalls / modelStats.totalCalls) * 100).toFixed(1) : 0}%\n`;
      report += `- Token数: ${modelStats.totalTokens.toLocaleString()}\n`;
      report += `- 成本: $${modelStats.totalCost.toFixed(4)}\n`;
      report += `- 平均响应时间: ${modelStats.averageResponseTime.toFixed(0)}ms\n\n`;
    }

    return report;
  }

  /**
   * 显示统计信息
   */
  showStats(): void {
    const report = this.generateReport();
    const channel = outputManager.getLLMMonitorChannel();
    channel.clear();
    channel.appendLine(report);
    channel.show();
  }

  /**
   * 清理历史记录
   */
  clearHistory(olderThanHours: number = 168): void {
    // 默认清理7天前的记录
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    this.records = this.records.filter(r => r.timestamp >= cutoffTime);
    this.updateStatusBar();
  }

  /**
   * 计算成本
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.modelPricing[model];
    if (!pricing) {
      return 0; // 未知模型，假设免费
    }

    const inputCost = (inputTokens / 1000) * pricing.inputPrice;
    const outputCost = (outputTokens / 1000) * pricing.outputPrice;

    return inputCost + outputCost;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 创建请求摘要
   */
  private createRequestSummary(messages: ChatMessage[]): string {
    if (messages.length === 0) return '空请求';

    const lastMessage = messages[messages.length - 1];
    const preview = lastMessage.content.substring(0, 100);
    return `${lastMessage.role}: ${preview}${lastMessage.content.length > 100 ? '...' : ''}`;
  }

  /**
   * 创建响应摘要
   */
  private createResponseSummary(response: string): string {
    const preview = response.substring(0, 100);
    return `${preview}${response.length > 100 ? '...' : ''}`;
  }

  /**
   * 记录调用日志
   */
  private logCall(type: 'START' | 'END', record: LLMCallRecord): void {
    const timestamp = new Date(record.timestamp).toLocaleTimeString();
    const channel = outputManager.getLLMMonitorChannel();

    if (type === 'START') {
      channel.appendLine(
        `[${timestamp}] START ${record.model} | Input: ${record.inputTokens} tokens | Source: ${record.source}`
      );
    } else {
      channel.appendLine(
        `[${timestamp}] END ${record.model} | Total: ${record.totalTokens} tokens | Cost: $${record.cost.toFixed(4)} | Time: ${record.responseTime}ms | Status: ${record.status}`
      );
      if (record.error) {
        channel.appendLine(`  Error: ${record.error}`);
      }
    }
  }

  /**
   * 更新状态栏
   */
  private updateStatusBar(): void {
    const stats = this.getUsageStats(24);
    const costText = stats.totalCost > 0 ? ` $${stats.totalCost.toFixed(3)}` : '';
    this.statusBarItem.text = `$(pulse) LLM: ${stats.totalCalls}${costText}`;
    this.statusBarItem.tooltip = `LLM调用统计\n调用次数: ${stats.totalCalls}\nToken数: ${stats.totalTokens.toLocaleString()}\n成本: $${stats.totalCost.toFixed(4)}`;
  }

  /**
   * 按字段分组
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce(
      (groups, item) => {
        const group = String(item[key]);
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
      },
      {} as Record<string, T[]>
    );
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.statusBarItem.dispose();
    this.tokenCalculator.clearCache();
  }
}

/**
 * 获取LLM监控器实例
 */
export function getLLMMonitor(): LLMMonitor {
  return LLMMonitor.getInstance();
}
