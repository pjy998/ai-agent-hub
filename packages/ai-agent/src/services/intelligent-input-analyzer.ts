/**
 * 智能输入分析服务
 * 使用 GPT-4.1 分析用户输入，智能选择执行流程
 */

import { VSCodeLMService } from './vscode-lm-service';
import { outputManager } from '../utils/output-manager';

/**
 * 用户意图分析结果
 */
export interface UserIntentAnalysis {
  /** 主要意图类型 */
  primaryIntent: string;
  /** 置信度 (0-1) */
  confidence: number;
  /** 提取的实体信息 */
  entities: {
    /** 目标文件路径 */
    filePath?: string;
    /** 编程语言 */
    language?: string;
    /** 分析类型 */
    analysisType?: string;
    /** 关键词 */
    keywords: string[];
  };
  /** 建议的执行流程 */
  suggestedFlow: string;
  /** 详细说明 */
  explanation: string;
  /** 是否需要上下文信息 */
  needsContext: boolean;
}

/**
 * AI交互记录
 */
export interface AIInteractionRecord {
  /** 时间戳 */
  timestamp: number;
  /** 参与者ID */
  participantId: string;
  /** 用户输入 */
  userInput: string;
  /** AI分析请求 */
  analysisRequest: string;
  /** AI分析响应 */
  analysisResponse: string;
  /** 选择的执行流程 */
  selectedFlow: string;
  /** 执行结果 */
  executionResult?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 智能输入分析器
 */
export class IntelligentInputAnalyzer {
  private lmService: VSCodeLMService;
  private interactionHistory: AIInteractionRecord[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.lmService = VSCodeLMService.getInstance();
  }

  /**
   * 分析用户输入意图
   */
  async analyzeUserIntent(
    userInput: string,
    participantId: string,
    context?: any
  ): Promise<UserIntentAnalysis> {
    try {
      // 构建分析提示
      const analysisPrompt = this.buildAnalysisPrompt(userInput, participantId, context);

      // 记录交互开始
      const interactionRecord: AIInteractionRecord = {
        timestamp: Date.now(),
        participantId,
        userInput,
        analysisRequest: analysisPrompt,
        analysisResponse: '',
        selectedFlow: '',
      };

      // 调用 GPT-4.1 分析
      const analysisResponse = await this.lmService.sendMessage([
        {
          role: 'user',
          content: analysisPrompt,
        },
      ]);
      interactionRecord.analysisResponse = analysisResponse.content || '';

      // 解析分析结果
      const intentAnalysis = this.parseAnalysisResponse(analysisResponse.content || '');
      interactionRecord.selectedFlow = intentAnalysis.suggestedFlow;

      // 存储交互记录
      this.addInteractionRecord(interactionRecord);

      return intentAnalysis;
    } catch (error) {
      outputManager.logError(
        '智能输入分析失败',
        error instanceof Error ? error : new Error(String(error))
      );

      // 返回默认分析结果
      return this.getDefaultAnalysis(userInput);
    }
  }

  /**
   * 构建分析提示
   */
  private buildAnalysisPrompt(userInput: string, participantId: string, context?: any): string {
    const contextInfo = context ? `\n当前上下文：${JSON.stringify(context, null, 2)}` : '';

    return `你是一个专业的用户意图分析助手。请分析以下用户输入，并返回JSON格式的分析结果。

参与者ID: ${participantId}
用户输入: "${userInput}"${contextInfo}

请分析用户的真实意图，并返回以下JSON格式的结果：
{
  "primaryIntent": "主要意图类型（如：code_analysis, project_scan, quality_check, report_generation, help_request等）",
  "confidence": 0.95,
  "entities": {
    "filePath": "提取的文件路径（如果有）",
    "language": "编程语言（如果提到）",
    "analysisType": "分析类型（如：quality, security, performance等）",
    "keywords": ["关键词1", "关键词2"]
  },
  "suggestedFlow": "建议的执行流程名称",
  "explanation": "详细的意图解释",
  "needsContext": true/false
}

注意：
1. 请仔细理解用户的自然语言表达，不要只依赖关键词匹配
2. 考虑上下文信息来提高分析准确性
3. 如果用户输入模糊，请选择最可能的意图
4. 返回的JSON必须是有效的格式`;
  }

  /**
   * 解析分析响应
   */
  private parseAnalysisResponse(response: string): UserIntentAnalysis {
    try {
      // 尝试提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysisResult = JSON.parse(jsonMatch[0]);
        return {
          primaryIntent: analysisResult.primaryIntent || 'unknown',
          confidence: analysisResult.confidence || 0.5,
          entities: {
            filePath: analysisResult.entities?.filePath,
            language: analysisResult.entities?.language,
            analysisType: analysisResult.entities?.analysisType,
            keywords: analysisResult.entities?.keywords || [],
          },
          suggestedFlow: analysisResult.suggestedFlow || 'default',
          explanation: analysisResult.explanation || '无法解析用户意图',
          needsContext: analysisResult.needsContext || false,
        };
      }
    } catch (error) {
      outputManager.logError(
        '解析AI分析响应失败',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    // 如果解析失败，返回默认分析
    return this.getDefaultAnalysis(response);
  }

  /**
   * 获取默认分析结果
   */
  private getDefaultAnalysis(userInput: string): UserIntentAnalysis {
    const lowerInput = userInput.toLowerCase();

    // 简单的关键词匹配作为后备方案
    let primaryIntent = 'unknown';
    let suggestedFlow = 'default';

    if (lowerInput.includes('分析') || lowerInput.includes('analyze')) {
      primaryIntent = 'code_analysis';
      suggestedFlow = 'analysis';
    } else if (lowerInput.includes('报告') || lowerInput.includes('report')) {
      primaryIntent = 'report_generation';
      suggestedFlow = 'report';
    } else if (lowerInput.includes('帮助') || lowerInput.includes('help')) {
      primaryIntent = 'help_request';
      suggestedFlow = 'help';
    }

    return {
      primaryIntent,
      confidence: 0.3,
      entities: {
        keywords: lowerInput.split(' ').filter(word => word.length > 2),
      },
      suggestedFlow,
      explanation: '使用默认分析逻辑',
      needsContext: false,
    };
  }

  /**
   * 添加交互记录
   */
  private addInteractionRecord(record: AIInteractionRecord): void {
    this.interactionHistory.push(record);

    // 限制历史记录大小
    if (this.interactionHistory.length > this.maxHistorySize) {
      this.interactionHistory = this.interactionHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 获取交互历史
   */
  getInteractionHistory(): AIInteractionRecord[] {
    return [...this.interactionHistory];
  }

  /**
   * 清除交互历史
   */
  clearInteractionHistory(): void {
    this.interactionHistory = [];
  }

  /**
   * 导出交互历史为JSON
   */
  exportInteractionHistory(): string {
    return JSON.stringify(this.interactionHistory, null, 2);
  }

  /**
   * 获取透明化报告
   */
  getTransparencyReport(): string {
    const totalInteractions = this.interactionHistory.length;
    const successfulAnalyses = this.interactionHistory.filter(r => !r.error).length;
    const averageConfidence =
      this.interactionHistory
        .map(r => {
          try {
            const analysis = JSON.parse(r.analysisResponse);
            return analysis.confidence || 0;
          } catch {
            return 0;
          }
        })
        .reduce((sum, conf) => sum + conf, 0) / totalInteractions;

    return (
      `# AI交互透明化报告\n\n` +
      `- 总交互次数: ${totalInteractions}\n` +
      `- 成功分析次数: ${successfulAnalyses}\n` +
      `- 成功率: ${((successfulAnalyses / totalInteractions) * 100).toFixed(1)}%\n` +
      `- 平均置信度: ${(averageConfidence * 100).toFixed(1)}%\n\n` +
      `## 最近的交互记录\n\n` +
      this.interactionHistory
        .slice(-5)
        .map(
          r =>
            `### ${new Date(r.timestamp).toLocaleString()}\n` +
            `- 参与者: ${r.participantId}\n` +
            `- 用户输入: ${r.userInput}\n` +
            `- 选择流程: ${r.selectedFlow}\n`
        )
        .join('\n')
    );
  }
}

// 导出单例实例
export const intelligentInputAnalyzer = new IntelligentInputAnalyzer();
