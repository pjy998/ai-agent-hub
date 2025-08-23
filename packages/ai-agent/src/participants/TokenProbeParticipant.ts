import * as vscode from 'vscode';
import { COPILOT_MODELS, CopilotModel } from '../features/token-probe';
import {
  createImprovedTokenProbe,
  ImprovedTokenProbeConfig,
  ImprovedTokenProbeResult,
} from '../features/improved-token-probe';
import { IntelligentParticipant, ExecutionFlow } from './base/intelligent-participant';
import { UserIntentAnalysis } from '../services/intelligent-input-analyzer';

/**
 * 简化的Token探测配置
 */
interface SimpleTokenProbeConfig {
  model: CopilotModel;
  maxTokens: number;
  stepSize: number;
  timeout: number;
  retryCount: number;
}

/**
 * Token Probe Chat 参与者
 * 使用GPT-4.1智能分析用户输入，提供Token限制测试功能
 */
export class TokenProbeParticipant extends IntelligentParticipant {
  constructor() {
    super('token-probe');
    this.initializeFlows();
  }

  /**
   * 初始化执行流程
   */
  protected initializeFlows(): void {
    this.flows.set('token_probe', {
      name: 'Token探测测试',
      description: '执行Token限制测试',
      supportedIntents: ['测试', '探测', 'probe', 'test', '检测', '限制'],
      execute: async (request, context, stream, token, analysis) => {
        await this.executeTokenProbeRequest(request.prompt, stream, token);
      },
    });

    this.flows.set('stats_report', {
      name: '统计报告',
      description: '显示Token测试统计信息',
      supportedIntents: ['统计', 'stats', '报告', 'report', '分析', 'analysis'],
      execute: async (request, context, stream, token, analysis) => {
        await this.executeStatsRequest(stream);
      },
    });

    this.flows.set('clear_history', {
      name: '清除历史',
      description: '清除Token测试历史记录',
      supportedIntents: ['清除', 'clear', '删除', 'delete', '重置', 'reset'],
      execute: async (request, context, stream, token, analysis) => {
        await this.executeClearRequest(stream);
      },
    });

    this.flows.set('view_history', {
      name: '查看历史',
      description: '查看Token测试历史记录',
      supportedIntents: ['历史', 'history', '记录', 'record', '之前', 'previous'],
      execute: async (request, context, stream, token, analysis) => {
        await this.executeHistoryRequest(stream);
      },
    });

    this.flows.set('model_list', {
      name: '模型列表',
      description: '显示支持的模型列表',
      supportedIntents: ['模型', 'model', '列表', 'list', '支持', 'support'],
      execute: async (request, context, stream, token, analysis) => {
        await this.executeModelListRequest(stream);
      },
    });

    this.flows.set('help', {
      name: '帮助信息',
      description: '显示Token Probe使用帮助',
      supportedIntents: ['帮助', 'help', '使用', 'usage', '如何', 'how', '指南', 'guide'],
      execute: async (request, context, stream, token, analysis) => {
        await this.executeHelpRequest(stream);
      },
    });

    this.flows.set('default', {
      name: '默认响应',
      description: '提供默认的Token Probe介绍',
      execute: async (request, context, stream, token, analysis) => {
        await this.executeDefaultRequest(stream);
      },
    });

    this.defaultFlow = 'default';
  }

  /**
   * 检查工作区状态
   */
  protected async checkWorkspaceStatus(stream: vscode.ChatResponseStream): Promise<boolean> {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      stream.markdown('❌ **错误**: 请先打开一个工作区才能使用Token Probe功能。');
      return false;
    }
    return true;
  }

  /**
   * 执行Token Probe测试请求
   */
  private async executeTokenProbeRequest(
    prompt: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    if (!(await this.checkWorkspaceStatus(stream))) {
      return;
    }
    stream.markdown('🚀 **开始Token Probe测试**\n\n正在初始化测试环境...');

    // 解析模型参数
    const model = this.extractModelFromPrompt(prompt);
    const testMode = this.extractTestModeFromPrompt(prompt);

    // 构建配置
    const config = this.buildTestConfig(model, testMode);

    stream.markdown(
      `\n📋 **测试配置**:\n- 模型: ${COPILOT_MODELS[config.model].name}\n- 模式: ${testMode}\n- 最大Token: ${config.maxTokens.toLocaleString()}\n`
    );

    try {
      // 执行测试
      stream.markdown('\n⏳ 正在执行Token限制测试，请稍候...');

      // 创建测试文本
      const testText = prompt || '这是一个Token测试文本，用于检测模型的上下文限制。';

      // 转换配置格式
      const improvedConfig: ImprovedTokenProbeConfig = {
        models: [
          {
            name: COPILOT_MODELS[config.model].name,
            maxTokens: config.maxTokens,
            costPer1kTokens: 0.002,
          },
        ],
        includeSystemPrompt: true,
        includeContext: true,
        outputFormat: 'detailed',
        showCosts: true,
      };

      const results = await createImprovedTokenProbe(improvedConfig, testText);
      const result = results[0]; // 取第一个结果

      // 显示结果
      if (result.status === 'ok' || result.status === 'warning') {
        stream.markdown(`\n✅ **测试完成！**\n\n`);
        stream.markdown(`📊 **测试结果**:\n`);
        stream.markdown(`- **模型**: ${result.model}\n`);
        stream.markdown(
          `- **Token使用**: ${result.tokens.toLocaleString()}/${result.maxTokens.toLocaleString()} tokens\n`
        );
        stream.markdown(`- **使用率**: ${result.utilization.toFixed(1)}%\n`);
        if (result.cost) {
          stream.markdown(`- **预估成本**: $${result.cost.toFixed(4)}\n`);
        }

        // 使用建议
        stream.markdown(`\n💡 **使用建议**:\n`);
        if (result.utilization < 25) {
          stream.markdown('- 适合大型项目分析和复杂任务\n');
        } else if (result.utilization < 75) {
          stream.markdown('- 适合中等规模项目和标准任务\n');
        } else {
          stream.markdown('- 适合小型项目和简单查询\n');
        }

        if (result.message) {
          stream.markdown(`\n⚠️ **注意**: ${result.message}\n`);
        }
      } else {
        stream.markdown(`\n❌ **测试失败**: ${result.message || '未知错误'}\n\n`);
        stream.markdown('🔧 **故障排除建议**:\n');
        stream.markdown('1. 检查 GitHub Copilot Chat 扩展是否正常工作\n');
        stream.markdown('2. 验证网络连接是否稳定\n');
        stream.markdown('3. 尝试重新启动 VS Code\n');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      stream.markdown(`\n❌ **测试异常**: ${errorMessage}`);
    }
  }

  /**
   * 执行统计报告请求
   */
  private async executeStatsRequest(stream: vscode.ChatResponseStream): Promise<void> {
    stream.markdown('📊 **Token使用统计**\n\n');
    stream.markdown('💡 **功能说明**:\n');
    stream.markdown('- 使用 `@token 测试` 开始Token限制测试\n');
    stream.markdown('- 支持多种模型的Token分析\n');
    stream.markdown('- 提供详细的使用率和成本估算\n\n');

    stream.markdown('📈 **支持的模型**:\n');
    Object.entries(COPILOT_MODELS).forEach(([key, model]) => {
      stream.markdown(`- **${model.name}**: 最大${model.maxTokens.toLocaleString()} tokens\n`);
    });

    stream.markdown('\n🚀 **开始测试**: 输入 `@token 测试 gpt-4` 来测试特定模型！');
    stream.markdown('\n💡 **提示**: 使用 `@token 清除` 可以清空历史记录');
  }

  /**
   * 执行清除历史请求
   */
  private async executeClearRequest(stream: vscode.ChatResponseStream): Promise<void> {
    stream.markdown(
      '🗑️ **清除历史**: 历史记录功能暂时不可用。\n\n💡 使用 `@token 测试` 开始新的测试！'
    );
  }

  /**
   * 执行历史记录请求
   */
  private async executeHistoryRequest(stream: vscode.ChatResponseStream): Promise<void> {
    stream.markdown(
      '📝 **测试历史**: 历史记录功能暂时不可用。\n\n💡 使用 `@token 测试` 开始Token Probe测试！'
    );
  }

  /**
   * 执行模型列表请求
   */
  private async executeModelListRequest(stream: vscode.ChatResponseStream): Promise<void> {
    stream.markdown('🤖 **支持的模型列表**\n\n');

    // 按提供商分组
    const providers = new Map<string, Array<{ key: string; model: any }>>();

    Object.entries(COPILOT_MODELS).forEach(([key, model]) => {
      if (!providers.has(model.provider)) {
        providers.set(model.provider, []);
      }
      providers.get(model.provider)!.push({ key, model });
    });

    providers.forEach((models, provider) => {
      stream.markdown(`### ${provider}\n\n`);

      models.forEach(({ key, model }) => {
        const costIcon = model.costMultiplier === 0 ? '🆓' : model.costMultiplier < 1 ? '💰' : '💸';
        const previewBadge = model.isPreview ? ' `预览版`' : '';
        const legacyBadge = model.isLegacy ? ' `旧版本`' : '';

        stream.markdown(`- ${costIcon} **${model.name}**${previewBadge}${legacyBadge}\n`);
        stream.markdown(`  ${model.description}\n`);
        stream.markdown(`  预估上下文: ${model.estimatedTokenLimit.toLocaleString()} tokens\n\n`);
      });
    });

    stream.markdown('💡 **使用示例**: `@token 测试 gpt-4.1` 或 `@token 快速测试`');
  }

  /**
   * 执行帮助请求
   */
  private async executeHelpRequest(stream: vscode.ChatResponseStream): Promise<void> {
    stream.markdown('# 🔍 Token Probe 使用指南\n\n');

    stream.markdown('## 📖 功能概述\n');
    stream.markdown(
      'Token Probe 是专为 GitHub Copilot Chat 设计的上下文限制测试工具，能够自动测试不同模型的最大Token上下文长度。\n\n'
    );

    stream.markdown('## 🚀 快速开始\n\n');
    stream.markdown('### 基本命令\n');
    stream.markdown('- `@token 测试` - 使用默认配置开始测试\n');
    stream.markdown('- `@token 快速测试` - 快速测试模式\n');
    stream.markdown('- `@token 测试 gpt-4.1` - 测试指定模型\n');
    stream.markdown('- `@token 历史` - 查看测试历史\n');
    stream.markdown('- `@token 统计` - 查看详细统计报告\n');
    stream.markdown('- `@token 模型` - 查看支持的模型列表\n');
    stream.markdown('- `@token 清除` - 清空测试历史记录\n\n');

    stream.markdown('### 测试模式\n');
    stream.markdown('- **快速测试**: 使用预设参数，适合新手\n');
    stream.markdown('- **标准测试**: 平衡速度和准确性\n');
    stream.markdown('- **深度测试**: 最高精度，耗时较长\n\n');

    stream.markdown('## 💡 使用技巧\n');
    stream.markdown('1. 首次使用建议先进行快速测试\n');
    stream.markdown('2. 定期测试了解模型更新情况\n');
    stream.markdown('3. 根据项目规模选择合适的模型\n');
    stream.markdown('4. 保存测试历史用于对比分析\n\n');

    stream.markdown('🔧 如需更多帮助，请使用VS Code命令面板中的 `AI Agent: Token Probe` 命令。');
  }

  /**
   * 执行默认请求
   */
  private async executeDefaultRequest(stream: vscode.ChatResponseStream): Promise<void> {
    stream.markdown('👋 **欢迎使用 Token Probe！**\n\n');
    stream.markdown('我可以帮助您测试 GitHub Copilot Chat 模型的Token上下文限制。\n\n');

    stream.markdown('🚀 **快速开始**:\n');
    stream.markdown('- 输入 `测试` 开始Token限制测试\n');
    stream.markdown('- 输入 `历史` 查看测试记录\n');
    stream.markdown('- 输入 `统计` 查看详细分析报告\n');
    stream.markdown('- 输入 `模型` 查看支持的模型\n');
    stream.markdown('- 输入 `清除` 清空历史记录\n');
    stream.markdown('- 输入 `帮助` 获取详细使用指南\n\n');

    stream.markdown('💡 **提示**: Token Probe 会自动分析当前项目并生成测试报告！');
  }

  /**
   * 从提示词中提取模型
   */
  private extractModelFromPrompt(prompt: string): CopilotModel {
    const modelKeys = Object.keys(COPILOT_MODELS) as CopilotModel[];

    for (const key of modelKeys) {
      const model = COPILOT_MODELS[key];
      if (prompt.includes(key) || prompt.includes(model.name.toLowerCase())) {
        return key;
      }
    }

    return 'gpt-4.1'; // 默认模型
  }

  /**
   * 从提示词中提取测试模式
   */
  private extractTestModeFromPrompt(prompt: string): string {
    if (prompt.includes('快速') || prompt.includes('quick')) {
      return '快速测试';
    } else if (prompt.includes('深度') || prompt.includes('deep')) {
      return '深度测试';
    } else if (prompt.includes('自定义') || prompt.includes('custom')) {
      return '自定义测试';
    }
    return '标准测试';
  }

  /**
   * 构建测试配置
   */
  private buildTestConfig(model: CopilotModel, testMode: string): SimpleTokenProbeConfig {
    const baseConfig: SimpleTokenProbeConfig = {
      model,
      maxTokens: 200000,
      stepSize: 10000,
      timeout: 30000,
      retryCount: 3,
    };

    switch (testMode) {
      case '快速测试':
        return {
          ...baseConfig,
          maxTokens: 100000,
          stepSize: 20000,
          timeout: 15000,
          retryCount: 2,
        };
      case '深度测试':
        return {
          ...baseConfig,
          maxTokens: 300000,
          stepSize: 5000,
          timeout: 60000,
          retryCount: 5,
        };
      default:
        return baseConfig;
    }
  }

  /**
   * 格式化持续时间
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }
}
