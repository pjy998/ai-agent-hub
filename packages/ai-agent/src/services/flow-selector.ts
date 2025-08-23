/**
 * 流程选择器服务
 * 提供配置化的流程选择逻辑，减少硬编码的条件判断
 */

import { UserIntentAnalysis } from './intelligent-input-analyzer';
import { ExecutionFlow } from '../participants/base/intelligent-participant';
import { conditionMatcher, MatchCondition, MatchResult } from './condition-matcher';
import { outputManager } from '../utils/output-manager';

/**
 * 流程选择规则
 */
export interface FlowSelectionRule {
  /** 规则ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 目标流程ID */
  flowId: string;
  /** 匹配条件 */
  conditions: string[]; // 条件ID列表
  /** 优先级 */
  priority: number;
  /** 最小置信度阈值 */
  minConfidence?: number;
  /** 是否启用 */
  enabled: boolean;
  /** 规则描述 */
  description?: string;
}

/**
 * 流程选择结果
 */
export interface FlowSelectionResult {
  /** 选择的流程 */
  flow: ExecutionFlow;
  /** 选择置信度 */
  confidence: number;
  /** 匹配的规则 */
  rule?: FlowSelectionRule;
  /** 匹配详情 */
  matchDetails: MatchResult[];
  /** 选择原因 */
  reason: string;
}

/**
 * 流程选择器配置
 */
export interface FlowSelectorConfig {
  /** 参与者ID */
  participantId: string;
  /** 默认流程ID */
  defaultFlowId: string;
  /** 选择规则 */
  rules: FlowSelectionRule[];
  /** 全局最小置信度 */
  globalMinConfidence?: number;
  /** 是否启用智能分析 */
  enableIntelligentAnalysis?: boolean;
}

/**
 * 流程选择器
 */
export class FlowSelector {
  private config: FlowSelectorConfig;
  private flows: Map<string, ExecutionFlow>;
  private rules: Map<string, FlowSelectionRule>;

  constructor(config: FlowSelectorConfig, flows: Map<string, ExecutionFlow>) {
    this.config = config;
    this.flows = flows;
    this.rules = new Map();

    // 加载规则
    config.rules.forEach(rule => this.addRule(rule));
  }

  /**
   * 添加选择规则
   */
  public addRule(rule: FlowSelectionRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * 移除选择规则
   */
  public removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * 选择执行流程
   */
  public selectFlow(input: string, analysis?: UserIntentAnalysis): FlowSelectionResult {
    try {
      // 1. 基于规则的选择
      const ruleBasedResult = this.selectFlowByRules(input);
      if (ruleBasedResult) {
        return ruleBasedResult;
      }

      // 2. 基于智能分析的选择
      if (analysis && this.config.enableIntelligentAnalysis) {
        const analysisBasedResult = this.selectFlowByAnalysis(analysis);
        if (analysisBasedResult) {
          return analysisBasedResult;
        }
      }

      // 3. 返回默认流程
      return this.getDefaultFlowResult(input);
    } catch (error) {
      outputManager.logError(
        '流程选择失败',
        error instanceof Error ? error : new Error(String(error))
      );
      return this.getDefaultFlowResult(input, '选择过程中发生错误，使用默认流程');
    }
  }

  /**
   * 基于规则选择流程
   */
  private selectFlowByRules(input: string): FlowSelectionResult | null {
    const enabledRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of enabledRules) {
      const matchResults = conditionMatcher.matchConditions(input, rule.conditions);

      if (matchResults.length > 0) {
        // 计算总体置信度
        const confidence = this.calculateRuleConfidence(matchResults, rule);
        const minConfidence = rule.minConfidence || this.config.globalMinConfidence || 0.5;

        if (confidence >= minConfidence) {
          const flow = this.flows.get(rule.flowId);
          if (flow) {
            return {
              flow,
              confidence,
              rule,
              matchDetails: matchResults,
              reason: `匹配规则: ${rule.name} (置信度: ${(confidence * 100).toFixed(1)}%)`,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * 基于智能分析选择流程
   */
  private selectFlowByAnalysis(analysis: UserIntentAnalysis): FlowSelectionResult | null {
    // 根据主要意图查找匹配的流程
    for (const [flowId, flow] of this.flows) {
      if (flow.supportedIntents && flow.supportedIntents.length > 0) {
        const intentMatch = this.matchIntent(analysis.primaryIntent, flow.supportedIntents);
        if (intentMatch > 0.7) {
          // 意图匹配阈值
          const confidence = Math.min(analysis.confidence * intentMatch, 0.95);

          return {
            flow,
            confidence,
            matchDetails: [],
            reason: `智能分析匹配: 意图"${analysis.primaryIntent}"与流程"${flow.name}"匹配 (置信度: ${(confidence * 100).toFixed(1)}%)`,
          };
        }
      }
    }

    return null;
  }

  /**
   * 匹配意图
   */
  private matchIntent(intent: string, supportedIntents: string[]): number {
    const lowerIntent = intent.toLowerCase();

    // 精确匹配
    if (supportedIntents.some(si => si.toLowerCase() === lowerIntent)) {
      return 1.0;
    }

    // 包含匹配
    const containsMatches = supportedIntents.filter(
      si => lowerIntent.includes(si.toLowerCase()) || si.toLowerCase().includes(lowerIntent)
    );

    if (containsMatches.length > 0) {
      return 0.8;
    }

    // 语义相似性匹配（简化版）
    const semanticMatches = supportedIntents.filter(
      si => this.calculateSemanticSimilarity(intent, si) > 0.6
    );

    if (semanticMatches.length > 0) {
      return 0.7;
    }

    return 0;
  }

  /**
   * 计算语义相似性（简化版）
   */
  private calculateSemanticSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;

    return commonWords.length / totalWords;
  }

  /**
   * 计算规则置信度
   */
  private calculateRuleConfidence(matchResults: MatchResult[], rule: FlowSelectionRule): number {
    if (matchResults.length === 0) {
      return 0;
    }

    // 计算平均得分
    const averageScore =
      matchResults.reduce((sum, result) => sum + result.score, 0) / matchResults.length;

    // 考虑匹配条件的覆盖率
    const coverageRate = matchResults.length / rule.conditions.length;

    // 综合计算置信度
    return Math.min(averageScore * coverageRate, 1.0);
  }

  /**
   * 获取默认流程结果
   */
  private getDefaultFlowResult(input: string, reason?: string): FlowSelectionResult {
    const defaultFlow = this.flows.get(this.config.defaultFlowId);

    if (!defaultFlow) {
      throw new Error(`默认流程 ${this.config.defaultFlowId} 未找到`);
    }

    return {
      flow: defaultFlow,
      confidence: 0.3, // 默认流程的置信度较低
      matchDetails: [],
      reason: reason || `未找到匹配规则，使用默认流程: ${defaultFlow.name}`,
    };
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<FlowSelectorConfig>): void {
    this.config = { ...this.config, ...config };

    // 重新加载规则
    if (config.rules) {
      this.rules.clear();
      config.rules.forEach(rule => this.addRule(rule));
    }
  }

  /**
   * 获取所有规则
   */
  public getAllRules(): FlowSelectionRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取启用的规则
   */
  public getEnabledRules(): FlowSelectionRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.enabled);
  }

  /**
   * 验证配置
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查默认流程是否存在
    if (!this.flows.has(this.config.defaultFlowId)) {
      errors.push(`默认流程 ${this.config.defaultFlowId} 不存在`);
    }

    // 检查规则引用的流程是否存在
    for (const rule of this.rules.values()) {
      if (!this.flows.has(rule.flowId)) {
        errors.push(`规则 ${rule.name} 引用的流程 ${rule.flowId} 不存在`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取流程选择统计
   */
  public getSelectionStats(): {
    totalRules: number;
    enabledRules: number;
    totalFlows: number;
    defaultFlow: string;
  } {
    return {
      totalRules: this.rules.size,
      enabledRules: this.getEnabledRules().length,
      totalFlows: this.flows.size,
      defaultFlow: this.config.defaultFlowId,
    };
  }
}

/**
 * 流程选择器工厂
 */
export class FlowSelectorFactory {
  /**
   * 创建标准的流程选择器
   */
  public static createStandardSelector(
    participantId: string,
    flows: Map<string, ExecutionFlow>,
    defaultFlowId: string = 'default'
  ): FlowSelector {
    const config: FlowSelectorConfig = {
      participantId,
      defaultFlowId,
      globalMinConfidence: 0.5,
      enableIntelligentAnalysis: true,
      rules: [
        {
          id: 'help_rule',
          name: '帮助规则',
          flowId: 'help',
          conditions: ['help_request'],
          priority: 100,
          enabled: true,
          description: '当用户请求帮助时选择帮助流程',
        },
        {
          id: 'generate_rule',
          name: '生成规则',
          flowId: 'generate',
          conditions: ['generate_request'],
          priority: 90,
          enabled: true,
          description: '当用户请求生成内容时选择生成流程',
        },
        {
          id: 'analysis_rule',
          name: '分析规则',
          flowId: 'analysis',
          conditions: ['analysis_request'],
          priority: 90,
          enabled: true,
          description: '当用户请求分析时选择分析流程',
        },
        {
          id: 'list_rule',
          name: '列表规则',
          flowId: 'list',
          conditions: ['list_request'],
          priority: 80,
          enabled: true,
          description: '当用户请求列表时选择列表流程',
        },
      ],
    };

    return new FlowSelector(config, flows);
  }

  /**
   * 从配置文件创建流程选择器
   */
  public static createFromConfig(
    config: FlowSelectorConfig,
    flows: Map<string, ExecutionFlow>
  ): FlowSelector {
    return new FlowSelector(config, flows);
  }
}
