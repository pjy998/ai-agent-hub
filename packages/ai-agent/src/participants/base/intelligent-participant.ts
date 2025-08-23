/**
 * 智能参与者基类
 * 提供智能输入分析和流程选择能力
 */

import * as vscode from 'vscode';
import {
  intelligentInputAnalyzer,
  UserIntentAnalysis,
  AIInteractionRecord,
} from '../../services/intelligent-input-analyzer';
import { outputManager } from '../../utils/output-manager';
import { BaseParticipant, BaseParticipantConfig, ExecutionContext } from './base-participant';
import { HandleErrors, ErrorType } from '../../utils/error-handler';

/**
 * 执行流程定义
 */
export interface ExecutionFlow {
  /** 流程名称 */
  name: string;
  /** 流程描述 */
  description: string;
  /** 执行函数 */
  execute: (
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
    analysis: UserIntentAnalysis
  ) => Promise<void>;
  /** 是否需要上下文 */
  requiresContext?: boolean;
  /** 支持的意图类型 */
  supportedIntents?: string[];
}

/**
 * 智能参与者配置接口
 */
export interface IntelligentParticipantConfig extends BaseParticipantConfig {
  /** 默认流程名称 */
  defaultFlow?: string;
  /** 是否启用智能分析 */
  enableIntelligentAnalysis?: boolean;
}

/**
 * 智能参与者基类
 */
export abstract class IntelligentParticipant extends BaseParticipant {
  protected flows: Map<string, ExecutionFlow> = new Map();
  protected defaultFlow: string;
  protected enableIntelligentAnalysis: boolean;

  constructor(config: IntelligentParticipantConfig | string) {
    // 兼容旧的构造函数签名
    const participantConfig: IntelligentParticipantConfig =
      typeof config === 'string'
        ? {
            id: config,
            name: config,
            description: `${config} participant`,
            defaultFlow: 'default',
            enableIntelligentAnalysis: true,
          }
        : config;

    super(participantConfig);
    this.defaultFlow = participantConfig.defaultFlow || 'default';
    this.enableIntelligentAnalysis = participantConfig.enableIntelligentAnalysis ?? true;
    this.initializeFlows();
  }

  /**
   * 初始化执行流程 - 子类需要实现
   */
  protected abstract initializeFlows(): void;

  /**
   * 执行请求 - 实现基类的抽象方法
   */
  @HandleErrors(ErrorType.PARTICIPANT_ERROR)
  protected async executeRequest(execution: ExecutionContext): Promise<void> {
    const { request, context, stream, token } = execution;

    // 分析用户输入
    const analysis = await this.analyzeUserInput(request, context);

    // 选择执行流程
    const selectedFlow = this.selectExecutionFlow(analysis);

    // 记录流程选择
    this.logFlowSelection(analysis, selectedFlow);

    // 执行选择的流程
    await this.executeFlow(selectedFlow, request, context, stream, token, analysis);
  }

  /**
   * 分析用户输入
   */
  private async analyzeUserInput(
    request: vscode.ChatRequest,
    context: vscode.ChatContext
  ): Promise<UserIntentAnalysis> {
    const contextInfo = {
      command: request.command,
      references: request.references?.map(ref => ({
        id: ref.id,
        value: ref.value,
      })),
      history: context.history?.slice(-3).map(msg => ({
        participant: msg.participant,
        command: msg.command,
      })),
    };

    return await intelligentInputAnalyzer.analyzeUserIntent(
      request.prompt,
      this.config.id,
      contextInfo
    );
  }

  /**
   * 选择执行流程
   */
  private selectExecutionFlow(analysis: UserIntentAnalysis): ExecutionFlow {
    // 首先尝试使用AI建议的流程
    if (analysis.suggestedFlow && this.flows.has(analysis.suggestedFlow)) {
      const suggestedFlow = this.flows.get(analysis.suggestedFlow)!;

      // 检查流程是否支持当前意图
      if (
        !suggestedFlow.supportedIntents ||
        suggestedFlow.supportedIntents.includes(analysis.primaryIntent)
      ) {
        return suggestedFlow;
      }
    }

    // 根据意图类型选择流程
    for (const [flowName, flow] of this.flows) {
      if (flow.supportedIntents && flow.supportedIntents.includes(analysis.primaryIntent)) {
        return flow;
      }
    }

    // 使用默认流程
    return this.flows.get(this.defaultFlow) || this.flows.values().next().value;
  }

  /**
   * 执行流程
   */
  private async executeFlow(
    flow: ExecutionFlow,
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
    analysis: UserIntentAnalysis
  ): Promise<void> {
    try {
      // 显示选择的流程信息（调试模式）
      if (outputManager.isDebugMode()) {
        stream.markdown(
          `🔍 **智能分析结果**\n` +
            `- 意图: ${analysis.primaryIntent} (置信度: ${(analysis.confidence * 100).toFixed(1)}%)\n` +
            `- 选择流程: ${flow.name}\n` +
            `- 说明: ${analysis.explanation}\n\n`
        );
      }

      // 执行流程
      await flow.execute(request, context, stream, token, analysis);
    } catch (error) {
      this.log(
        `执行流程 ${flow.name} 失败: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
      throw error;
    }
  }

  /**
   * 记录流程选择
   */
  private logFlowSelection(analysis: UserIntentAnalysis, flow: ExecutionFlow): void {
    this.log(
      `智能流程选择 - 意图: ${analysis.primaryIntent}, 流程: ${flow.name}, 置信度: ${analysis.confidence}`
    );
  }

  /**
   * 注册执行流程
   */
  protected registerFlow(flow: ExecutionFlow): void {
    this.flows.set(flow.name, flow);
  }

  /**
   * 设置默认流程
   */
  protected setDefaultFlow(flowName: string): void {
    if (this.flows.has(flowName)) {
      this.defaultFlow = flowName;
    }
  }

  /**
   * 获取可用流程列表
   */
  protected getAvailableFlows(): ExecutionFlow[] {
    return Array.from(this.flows.values());
  }

  /**
   * 生成帮助信息
   */
  protected generateHelpMessage(): string {
    const flows = this.getAvailableFlows();

    let helpMessage = `## ${this.config.id} 智能助手\n\n`;
    helpMessage += `我使用 GitHub Copilot 的 GPT-4.1 模型来智能分析您的输入并选择最合适的处理流程。\n\n`;
    helpMessage += `### 🤖 智能特性\n`;
    helpMessage += `- **自然语言理解**: 无需记忆特定命令，直接用自然语言描述需求\n`;
    helpMessage += `- **上下文感知**: 根据当前代码和对话历史提供更准确的分析\n`;
    helpMessage += `- **透明化AI交互**: 所有AI分析过程都会被记录，便于审查\n\n`;

    helpMessage += `### 📋 可用功能流程\n`;
    flows.forEach(flow => {
      helpMessage += `- **${flow.name}**: ${flow.description}\n`;
      if (flow.supportedIntents && flow.supportedIntents.length > 0) {
        helpMessage += `  - 支持意图: ${flow.supportedIntents.join(', ')}\n`;
      }
    });

    helpMessage += `\n### 💡 使用建议\n`;
    helpMessage += `- 直接描述您想要做什么，AI会自动选择合适的处理方式\n`;
    helpMessage += `- 可以引用文件或代码片段来提供更多上下文\n`;
    helpMessage += `- 如需查看AI分析过程，请启用调试模式\n`;

    return helpMessage;
  }

  /**
   * 获取AI交互历史
   */
  getInteractionHistory(): AIInteractionRecord[] {
    return intelligentInputAnalyzer
      .getInteractionHistory()
      .filter(record => record.participantId === this.config.id);
  }

  /**
   * 生成透明化报告
   */
  generateTransparencyReport(): string {
    const participantHistory = this.getInteractionHistory();
    const totalInteractions = participantHistory.length;

    if (totalInteractions === 0) {
      return `## ${this.config.id} AI交互报告\n\n暂无交互记录。`;
    }

    const successfulAnalyses = participantHistory.filter(r => !r.error).length;
    const recentInteractions = participantHistory.slice(-10);

    let report = `## ${this.config.id} AI交互透明化报告\n\n`;
    report += `### 📊 统计信息\n`;
    report += `- 总交互次数: ${totalInteractions}\n`;
    report += `- 成功分析次数: ${successfulAnalyses}\n`;
    report += `- 成功率: ${((successfulAnalyses / totalInteractions) * 100).toFixed(1)}%\n\n`;

    report += `### 📝 最近交互记录\n\n`;
    recentInteractions.forEach((record, index) => {
      report += `#### 交互 ${index + 1} - ${new Date(record.timestamp).toLocaleString()}\n`;
      report += `- **用户输入**: ${record.userInput}\n`;
      report += `- **选择流程**: ${record.selectedFlow}\n`;
      if (record.error) {
        report += `- **错误**: ${record.error}\n`;
      }
      report += `\n`;
    });

    return report;
  }
}
