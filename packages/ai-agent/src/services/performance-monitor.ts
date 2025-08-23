/**
 * 性能监控服务
 * 监控系统性能指标，提供性能优化建议
 */

import * as vscode from 'vscode';
import { outputManager } from '../utils/output-manager';

export interface PerformanceMetrics {
  timestamp: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  cpu: {
    userTime: number;
    systemTime: number;
  };
  operations: {
    filesProcessed: number;
    aiRequestsMade: number;
    cacheHits: number;
    cacheMisses: number;
  };
  timing: {
    averageFileProcessTime: number;
    averageAIResponseTime: number;
    totalProcessingTime: number;
  };
}

export interface PerformanceAlert {
  type: 'memory' | 'cpu' | 'timing' | 'cache';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestion: string;
  timestamp: number;
}

export interface PerformanceThresholds {
  memory: {
    heapWarning: number; // MB
    heapCritical: number; // MB
    rssWarning: number; // MB
    rssCritical: number; // MB
  };
  timing: {
    fileProcessWarning: number; // ms
    aiResponseWarning: number; // ms
  };
  cache: {
    hitRateWarning: number; // percentage
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private operationTimings = new Map<string, number[]>();
  private operationCounters = {
    filesProcessed: 0,
    aiRequestsMade: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  private thresholds: PerformanceThresholds = {
    memory: {
      heapWarning: 200, // 200MB
      heapCritical: 400, // 400MB
      rssWarning: 500, // 500MB
      rssCritical: 800, // 800MB
    },
    timing: {
      fileProcessWarning: 1000, // 1s
      aiResponseWarning: 5000, // 5s
    },
    cache: {
      hitRateWarning: 0.7, // 70%
    },
  };

  private constructor() {
    this.loadConfiguration();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 开始性能监控
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    outputManager.getProjectScanChannel().appendLine('📊 性能监控已启动');
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    outputManager.getProjectScanChannel().appendLine('📊 性能监控已停止');
  }

  /**
   * 收集性能指标
   */
  private collectMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      memory: {
        heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
        heapTotal: memUsage.heapTotal / 1024 / 1024, // MB
        rss: memUsage.rss / 1024 / 1024, // MB
        external: memUsage.external / 1024 / 1024, // MB
      },
      cpu: {
        userTime: cpuUsage.user / 1000, // ms
        systemTime: cpuUsage.system / 1000, // ms
      },
      operations: { ...this.operationCounters },
      timing: {
        averageFileProcessTime: this.getAverageTime('fileProcess'),
        averageAIResponseTime: this.getAverageTime('aiResponse'),
        totalProcessingTime: this.getTotalProcessingTime(),
      },
    };

    this.metrics.push(metrics);

    // 保持最近1000个指标
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // 检查性能阈值
    this.checkThresholds(metrics);
  }

  /**
   * 检查性能阈值并生成警报
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // 内存检查
    if (metrics.memory.heapUsed > this.thresholds.memory.heapCritical) {
      alerts.push({
        type: 'memory',
        severity: 'critical',
        message: `堆内存使用过高: ${metrics.memory.heapUsed.toFixed(2)}MB`,
        suggestion: '建议立即清理缓存或重启扩展',
        timestamp: Date.now(),
      });
    } else if (metrics.memory.heapUsed > this.thresholds.memory.heapWarning) {
      alerts.push({
        type: 'memory',
        severity: 'medium',
        message: `堆内存使用较高: ${metrics.memory.heapUsed.toFixed(2)}MB`,
        suggestion: '建议清理缓存或减少并发处理',
        timestamp: Date.now(),
      });
    }

    if (metrics.memory.rss > this.thresholds.memory.rssCritical) {
      alerts.push({
        type: 'memory',
        severity: 'critical',
        message: `RSS内存使用过高: ${metrics.memory.rss.toFixed(2)}MB`,
        suggestion: '建议重启VS Code或减少扩展负载',
        timestamp: Date.now(),
      });
    } else if (metrics.memory.rss > this.thresholds.memory.rssWarning) {
      alerts.push({
        type: 'memory',
        severity: 'medium',
        message: `RSS内存使用较高: ${metrics.memory.rss.toFixed(2)}MB`,
        suggestion: '建议监控内存使用情况',
        timestamp: Date.now(),
      });
    }

    // 时间检查
    if (metrics.timing.averageFileProcessTime > this.thresholds.timing.fileProcessWarning) {
      alerts.push({
        type: 'timing',
        severity: 'medium',
        message: `文件处理时间过长: ${metrics.timing.averageFileProcessTime.toFixed(2)}ms`,
        suggestion: '建议优化文件处理逻辑或减少文件大小',
        timestamp: Date.now(),
      });
    }

    if (metrics.timing.averageAIResponseTime > this.thresholds.timing.aiResponseWarning) {
      alerts.push({
        type: 'timing',
        severity: 'medium',
        message: `AI响应时间过长: ${metrics.timing.averageAIResponseTime.toFixed(2)}ms`,
        suggestion: '建议检查网络连接或使用缓存',
        timestamp: Date.now(),
      });
    }

    // 缓存命中率检查
    const cacheHitRate = this.getCacheHitRate();
    if (cacheHitRate < this.thresholds.cache.hitRateWarning) {
      alerts.push({
        type: 'cache',
        severity: 'low',
        message: `缓存命中率较低: ${(cacheHitRate * 100).toFixed(1)}%`,
        suggestion: '建议调整缓存策略或增加缓存大小',
        timestamp: Date.now(),
      });
    }

    // 添加新警报
    this.alerts.push(...alerts);

    // 保持最近100个警报
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // 输出严重警报
    for (const alert of alerts) {
      if (alert.severity === 'critical' || alert.severity === 'high') {
        outputManager
          .getProjectScanChannel()
          .appendLine(`⚠️ ${alert.message} - ${alert.suggestion}`);
      }
    }
  }

  /**
   * 记录操作时间
   */
  recordOperationTime(operation: string, timeMs: number): void {
    if (!this.operationTimings.has(operation)) {
      this.operationTimings.set(operation, []);
    }

    const timings = this.operationTimings.get(operation)!;
    timings.push(timeMs);

    // 保持最近100个时间记录
    if (timings.length > 100) {
      timings.splice(0, timings.length - 100);
    }
  }

  /**
   * 增加操作计数
   */
  incrementCounter(counter: keyof typeof this.operationCounters): void {
    this.operationCounters[counter]++;
  }

  /**
   * 获取平均时间
   */
  private getAverageTime(operation: string): number {
    const timings = this.operationTimings.get(operation);
    if (!timings || timings.length === 0) {
      return 0;
    }

    return timings.reduce((sum, time) => sum + time, 0) / timings.length;
  }

  /**
   * 获取总处理时间
   */
  private getTotalProcessingTime(): number {
    let total = 0;
    for (const timings of this.operationTimings.values()) {
      total += timings.reduce((sum, time) => sum + time, 0);
    }
    return total;
  }

  /**
   * 获取缓存命中率
   */
  private getCacheHitRate(): number {
    const total = this.operationCounters.cacheHits + this.operationCounters.cacheMisses;
    return total > 0 ? this.operationCounters.cacheHits / total : 0;
  }

  /**
   * 获取最新指标
   */
  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * 获取指标历史
   */
  getMetricsHistory(count: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * 获取最近警报
   */
  getRecentAlerts(count: number = 20): PerformanceAlert[] {
    return this.alerts.slice(-count);
  }

  /**
   * 获取性能摘要
   */
  getPerformanceSummary(): {
    currentMemory: { heap: number; rss: number };
    averageTimes: { fileProcess: number; aiResponse: number };
    cacheStats: { hitRate: number; totalRequests: number };
    alertCounts: { critical: number; high: number; medium: number; low: number };
  } {
    const latest = this.getLatestMetrics();
    const recentAlerts = this.getRecentAlerts();

    const alertCounts = {
      critical: recentAlerts.filter(a => a.severity === 'critical').length,
      high: recentAlerts.filter(a => a.severity === 'high').length,
      medium: recentAlerts.filter(a => a.severity === 'medium').length,
      low: recentAlerts.filter(a => a.severity === 'low').length,
    };

    return {
      currentMemory: {
        heap: latest?.memory.heapUsed || 0,
        rss: latest?.memory.rss || 0,
      },
      averageTimes: {
        fileProcess: this.getAverageTime('fileProcess'),
        aiResponse: this.getAverageTime('aiResponse'),
      },
      cacheStats: {
        hitRate: this.getCacheHitRate(),
        totalRequests: this.operationCounters.cacheHits + this.operationCounters.cacheMisses,
      },
      alertCounts,
    };
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport(): string {
    const summary = this.getPerformanceSummary();
    const latest = this.getLatestMetrics();
    const recentAlerts = this.getRecentAlerts(10);

    let report = '📊 AI Agent Hub 性能报告\n';
    report += '================================\n\n';

    // 当前状态
    report += '🔍 当前状态:\n';
    if (latest) {
      report += `  内存使用: Heap ${summary.currentMemory.heap.toFixed(2)}MB, RSS ${summary.currentMemory.rss.toFixed(2)}MB\n`;
      report += `  已处理文件: ${latest.operations.filesProcessed}\n`;
      report += `  AI请求次数: ${latest.operations.aiRequestsMade}\n`;
    }
    report += '\n';

    // 性能指标
    report += '⚡ 性能指标:\n';
    report += `  平均文件处理时间: ${summary.averageTimes.fileProcess.toFixed(2)}ms\n`;
    report += `  平均AI响应时间: ${summary.averageTimes.aiResponse.toFixed(2)}ms\n`;
    report += `  缓存命中率: ${(summary.cacheStats.hitRate * 100).toFixed(1)}%\n`;
    report += `  总缓存请求: ${summary.cacheStats.totalRequests}\n`;
    report += '\n';

    // 警报统计
    report += '⚠️ 警报统计:\n';
    report += `  严重: ${summary.alertCounts.critical}\n`;
    report += `  高: ${summary.alertCounts.high}\n`;
    report += `  中: ${summary.alertCounts.medium}\n`;
    report += `  低: ${summary.alertCounts.low}\n`;
    report += '\n';

    // 最近警报
    if (recentAlerts.length > 0) {
      report += '🚨 最近警报:\n';
      for (const alert of recentAlerts.slice(-5)) {
        const time = new Date(alert.timestamp).toLocaleTimeString();
        report += `  [${time}] ${alert.severity.toUpperCase()}: ${alert.message}\n`;
      }
      report += '\n';
    }

    // 优化建议
    report += '💡 优化建议:\n';
    if (summary.currentMemory.heap > this.thresholds.memory.heapWarning) {
      report += '  • 考虑清理缓存或减少并发处理\n';
    }
    if (summary.averageTimes.fileProcess > this.thresholds.timing.fileProcessWarning) {
      report += '  • 优化文件处理逻辑或使用更小的批处理大小\n';
    }
    if (summary.cacheStats.hitRate < this.thresholds.cache.hitRateWarning) {
      report += '  • 调整缓存策略以提高命中率\n';
    }
    if (summary.averageTimes.aiResponse > this.thresholds.timing.aiResponseWarning) {
      report += '  • 检查网络连接或启用AI请求缓存\n';
    }

    return report;
  }

  /**
   * 清理历史数据
   */
  clearHistory(): void {
    this.metrics = [];
    this.alerts = [];
    this.operationTimings.clear();
    this.operationCounters = {
      filesProcessed: 0,
      aiRequestsMade: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };

    outputManager.getProjectScanChannel().appendLine('🧹 性能监控历史数据已清理');
  }

  /**
   * 加载配置
   */
  private loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration('ai-agent-hub.performance');

    this.thresholds = {
      memory: {
        heapWarning: config.get('memory.heapWarning', 200),
        heapCritical: config.get('memory.heapCritical', 400),
        rssWarning: config.get('memory.rssWarning', 500),
        rssCritical: config.get('memory.rssCritical', 800),
      },
      timing: {
        fileProcessWarning: config.get('timing.fileProcessWarning', 1000),
        aiResponseWarning: config.get('timing.aiResponseWarning', 5000),
      },
      cache: {
        hitRateWarning: config.get('cache.hitRateWarning', 0.7),
      },
    };
  }

  /**
   * 更新配置
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }
}

/**
 * 获取性能监控服务实例
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  return PerformanceMonitor.getInstance();
}

/**
 * 性能监控装饰器
 */
export function monitorPerformance(operationName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      const startTime = Date.now();

      try {
        const result = await method.apply(this, args);
        const endTime = Date.now();
        monitor.recordOperationTime(operationName, endTime - startTime);
        return result;
      } catch (error) {
        const endTime = Date.now();
        monitor.recordOperationTime(operationName, endTime - startTime);
        throw error;
      }
    };

    return descriptor;
  };
}
