import * as vscode from 'vscode';
import { TokenProbeManager, COPILOT_MODELS, CopilotModel, TokenProbeConfig } from '../features/token-probe';

/**
 * Token Probe Chat 参与者
 * 在 GitHub Copilot Chat 中提供 Token 限制测试功能
 */
export class TokenProbeParticipant {
  private probeManager: TokenProbeManager;
  
  constructor() {
    this.probeManager = TokenProbeManager.getInstance();
  }
  
  /**
   * 处理聊天请求
   */
  async handleRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    const prompt = request.prompt.toLowerCase();
    
    try {
      // 检查工作区
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        stream.markdown('❌ **错误**: 请先打开一个工作区才能使用Token Probe功能。');
        return;
      }
      
      // 解析用户意图
      if (this.isTokenProbeRequest(prompt)) {
        await this.handleTokenProbeRequest(prompt, stream, token);
      } else if (this.isHistoryRequest(prompt)) {
        await this.handleHistoryRequest(stream);
      } else if (this.isModelListRequest(prompt)) {
        await this.handleModelListRequest(stream);
      } else if (this.isHelpRequest(prompt)) {
        await this.handleHelpRequest(stream);
      } else {
        await this.handleDefaultRequest(stream);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      stream.markdown(`❌ **Token Probe 错误**: ${errorMessage}`);
    }
  }
  
  /**
   * 判断是否为Token Probe测试请求
   */
  private isTokenProbeRequest(prompt: string): boolean {
    const keywords = ['测试', 'test', 'probe', '检测', '限制', 'limit', 'token', '上下文', 'context'];
    return keywords.some(keyword => prompt.includes(keyword));
  }
  
  /**
   * 判断是否为历史记录请求
   */
  private isHistoryRequest(prompt: string): boolean {
    const keywords = ['历史', 'history', '记录', 'record', '之前', 'previous'];
    return keywords.some(keyword => prompt.includes(keyword));
  }
  
  /**
   * 判断是否为模型列表请求
   */
  private isModelListRequest(prompt: string): boolean {
    const keywords = ['模型', 'model', '列表', 'list', '支持', 'support'];
    return keywords.some(keyword => prompt.includes(keyword));
  }
  
  /**
   * 判断是否为帮助请求
   */
  private isHelpRequest(prompt: string): boolean {
    const keywords = ['帮助', 'help', '使用', 'usage', '如何', 'how', '指南', 'guide'];
    return keywords.some(keyword => prompt.includes(keyword));
  }
  
  /**
   * 处理Token Probe测试请求
   */
  private async handleTokenProbeRequest(
    prompt: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('🚀 **开始Token Probe测试**\n\n正在初始化测试环境...');
    
    // 解析模型参数
    const model = this.extractModelFromPrompt(prompt);
    const testMode = this.extractTestModeFromPrompt(prompt);
    
    // 构建配置
    const config = this.buildTestConfig(model, testMode);
    
    stream.markdown(`\n📋 **测试配置**:\n- 模型: ${COPILOT_MODELS[config.model].name}\n- 模式: ${testMode}\n- 最大Token: ${config.maxTokens.toLocaleString()}\n`);
    
    try {
      // 执行测试
      stream.markdown('\n⏳ 正在执行Token限制测试，请稍候...');
      
      const result = await this.probeManager.runProbe(config);
      
      // 显示结果
      if (result.status === 'success') {
        stream.markdown(`\n✅ **测试完成！**\n\n`);
        stream.markdown(`📊 **测试结果**:\n`);
        stream.markdown(`- **模型**: ${result.model}\n`);
        stream.markdown(`- **最大上下文**: ${result.maxContextTokens.toLocaleString()} tokens\n`);
        stream.markdown(`- **测试时间**: ${this.formatDuration(result.totalTestTime)}\n`);
        stream.markdown(`- **测试步数**: ${result.testSteps.length}\n`);
        
        // 性能分析
        const avgResponseTime = result.testSteps.reduce((sum, step) => sum + step.responseTime, 0) / result.testSteps.length;
        stream.markdown(`\n📈 **性能分析**:\n`);
        stream.markdown(`- **平均响应时间**: ${avgResponseTime.toFixed(0)}ms\n`);
        stream.markdown(`- **成功率**: ${(result.testSteps.filter(s => s.result === 'success').length / result.testSteps.length * 100).toFixed(1)}%\n`);
        
        // 使用建议
        stream.markdown(`\n💡 **使用建议**:\n`);
        if (result.maxContextTokens > 100000) {
          stream.markdown('- 适合大型项目分析和复杂任务\n');
        } else if (result.maxContextTokens > 50000) {
          stream.markdown('- 适合中等规模项目和标准任务\n');
        } else {
          stream.markdown('- 适合小型项目和简单查询\n');
        }
        
      } else {
        stream.markdown(`\n❌ **测试失败**: ${result.error}\n\n`);
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
   * 处理历史记录请求
   */
  private async handleHistoryRequest(stream: vscode.ChatResponseStream): Promise<void> {
    const history = this.probeManager.getTestHistory();
    
    if (history.length === 0) {
      stream.markdown('📝 **测试历史**: 暂无测试记录\n\n💡 使用 `@token 测试` 开始第一次Token Probe测试！');
      return;
    }
    
    stream.markdown('📝 **Token Probe 测试历史**\n\n');
    
    history.slice(-5).reverse().forEach((result, index) => {
      const statusIcon = result.status === 'success' ? '✅' : '❌';
      const date = new Date().toLocaleDateString(); // 简化处理，实际应该保存测试时间
      
      stream.markdown(`${index + 1}. ${statusIcon} **${result.model}** - ${result.maxContextTokens.toLocaleString()} tokens\n`);
      stream.markdown(`   📅 ${date} | ⏱️ ${this.formatDuration(result.totalTestTime)}\n\n`);
    });
    
    if (history.length > 5) {
      stream.markdown(`*显示最近5条记录，共${history.length}条*`);
    }
  }
  
  /**
   * 处理模型列表请求
   */
  private async handleModelListRequest(stream: vscode.ChatResponseStream): Promise<void> {
    stream.markdown('🤖 **支持的模型列表**\n\n');
    
    // 按提供商分组
    const providers = new Map<string, Array<{key: string, model: any}>>;
    
    Object.entries(COPILOT_MODELS).forEach(([key, model]) => {
      if (!providers.has(model.provider)) {
        providers.set(model.provider, []);
      }
      providers.get(model.provider)!.push({key, model});
    });
    
    providers.forEach((models, provider) => {
      stream.markdown(`### ${provider}\n\n`);
      
      models.forEach(({key, model}) => {
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
   * 处理帮助请求
   */
  private async handleHelpRequest(stream: vscode.ChatResponseStream): Promise<void> {
    stream.markdown('# 🔍 Token Probe 使用指南\n\n');
    
    stream.markdown('## 📖 功能概述\n');
    stream.markdown('Token Probe 是专为 GitHub Copilot Chat 设计的上下文限制测试工具，能够自动测试不同模型的最大Token上下文长度。\n\n');
    
    stream.markdown('## 🚀 快速开始\n\n');
    stream.markdown('### 基本命令\n');
    stream.markdown('- `@token 测试` - 使用默认配置开始测试\n');
    stream.markdown('- `@token 快速测试` - 快速测试模式\n');
    stream.markdown('- `@token 测试 gpt-4.1` - 测试指定模型\n');
    stream.markdown('- `@token 历史` - 查看测试历史\n');
    stream.markdown('- `@token 模型` - 查看支持的模型列表\n\n');
    
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
   * 处理默认请求
   */
  private async handleDefaultRequest(stream: vscode.ChatResponseStream): Promise<void> {
    stream.markdown('👋 **欢迎使用 Token Probe！**\n\n');
    stream.markdown('我可以帮助您测试 GitHub Copilot Chat 模型的Token上下文限制。\n\n');
    
    stream.markdown('🚀 **快速开始**:\n');
    stream.markdown('- 输入 `测试` 开始Token限制测试\n');
    stream.markdown('- 输入 `历史` 查看测试记录\n');
    stream.markdown('- 输入 `模型` 查看支持的模型\n');
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
  private buildTestConfig(model: CopilotModel, testMode: string): TokenProbeConfig {
    const baseConfig: TokenProbeConfig = {
      model,
      startTokens: 10000,
      maxTokens: 200000,
      stepSize: 10000,
      enableBinarySearch: true,
      timeout: 30000,
      retryCount: 3
    };
    
    switch (testMode) {
      case '快速测试':
        return {
          ...baseConfig,
          maxTokens: 100000,
          stepSize: 20000,
          timeout: 15000,
          retryCount: 2
        };
      case '深度测试':
        return {
          ...baseConfig,
          maxTokens: 300000,
          stepSize: 5000,
          timeout: 60000,
          retryCount: 5
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