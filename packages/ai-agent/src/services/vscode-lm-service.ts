/**
 * VS Code Language Model 服务
 * 使用VS Code内置的Language Model API (GitHub Copilot)
 * 提供统一的AI智能分析能力
 */

import * as vscode from 'vscode';
import { outputManager } from '../utils/output-manager';

export interface LMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LMResponse {
  success: boolean;
  content?: string;
  error?: string;
  model?: string;
}

export interface AnalysisContext {
  projectPath?: string;
  fileContent?: string;
  fileName?: string;
  language?: string;
  userIntent?: string;
  previousAnalysis?: string[];
}

/**
 * VS Code Language Model 服务类
 * 使用GitHub Copilot的GPT-4.1模型提供智能分析
 */
export class VSCodeLMService {
  private static instance: VSCodeLMService;
  private availableModels: vscode.LanguageModelChat[] = [];
  private preferredModel: vscode.LanguageModelChat | null = null;

  private constructor() {}

  public static getInstance(): VSCodeLMService {
    if (!VSCodeLMService.instance) {
      VSCodeLMService.instance = new VSCodeLMService();
    }
    return VSCodeLMService.instance;
  }

  /**
   * 初始化服务，获取可用的语言模型
   */
  public async initialize(): Promise<boolean> {
    try {
      if (!vscode.lm || !vscode.lm.selectChatModels) {
        outputManager.logWarning('VS Code Language Model API 不可用');
        return false;
      }

      // 获取所有可用的聊天模型
      this.availableModels = await vscode.lm.selectChatModels();

      if (this.availableModels.length === 0) {
        outputManager.logWarning('未找到可用的语言模型');
        return false;
      }

      // 优先选择GPT-4模型
      this.preferredModel =
        this.availableModels.find(
          model =>
            model.name.toLowerCase().includes('gpt-4') ||
            model.name.toLowerCase().includes('copilot')
        ) || this.availableModels[0];

      outputManager.logInfo(`已初始化语言模型: ${this.preferredModel.name}`);
      return true;
    } catch (error) {
      outputManager.logError('初始化语言模型失败:', error as Error);
      return false;
    }
  }

  /**
   * 检查服务是否可用
   */
  public isAvailable(): boolean {
    return this.preferredModel !== null && vscode.lm !== undefined;
  }

  /**
   * 获取可用模型列表
   */
  public getAvailableModels(): string[] {
    return this.availableModels.map(model => model.name);
  }

  /**
   * 发送消息到语言模型
   */
  public async sendMessage(messages: LMMessage[], _context?: AnalysisContext): Promise<LMResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Language Model 服务不可用，请确保已安装并登录 GitHub Copilot',
      };
    }

    try {
      // 转换消息格式
      const chatMessages = messages.map(msg => {
        switch (msg.role) {
          case 'system':
            return vscode.LanguageModelChatMessage.User(msg.content);
          case 'user':
            return vscode.LanguageModelChatMessage.User(msg.content);
          case 'assistant':
            return vscode.LanguageModelChatMessage.Assistant(msg.content);
          default:
            return vscode.LanguageModelChatMessage.User(msg.content);
        }
      });

      // 发送请求
      const request = await this.preferredModel!.sendRequest(
        chatMessages,
        {},
        new vscode.CancellationTokenSource().token
      );

      // 收集响应
      let content = '';
      for await (const fragment of request.text) {
        content += fragment;
      }

      return {
        success: true,
        content: content.trim(),
        model: this.preferredModel!.name,
      };
    } catch (error) {
      outputManager.logError('Language Model 请求失败:', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 分析代码
   */
  public async analyzeCode(
    code: string,
    language: string,
    analysisType: 'quality' | 'security' | 'performance' | 'structure' | 'general' = 'general',
    context?: AnalysisContext
  ): Promise<LMResponse> {
    const systemPrompt = this.getAnalysisSystemPrompt(analysisType, language);
    const userPrompt = this.buildCodeAnalysisPrompt(code, language, analysisType, context);

    const messages: LMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    return await this.sendMessage(messages, context);
  }

  /**
   * 回答问题
   */
  public async answerQuestion(question: string, context?: AnalysisContext): Promise<LMResponse> {
    const systemPrompt = `你是一个专业的编程助手，擅长回答各种编程相关的问题。请提供准确、实用的建议和解决方案。

回答要求：
1. 准确理解问题的核心
2. 提供清晰的解释和步骤
3. 包含具体的代码示例（如适用）
4. 考虑最佳实践和常见陷阱
5. 使用中文回答`;

    const contextInfo = context ? this.buildContextInfo(context) : '';
    const userPrompt = `${contextInfo}\n\n问题: ${question}`;

    const messages: LMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    return await this.sendMessage(messages, context);
  }

  /**
   * 获取分析系统提示
   */
  private getAnalysisSystemPrompt(analysisType: string, language: string): string {
    const basePrompt = `你是一个专业的代码分析专家，专门分析${language}代码。`;

    switch (analysisType) {
      case 'quality':
        return `${basePrompt}请专注于代码质量分析，包括可读性、可维护性、代码规范等方面。`;
      case 'security':
        return `${basePrompt}请专注于安全性分析，识别潜在的安全漏洞和风险。`;
      case 'performance':
        return `${basePrompt}请专注于性能分析，识别性能瓶颈和优化机会。`;
      case 'structure':
        return `${basePrompt}请专注于代码结构分析，评估架构设计和组织方式。`;
      default:
        return `${basePrompt}请进行全面的代码分析，包括质量、安全性、性能和结构等各个方面。`;
    }
  }

  /**
   * 构建代码分析提示
   */
  private buildCodeAnalysisPrompt(
    code: string,
    language: string,
    analysisType: string,
    context?: AnalysisContext
  ): string {
    const contextInfo = context ? this.buildContextInfo(context) : '';

    return `${contextInfo}

请分析以下${language}代码：

\`\`\`${language}
${code}
\`\`\`

分析要求：
1. 提供详细的分析结果
2. 指出具体的问题和改进建议
3. 给出代码质量评分（1-10分）
4. 提供具体的修改建议和示例代码
5. 使用中文回答

请按照以下格式组织回答：
## 📊 分析概览
## 🔍 详细分析
## ⚠️ 发现的问题
## 💡 改进建议
## 📝 示例代码`;
  }

  /**
   * 构建上下文信息
   */
  private buildContextInfo(context: AnalysisContext): string {
    let contextInfo = '';

    if (context.projectPath) {
      contextInfo += `项目路径: ${context.projectPath}\n`;
    }

    if (context.fileName) {
      contextInfo += `文件名: ${context.fileName}\n`;
    }

    if (context.language) {
      contextInfo += `编程语言: ${context.language}\n`;
    }

    if (context.userIntent) {
      contextInfo += `用户意图: ${context.userIntent}\n`;
    }

    if (context.previousAnalysis && context.previousAnalysis.length > 0) {
      contextInfo += `\n历史分析:\n${context.previousAnalysis.slice(-3).join('\n')}\n`;
    }

    return contextInfo;
  }

  /**
   * 获取配置状态
   */
  public getConfigurationStatus(): {
    configured: boolean;
    model: string;
    available: boolean;
    modelCount: number;
  } {
    return {
      configured: this.isAvailable(),
      model: this.preferredModel?.name || 'N/A',
      available: vscode.lm !== undefined,
      modelCount: this.availableModels.length,
    };
  }

  /**
   * 重置服务
   */
  public reset(): void {
    this.availableModels = [];
    this.preferredModel = null;
  }
}
