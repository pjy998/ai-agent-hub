import * as vscode from 'vscode';
import {
  TokenProbe,
  TokenProbeManager,
  COPILOT_MODELS,
  CopilotModel,
  TokenProbeConfig,
  TokenProbeResult,
} from '../features/token-probe';

/**
 * Token Probe 命令处理器
 */
export class TokenProbeCommand {
  private static readonly COMMAND_ID = 'ai-agent.tokenProbe';
  private probeManager: TokenProbeManager;

  constructor() {
    this.probeManager = TokenProbeManager.getInstance();
  }

  /**
   * 注册命令
   */
  static register(context: vscode.ExtensionContext): void {
    const command = new TokenProbeCommand();

    // 注册主命令
    const disposable = vscode.commands.registerCommand(TokenProbeCommand.COMMAND_ID, () =>
      command.execute()
    );

    context.subscriptions.push(disposable);

    // 注册相关命令
    command.registerRelatedCommands(context);
  }

  /**
   * 注册相关命令
   */
  private registerRelatedCommands(context: vscode.ExtensionContext): void {
    // 查看测试历史
    const historyCommand = vscode.commands.registerCommand('ai-agent.tokenProbeHistory', () =>
      this.showHistory()
    );

    // 清除测试历史
    const clearHistoryCommand = vscode.commands.registerCommand(
      'ai-agent.tokenProbeClearHistory',
      () => this.clearHistory()
    );

    // 快速测试（使用默认配置）
    const quickTestCommand = vscode.commands.registerCommand('ai-agent.tokenProbeQuick', () =>
      this.executeQuickTest()
    );

    context.subscriptions.push(historyCommand, clearHistoryCommand, quickTestCommand);
  }

  /**
   * 执行主命令
   */
  async execute(): Promise<void> {
    try {
      // 检查工作区
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('请先打开一个工作区才能使用Token Probe功能。');
        return;
      }

      // 显示配置选择界面
      const config = await this.showConfigurationDialog();
      if (!config) {
        return; // 用户取消
      }

      // 执行测试
      await this.runProbeWithProgress(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Token Probe执行失败: ${errorMessage}`);
    }
  }

  /**
   * 显示配置对话框
   */
  private async showConfigurationDialog(): Promise<TokenProbeConfig | null> {
    // 1. 选择模型 - 按提供商分组
    const modelsByProvider: { [key: string]: any[] } = {};

    Object.entries(COPILOT_MODELS).forEach(([key, model]) => {
      const provider = model.provider;
      if (!modelsByProvider[provider]) {
        modelsByProvider[provider] = [];
      }

      const label = (model as any).isLegacy
        ? `${model.name} (兼容)`
        : (model as any).isPreview
          ? `${model.name} (预览)`
          : model.name;

      const costInfo =
        model.costMultiplier === 0
          ? '免费'
          : model.costMultiplier === 0.33
            ? '0.33x费用'
            : '1x费用';

      modelsByProvider[provider].push({
        label: `${label} - ${costInfo}`,
        description: model.description,
        value: key,
        provider: provider,
        isPreview: (model as any).isPreview,
        isLegacy: (model as any).isLegacy,
      });
    });

    // 创建分组选项
    const modelOptions: vscode.QuickPickItem[] = [];

    // 添加推荐模型（免费且非Legacy）
    const recommendedModels = Object.entries(COPILOT_MODELS)
      .filter(([_, model]) => model.costMultiplier === 0 && !(model as any).isLegacy)
      .map(([key, model]) => ({
        label: `⭐ ${model.name}`,
        description: `${model.description} (推荐)`,
        value: key,
      }));

    if (recommendedModels.length > 0) {
      modelOptions.push(
        { label: '推荐模型 (免费)', kind: vscode.QuickPickItemKind.Separator },
        ...recommendedModels
      );
    }

    // 按提供商添加所有模型
    Object.entries(modelsByProvider).forEach(([provider, models]) => {
      modelOptions.push(
        { label: `${provider} 模型`, kind: vscode.QuickPickItemKind.Separator },
        ...models
      );
    });

    const selectedModel = (await vscode.window.showQuickPick(modelOptions, {
      placeHolder: '选择要测试的模型 (推荐选择免费模型)',
      title: 'Token Probe - 模型选择',
      matchOnDescription: true,
    })) as any;

    if (!selectedModel) {
      return null;
    }

    // 2. 选择测试模式
    const modeOptions = [
      {
        label: '🚀 快速测试',
        description: '二分法，10K-100K范围',
        value: 'fast',
      },
      {
        label: '🎯 标准测试',
        description: '二分法，10K-200K范围',
        value: 'standard',
      },
      {
        label: '🔍 深度测试',
        description: '线性搜索，更精确但较慢',
        value: 'deep',
      },
      {
        label: '⚙️ 自定义配置',
        description: '手动设置所有参数',
        value: 'custom',
      },
    ];

    const selectedMode = await vscode.window.showQuickPick(modeOptions, {
      placeHolder: '选择测试模式',
      title: 'Token Probe - 测试模式',
    });

    if (!selectedMode) {
      return null;
    }

    // 3. 根据模式生成配置
    let config: TokenProbeConfig;

    switch (selectedMode.value) {
      case 'fast':
        config = {
          model: selectedModel.value as CopilotModel,
          startTokens: 10000,
          maxTokens: 100000,
          stepSize: 10000,
          enableBinarySearch: true,
          timeout: 15000,
          retryCount: 2,
        };
        break;

      case 'standard':
        config = {
          model: selectedModel.value as CopilotModel,
          startTokens: 10000,
          maxTokens: 200000,
          stepSize: 10000,
          enableBinarySearch: true,
          timeout: 30000,
          retryCount: 3,
        };
        break;

      case 'deep':
        config = {
          model: selectedModel.value as CopilotModel,
          startTokens: 5000,
          maxTokens: 150000,
          stepSize: 5000,
          enableBinarySearch: false,
          timeout: 45000,
          retryCount: 3,
        };
        break;

      case 'custom': {
        const customConfig = await this.showCustomConfigDialog(selectedModel.value as CopilotModel);
        if (!customConfig) {
          return null;
        }
        config = customConfig;
        break;
      }

      default:
        return null;
    }

    return config;
  }

  /**
   * 显示自定义配置对话框
   */
  private async showCustomConfigDialog(model: CopilotModel): Promise<TokenProbeConfig | null> {
    try {
      // 起始Token数
      const startTokensInput = await vscode.window.showInputBox({
        prompt: '起始Token数量',
        value: '10000',
        validateInput: value => {
          const num = parseInt(value);
          if (isNaN(num) || num < 1000 || num > 50000) {
            return '请输入1000-50000之间的数字';
          }
          return null;
        },
      });

      if (!startTokensInput) return null;

      // 最大Token数
      const maxTokensInput = await vscode.window.showInputBox({
        prompt: '最大Token数量',
        value: '200000',
        validateInput: value => {
          const num = parseInt(value);
          const startTokens = parseInt(startTokensInput);
          if (isNaN(num) || num <= startTokens || num > 500000) {
            return `请输入${startTokens}-500000之间的数字`;
          }
          return null;
        },
      });

      if (!maxTokensInput) return null;

      // 步长
      const stepSizeInput = await vscode.window.showInputBox({
        prompt: '步长（仅线性搜索使用）',
        value: '10000',
        validateInput: value => {
          const num = parseInt(value);
          if (isNaN(num) || num < 1000 || num > 50000) {
            return '请输入1000-50000之间的数字';
          }
          return null;
        },
      });

      if (!stepSizeInput) return null;

      // 搜索方法
      const searchMethod = await vscode.window.showQuickPick(
        [
          { label: '二分法搜索', description: '更快，适合大范围测试', value: true },
          { label: '线性搜索', description: '更精确，但较慢', value: false },
        ],
        {
          placeHolder: '选择搜索方法',
        }
      );

      if (!searchMethod) return null;

      // 超时时间
      const timeoutInput = await vscode.window.showInputBox({
        prompt: '超时时间（毫秒）',
        value: '30000',
        validateInput: value => {
          const num = parseInt(value);
          if (isNaN(num) || num < 5000 || num > 120000) {
            return '请输入5000-120000之间的数字';
          }
          return null;
        },
      });

      if (!timeoutInput) return null;

      return {
        model,
        startTokens: parseInt(startTokensInput),
        maxTokens: parseInt(maxTokensInput),
        stepSize: parseInt(stepSizeInput),
        enableBinarySearch: searchMethod.value,
        timeout: parseInt(timeoutInput),
        retryCount: 3,
      };
    } catch (error) {
      vscode.window.showErrorMessage('配置输入失败');
      return null;
    }
  }

  /**
   * 获取模型描述
   */
  private getModelDescription(model: CopilotModel): string {
    const descriptions: Record<CopilotModel, string> = {
      'gpt-4.1': '最新GPT-4模型，大上下文窗口',
      'gpt-4o': 'GPT-4 Omni模型，多模态能力',
      'gpt-4': '标准GPT-4模型（旧版本兼容）',
      'gpt-3.5-turbo': '快速响应的GPT-3.5模型（旧版本兼容）',
      'claude-3-sonnet': 'Anthropic Claude 3 Sonnet模型（旧版本兼容）',
      'claude-3-haiku': 'Anthropic Claude 3 Haiku模型（旧版本兼容）',
    };

    return descriptions[model] || '未知模型';
  }

  /**
   * 带进度条执行测试
   */
  private async runProbeWithProgress(config: TokenProbeConfig): Promise<void> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Token Probe 测试中...',
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({ increment: 0, message: '初始化测试环境...' });

        try {
          // 创建取消令牌监听
          const cancelPromise = new Promise<never>((_, reject) => {
            token.onCancellationRequested(() => {
              reject(new Error('用户取消了测试'));
            });
          });

          // 执行测试
          const testPromise = this.executeProbeWithProgress(config, progress);

          // 等待测试完成或取消
          const result = await Promise.race([testPromise, cancelPromise]);

          // 显示结果
          await this.showResult(result);
        } catch (error) {
          if (error instanceof Error && error.message.includes('用户取消')) {
            vscode.window.showInformationMessage('Token Probe测试已取消');
          } else {
            throw error;
          }
        }
      }
    );
  }

  /**
   * 执行测试并更新进度
   */
  private async executeProbeWithProgress(
    config: TokenProbeConfig,
    progress: vscode.Progress<{ increment?: number; message?: string }>
  ): Promise<TokenProbeResult> {
    progress.report({ increment: 10, message: '生成项目摘要...' });

    // 执行测试
    const result = await this.probeManager.runProbe(config);

    progress.report({ increment: 90, message: '测试完成，生成报告...' });

    return result;
  }

  /**
   * 显示测试结果
   */
  private async showResult(result: TokenProbeResult): Promise<void> {
    const probe = new TokenProbe();
    const report = probe.generateReport(result);

    // 创建并显示结果文档
    const doc = await vscode.workspace.openTextDocument({
      content: report,
      language: 'markdown',
    });

    await vscode.window.showTextDocument(doc);

    // 显示摘要通知
    const statusIcon = result.result === 'success' ? '✅' : '❌';
    const message =
      result.result === 'success'
        ? `${statusIcon} Token Probe完成！${result.config.model}最大上下文: ${result.maxSuccessTokens.toLocaleString()} tokens`
        : `${statusIcon} Token Probe失败: ${result.error}`;

    const action = await vscode.window.showInformationMessage(message, '查看历史', '再次测试');

    if (action === '查看历史') {
      await this.showHistory();
    } else if (action === '再次测试') {
      await this.execute();
    }
  }

  /**
   * 快速测试
   */
  private async executeQuickTest(): Promise<void> {
    try {
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('请先打开一个工作区才能使用Token Probe功能。');
        return;
      }

      const config: TokenProbeConfig = {
        model: 'gpt-4.1',
        startTokens: 10000,
        maxTokens: 100000,
        stepSize: 10000,
        enableBinarySearch: true,
        timeout: 15000,
        retryCount: 2,
      };

      await this.runProbeWithProgress(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`快速测试失败: ${errorMessage}`);
    }
  }

  /**
   * 显示测试历史
   */
  private async showHistory(): Promise<void> {
    try {
      const history = this.probeManager.getTestHistory();

      if (history.length === 0) {
        vscode.window.showInformationMessage('暂无测试历史记录。');
        return;
      }

      // 生成历史报告
      const historyReport = this.probeManager.generateHistoryReport();

      // 显示历史报告
      const doc = await vscode.workspace.openTextDocument({
        content: historyReport,
        language: 'markdown',
      });

      await vscode.window.showTextDocument(doc);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`显示历史失败: ${errorMessage}`);
    }
  }

  /**
   * 清除测试历史
   */
  private async clearHistory(): Promise<void> {
    try {
      const confirm = await vscode.window.showWarningMessage(
        '确定要清除所有Token Probe测试历史记录吗？',
        '确定',
        '取消'
      );

      if (confirm === '确定') {
        this.probeManager.clearHistory();
        vscode.window.showInformationMessage('测试历史已清除。');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`清除历史失败: ${errorMessage}`);
    }
  }
}

/**
 * 注册Token Probe相关命令
 */
export function registerTokenProbeCommands(context: vscode.ExtensionContext): void {
  TokenProbeCommand.register(context);
}
