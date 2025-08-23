/**
 * 增强型智能参与者基类
 * 集成了配置化的响应模板、条件匹配和流程选择功能
 */

import {
  IntelligentParticipant,
  ExecutionFlow,
  IntelligentParticipantConfig,
} from './intelligent-participant';
import {
  ResponseTemplateManager,
  ResponseTemplate,
} from '../../services/response-template-manager';
import { ConditionMatcher } from '../../services/condition-matcher';
import {
  FlowSelector,
  FlowSelectorConfig,
  FlowSelectionResult,
} from '../../services/flow-selector';
import {
  intelligentInputAnalyzer,
  UserIntentAnalysis,
} from '../../services/intelligent-input-analyzer';
import { outputManager } from '../../utils/output-manager';
import * as vscode from 'vscode';

/**
 * 增强型参与者配置
 */
export interface EnhancedParticipantConfig extends IntelligentParticipantConfig {
  /** 默认流程ID */
  defaultFlowId: string;
  /** 流程选择器配置 */
  flowSelectorConfig?: Partial<FlowSelectorConfig>;
  /** 自定义响应模板 */
  customTemplates?: ResponseTemplate[];
  /** 是否启用响应模板 */
  enableResponseTemplates?: boolean;
  /** 是否启用条件匹配 */
  enableConditionMatching?: boolean;
}

/**
 * 增强型智能参与者基类
 */
export abstract class EnhancedIntelligentParticipant extends IntelligentParticipant {
  protected config: EnhancedParticipantConfig;
  protected responseTemplateManager!: ResponseTemplateManager;
  protected conditionMatcher!: ConditionMatcher;
  protected flowSelector!: FlowSelector;
  protected enableIntelligentAnalysis: boolean = true;

  constructor(config: EnhancedParticipantConfig) {
    // 转换配置格式
    const intelligentConfig: IntelligentParticipantConfig = {
      ...config,
      defaultFlow: config.defaultFlowId,
    };

    super(intelligentConfig);

    this.config = config;
    this.enableIntelligentAnalysis = config.enableIntelligentAnalysis ?? true;

    this.initializeServices();
  }

  /**
   * 初始化服务组件
   */
  private initializeServices(): void {
    try {
      // 初始化响应模板管理器
      this.responseTemplateManager = ResponseTemplateManager.getInstance();
      if (this.config.customTemplates) {
        this.config.customTemplates.forEach(template =>
          this.responseTemplateManager.addTemplate(template)
        );
      }

      // 初始化条件匹配器
      this.conditionMatcher = ConditionMatcher.getInstance();

      // 注册默认条件（子类可以覆盖）
      this.registerDefaultConditions();

      // 初始化流程选择器（延迟到flows初始化后）
      this.initializeFlowSelector();
    } catch (error) {
      outputManager.logError(
        '服务组件初始化失败',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 初始化流程选择器
   */
  private initializeFlowSelector(): void {
    // 等待flows初始化完成
    if (this.flows.size === 0) {
      // 延迟初始化
      setTimeout(() => this.initializeFlowSelector(), 100);
      return;
    }

    const selectorConfig: FlowSelectorConfig = {
      participantId: this.config.id,
      defaultFlowId: this.config.defaultFlowId,
      enableIntelligentAnalysis: this.enableIntelligentAnalysis,
      rules: [],
      ...this.config.flowSelectorConfig,
    };

    this.flowSelector = new FlowSelector(selectorConfig, this.flows);

    // 注册默认流程选择规则（子类可以覆盖）
    this.registerDefaultFlowRules();
  }

  /**
   * 注册默认条件
   * 子类可以覆盖此方法来添加特定的条件
   */
  protected registerDefaultConditions(): void {
    // 基础条件已在ConditionMatcher中定义
    // 子类可以添加特定条件
  }

  /**
   * 注册默认流程选择规则
   * 子类可以覆盖此方法来添加特定的规则
   */
  protected registerDefaultFlowRules(): void {
    // 子类实现具体的规则注册
  }

  /**
   * 增强的请求处理
   */
  public async handleRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    try {
      const prompt = request.prompt.trim();

      // 1. 智能输入分析
      let analysis: UserIntentAnalysis | undefined;
      if (this.enableIntelligentAnalysis) {
        try {
          analysis = await intelligentInputAnalyzer.analyzeUserIntent(prompt, this.config.id);
          outputManager.logInfo(`智能分析结果: ${JSON.stringify(analysis)}`);
        } catch (error) {
          outputManager.logWarning(
            `智能分析失败，使用传统流程选择: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // 2. 流程选择和执行
      if (analysis) {
        const selectedFlow = this.selectFlowWithAnalysis(analysis);
        outputManager.logInfo(`选择流程: ${selectedFlow.name}`);
        const selectionResult = {
          flow: selectedFlow,
          confidence: analysis.confidence,
          matchDetails: [],
          reason: analysis.explanation,
        };
        await this.executeSelectedFlow(selectionResult, request, context, stream, token, analysis);
      } else {
        // 使用默认流程
        const defaultFlow = this.flows.get(this.defaultFlow) || this.flows.values().next().value;
        const selectionResult = {
          flow: defaultFlow,
          confidence: 0.3,
          matchDetails: [],
          reason: '使用默认流程',
        };
        await this.executeSelectedFlow(selectionResult, request, context, stream, token);
      }
    } catch (error) {
      await this.handleError(error, stream);
    }
  }

  /**
   * 使用分析结果选择流程
   */
  private selectFlowWithAnalysis(analysis: UserIntentAnalysis): ExecutionFlow {
    if (!this.flowSelector) {
      // 如果流程选择器未初始化，使用传统方法
      const fallbackResult = this.fallbackFlowSelection(analysis.primaryIntent);
      return fallbackResult.flow;
    }

    const selectionResult = this.flowSelector.selectFlow(analysis.primaryIntent, analysis);
    return selectionResult.flow;
  }

  /**
   * 备用流程选择方法
   */
  protected fallbackFlowSelection(prompt: string): FlowSelectionResult {
    const defaultFlow =
      this.flows.get(this.config.defaultFlowId) || this.flows.values().next().value;

    return {
      flow: defaultFlow,
      confidence: 0.3,
      matchDetails: [],
      reason: '流程选择器未初始化，使用默认流程',
    };
  }

  /**
   * 生成响应内容
   * 使用响应模板管理器
   */
  protected generateResponse(
    templateId: string,
    data: Record<string, any> = {},
    fallbackContent?: string
  ): string {
    if (!this.config.enableResponseTemplates) {
      return fallbackContent || '';
    }

    try {
      return this.responseTemplateManager.renderTemplate(templateId, data);
    } catch (error) {
      outputManager.logWarning(
        `响应模板 ${templateId} 渲染失败: ${error instanceof Error ? error.message : String(error)}`
      );
      return fallbackContent || `渲染模板失败: ${templateId}`;
    }
  }

  /**
   * 检查条件匹配
   */
  protected checkCondition(input: string, conditionId: string): boolean {
    if (!this.config.enableConditionMatching) {
      return false;
    }

    try {
      const results = this.conditionMatcher.matchConditions(input, [conditionId]);
      return results.length > 0 && results[0].score > 0.5;
    } catch (error) {
      outputManager.logWarning(
        `条件匹配失败: ${conditionId}: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * 处理错误
   */
  protected async handleError(error: any, stream: vscode.ChatResponseStream): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputManager.logError(
      '参与者执行错误',
      error instanceof Error ? error : new Error(String(error))
    );

    const errorResponse = this.generateResponse(
      'error',
      {
        error: errorMessage,
        participant: this.config.name,
      },
      `执行过程中发生错误: ${errorMessage}`
    );

    stream.markdown(errorResponse);
  }

  /**
   * 获取参与者统计信息
   */
  public getStats(): {
    participantId: string;
    flowCount: number;
    templateCount: number;
    conditionCount: number;
    selectorStats?: any;
  } {
    return {
      participantId: this.config.id,
      flowCount: this.flows.size,
      templateCount: this.responseTemplateManager
        ? Object.keys(this.responseTemplateManager).length
        : 0,
      conditionCount: this.conditionMatcher ? Object.keys(this.conditionMatcher).length : 0,
      selectorStats: this.flowSelector?.getSelectionStats(),
    };
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<EnhancedParticipantConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 重新初始化相关服务
    if (newConfig.customTemplates) {
      newConfig.customTemplates.forEach(template =>
        this.responseTemplateManager.addTemplate(template)
      );
    }

    if (newConfig.flowSelectorConfig && this.flowSelector) {
      this.flowSelector.updateConfig(newConfig.flowSelectorConfig);
    }
  }

  /**
   * 验证配置
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 基础配置验证
    if (!this.config.id) {
      errors.push('参与者ID不能为空');
    }

    if (!this.config.name) {
      errors.push('参与者名称不能为空');
    }

    if (!this.config.defaultFlowId) {
      errors.push('默认流程ID不能为空');
    }

    // 流程选择器验证
    if (this.flowSelector) {
      const selectorValidation = this.flowSelector.validateConfig();
      if (!selectorValidation.valid) {
        errors.push(...selectorValidation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 执行选择的流程
   */
  protected async executeSelectedFlow(
    selectionResult: FlowSelectionResult,
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
    analysis?: UserIntentAnalysis
  ): Promise<void> {
    const { flow } = selectionResult;

    try {
      // 发送流程选择信息（可选）
      if (selectionResult.confidence < 0.8) {
        stream.markdown(`*选择执行: ${flow.name}*\n\n`);
      }

      // 执行流程
      await flow.execute(request, context, stream, token, analysis || ({} as UserIntentAnalysis));
    } catch (error) {
      outputManager.logError(
        `执行流程 ${flow.name} 失败`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }
}
