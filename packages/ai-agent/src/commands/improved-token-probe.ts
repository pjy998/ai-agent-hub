import * as vscode from 'vscode';
import { createImprovedTokenProbe, ImprovedTokenProbeConfig, ImprovedTokenProbeResult, ImprovedModelConfig } from '../features/improved-token-probe';
import { LLMMonitor } from '../monitoring/llm-monitor';
import { outputManager } from '../utils/output-manager';

/**
 * 改进的Token Probe命令处理器
 */
export class ImprovedTokenProbeCommand {
  private llmMonitor: LLMMonitor;
  
  constructor() {
    this.llmMonitor = LLMMonitor.getInstance();
  }
  
  /**
   * 注册改进的Token Probe相关命令
   */
  static registerCommands(context: vscode.ExtensionContext): void {
    const probeCommand = new ImprovedTokenProbeCommand();
    
    // 注册改进的Token Probe命令
    const improvedProbeCommand = vscode.commands.registerCommand(
      'ai-agent.improvedTokenProbe',
      () => probeCommand.runImprovedTokenProbe()
    );
    
    // 注册快速Token Probe命令
    const quickProbeCommand = vscode.commands.registerCommand(
      'ai-agent.quickTokenProbe',
      () => probeCommand.runQuickTokenProbe()
    );
    
    // 注册自定义Token Probe命令
    const customProbeCommand = vscode.commands.registerCommand(
      'ai-agent.customTokenProbe',
      () => probeCommand.runCustomTokenProbe()
    );
    
    // 注册显示Token使用统计命令
    const showStatsCommand = vscode.commands.registerCommand(
      'ai-agent.showTokenStats',
      () => probeCommand.showTokenUsageStats()
    );
    
    // 注册导出Token报告命令
    const exportReportCommand = vscode.commands.registerCommand(
      'ai-agent.exportTokenReport',
      () => probeCommand.exportTokenReport()
    );
    
    context.subscriptions.push(
      improvedProbeCommand,
      quickProbeCommand,
      customProbeCommand,
      showStatsCommand,
      exportReportCommand
    );
  }
  
  /**
   * 运行改进的Token Probe
   */
  async runImprovedTokenProbe(): Promise<void> {
    try {
      // 显示模型选择
      const selectedModel = await this.selectModel();
      if (!selectedModel) {
        return;
      }
      
      // 显示测试配置
      const config = await this.getProbeConfiguration(selectedModel);
      if (!config) {
        return;
      }
      
      // 执行测试
      await this.executeTokenProbe(config);
      
    } catch (error) {
      vscode.window.showErrorMessage(`Token Probe失败: ${error}`);
      outputManager.logError('Token Probe测试失败', error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * 运行快速Token Probe
   */
  async runQuickTokenProbe(): Promise<void> {
    try {
      const selectedModel = await this.selectModel();
      if (!selectedModel) {
        return;
      }
      
      // 使用默认快速配置
      const config: ImprovedTokenProbeConfig = {
        model: selectedModel,
        testMode: 'binary_search',
        minTestLength: 1000,
        maxTestLength: 50000,
        stepSize: 1000,
        maxAttempts: 15,
        timeout: 30000,
        includeProjectContext: true,
        includeOutputTokens: true,
        testOutputLength: 500,
        precisionThreshold: 1000
      };
      
      await this.executeTokenProbe(config);
      
    } catch (error) {
      vscode.window.showErrorMessage(`快速Token Probe失败: ${error}`);
    }
  }
  
  /**
   * 运行自定义Token Probe
   */
  async runCustomTokenProbe(): Promise<void> {
    try {
      const selectedModel = await this.selectModel();
      if (!selectedModel) {
        return;
      }
      
      const config = await this.getAdvancedConfiguration(selectedModel);
      if (!config) {
        return;
      }
      
      await this.executeTokenProbe(config);
      
    } catch (error) {
      vscode.window.showErrorMessage(`自定义Token Probe失败: ${error}`);
    }
  }
  
  /**
   * 选择模型
   */
  private async selectModel(): Promise<string | undefined> {
    const { createImprovedTokenProbe } = await import('../features/improved-token-probe');
    const probe = createImprovedTokenProbe();
    const models = (probe.constructor as any).getSupportedModels() as ImprovedModelConfig[];
    
    const modelItems = models.map(model => ({
      label: model.displayName,
      description: `最大上下文: ${model.maxContextLength.toLocaleString()} tokens`,
      detail: `输入: $${model.inputTokenPrice}/1K tokens, 输出: $${model.outputTokenPrice}/1K tokens`,
      value: model.name
    }));
    
    const selected = await vscode.window.showQuickPick(modelItems, {
      placeHolder: '选择要测试的模型',
      matchOnDescription: true,
      matchOnDetail: true
    });
    
    return selected?.value;
  }
  
  /**
   * 获取探测配置
   */
  private async getProbeConfiguration(modelName: string): Promise<ImprovedTokenProbeConfig | undefined> {
    const testModeItems = [
      {
        label: '二分搜索',
        description: '快速找到最大token限制（推荐）',
        value: 'binary_search' as const
      },
      {
        label: '线性搜索',
        description: '逐步增加token数量进行测试',
        value: 'linear_search' as const
      },
      {
        label: '自适应搜索',
        description: '先粗略后精细的混合搜索',
        value: 'adaptive' as const
      }
    ];
    
    const selectedMode = await vscode.window.showQuickPick(testModeItems, {
      placeHolder: '选择测试模式'
    });
    
    if (!selectedMode) {
      return undefined;
    }
    
    // 获取测试范围
    const minLength = await vscode.window.showInputBox({
      prompt: '最小测试长度（tokens）',
      value: '1000',
      validateInput: (value) => {
        const num = parseInt(value);
        return isNaN(num) || num < 100 ? '请输入有效的数字（≥100）' : undefined;
      }
    });
    
    if (!minLength) {
      return undefined;
    }
    
    const maxLength = await vscode.window.showInputBox({
      prompt: '最大测试长度（tokens）',
      value: '100000',
      validateInput: (value) => {
        const num = parseInt(value);
        const min = parseInt(minLength);
        return isNaN(num) || num <= min ? `请输入有效的数字（>${min}）` : undefined;
      }
    });
    
    if (!maxLength) {
      return undefined;
    }
    
    // 获取其他配置
    const includeProjectContext = await vscode.window.showQuickPick(
      [
        { label: '是', value: true },
        { label: '否', value: false }
      ],
      { placeHolder: '是否包含项目上下文？' }
    );
    
    if (includeProjectContext === undefined) {
      return undefined;
    }
    
    const includeOutputTokens = await vscode.window.showQuickPick(
      [
        { label: '是（推荐）', value: true },
        { label: '否', value: false }
      ],
      { placeHolder: '是否计算输出token消耗？' }
    );
    
    if (includeOutputTokens === undefined) {
      return undefined;
    }
    
    return {
      model: modelName,
      testMode: selectedMode.value,
      minTestLength: parseInt(minLength),
      maxTestLength: parseInt(maxLength),
      stepSize: selectedMode.value === 'linear_search' ? 2000 : 1000,
      maxAttempts: 20,
      timeout: 60000,
      includeProjectContext: includeProjectContext.value,
      includeOutputTokens: includeOutputTokens.value,
      testOutputLength: 1000,
      precisionThreshold: 500
    };
  }
  
  /**
   * 获取高级配置
   */
  private async getAdvancedConfiguration(modelName: string): Promise<ImprovedTokenProbeConfig | undefined> {
    // 创建配置面板
    const panel = vscode.window.createWebviewPanel(
      'tokenProbeConfig',
      'Token Probe 高级配置',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    
    return new Promise((resolve) => {
      panel.webview.html = this.generateConfigWebview(modelName);
      
      panel.webview.onDidReceiveMessage((message) => {
        if (message.command === 'submit') {
          resolve(message.config);
          panel.dispose();
        } else if (message.command === 'cancel') {
          resolve(undefined);
          panel.dispose();
        }
      });
      
      panel.onDidDispose(() => {
        resolve(undefined);
      });
    });
  }
  
  /**
   * 生成配置Webview
   */
  private generateConfigWebview(modelName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Token Probe 高级配置</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          
          .form-group {
            margin-bottom: 20px;
          }
          
          label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          }
          
          input, select {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 3px;
          }
          
          .checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .checkbox-group input[type="checkbox"] {
            width: auto;
          }
          
          .button-group {
            display: flex;
            gap: 10px;
            margin-top: 30px;
          }
          
          button {
            padding: 10px 20px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
          }
          
          .primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
          }
          
          .secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }
          
          .description {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <h1>🔧 Token Probe 高级配置</h1>
        <p>模型: <strong>${modelName}</strong></p>
        
        <form id="configForm">
          <div class="form-group">
            <label for="testMode">测试模式</label>
            <select id="testMode">
              <option value="binary_search">二分搜索（推荐）</option>
              <option value="linear_search">线性搜索</option>
              <option value="adaptive">自适应搜索</option>
            </select>
            <div class="description">选择token限制探测的搜索策略</div>
          </div>
          
          <div class="form-group">
            <label for="minTestLength">最小测试长度（tokens）</label>
            <input type="number" id="minTestLength" value="1000" min="100">
            <div class="description">测试的起始token数量</div>
          </div>
          
          <div class="form-group">
            <label for="maxTestLength">最大测试长度（tokens）</label>
            <input type="number" id="maxTestLength" value="200000" min="1000">
            <div class="description">测试的最大token数量</div>
          </div>
          
          <div class="form-group">
            <label for="stepSize">步长（tokens）</label>
            <input type="number" id="stepSize" value="2000" min="100">
            <div class="description">线性搜索时每次增加的token数量</div>
          </div>
          
          <div class="form-group">
            <label for="maxAttempts">最大尝试次数</label>
            <input type="number" id="maxAttempts" value="25" min="5" max="50">
            <div class="description">防止无限测试的安全限制</div>
          </div>
          
          <div class="form-group">
            <label for="timeout">超时时间（毫秒）</label>
            <input type="number" id="timeout" value="60000" min="10000">
            <div class="description">单次API调用的超时时间</div>
          </div>
          
          <div class="form-group">
            <label for="testOutputLength">测试输出长度（tokens）</label>
            <input type="number" id="testOutputLength" value="1000" min="100">
            <div class="description">请求的输出token数量</div>
          </div>
          
          <div class="form-group">
            <label for="precisionThreshold">精度阈值（tokens）</label>
            <input type="number" id="precisionThreshold" value="500" min="10">
            <div class="description">达到此精度时停止测试</div>
          </div>
          
          <div class="form-group">
            <div class="checkbox-group">
              <input type="checkbox" id="includeProjectContext" checked>
              <label for="includeProjectContext">包含项目上下文</label>
            </div>
            <div class="description">在测试内容中包含当前项目的信息</div>
          </div>
          
          <div class="form-group">
            <div class="checkbox-group">
              <input type="checkbox" id="includeOutputTokens" checked>
              <label for="includeOutputTokens">计算输出token消耗</label>
            </div>
            <div class="description">在总token计算中包含模型输出的token数量</div>
          </div>
          
          <div class="button-group">
            <button type="submit" class="primary">开始测试</button>
            <button type="button" class="secondary" onclick="cancel()">取消</button>
          </div>
        </form>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          document.getElementById('configForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const config = {
              model: '${modelName}',
              testMode: document.getElementById('testMode').value,
              minTestLength: parseInt(document.getElementById('minTestLength').value),
              maxTestLength: parseInt(document.getElementById('maxTestLength').value),
              stepSize: parseInt(document.getElementById('stepSize').value),
              maxAttempts: parseInt(document.getElementById('maxAttempts').value),
              timeout: parseInt(document.getElementById('timeout').value),
              includeProjectContext: document.getElementById('includeProjectContext').checked,
              includeOutputTokens: document.getElementById('includeOutputTokens').checked,
              testOutputLength: parseInt(document.getElementById('testOutputLength').value),
              precisionThreshold: parseInt(document.getElementById('precisionThreshold').value)
            };
            
            vscode.postMessage({
              command: 'submit',
              config: config
            });
          });
          
          function cancel() {
            vscode.postMessage({
              command: 'cancel'
            });
          }
        </script>
      </body>
      </html>
    `;
  }
  
  /**
   * 执行Token探测
   */
  private async executeTokenProbe(config: ImprovedTokenProbeConfig): Promise<void> {
    const channel = outputManager.getTokenProbeChannel();
    channel.show();
    channel.clear();
    
    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Token Probe: ${config.model}`,
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: '初始化Token Probe...' });
      
      const probe = createImprovedTokenProbe();
      
      progress.report({ increment: 10, message: '开始token限制测试...' });
      
      const result = await probe.runImprovedProbe(config);
      
      progress.report({ increment: 90, message: '生成测试报告...' });
      
      await this.displayResults(result);
      
      progress.report({ increment: 100, message: '测试完成' });
      
      // 显示完成通知
      const action = await vscode.window.showInformationMessage(
        `Token Probe完成！实际最大token: ${result.actualMaxTokens.toLocaleString()}, 成功率: ${result.successRate.toFixed(1)}%`,
        '查看详细报告',
        '查看使用统计'
      );
      
      if (action === '查看详细报告') {
        await this.generateDetailedReport(result);
      } else if (action === '查看使用统计') {
        await this.showTokenUsageStats();
      }
    });
  }
  
  /**
   * 显示测试结果
   */
  private async displayResults(result: ImprovedTokenProbeResult): Promise<void> {
    const channel = outputManager.getTokenProbeChannel();
    
    channel.appendLine('\n' + '='.repeat(60));
    channel.appendLine('🎯 Token Probe 测试结果');
    channel.appendLine('='.repeat(60));
    
    channel.appendLine(`\n📊 基本信息`);
    channel.appendLine(`模型: ${result.model}`);
    channel.appendLine(`理论最大上下文: ${result.maxContextLength.toLocaleString()} tokens`);
    channel.appendLine(`实际最大token: ${result.actualMaxTokens.toLocaleString()} tokens`);
    channel.appendLine(`测试时间: ${(result.totalTestTime / 1000).toFixed(1)}秒`);
    
    channel.appendLine(`\n📈 性能指标`);
    channel.appendLine(`成功率: ${result.successRate.toFixed(1)}%`);
    channel.appendLine(`平均响应时间: ${result.averageResponseTime.toFixed(0)}ms`);
    channel.appendLine(`总成本: $${result.totalCost.toFixed(4)}`);
    channel.appendLine(`吞吐量: ${result.performanceMetrics.throughput.toFixed(1)} tokens/秒`);
    channel.appendLine(`错误率: ${result.performanceMetrics.errorRate.toFixed(1)}%`);
    
    channel.appendLine(`\n🎯 精度评估`);
    channel.appendLine(`精度: ${result.precisionAssessment.precisionPercentage.toFixed(1)}%`);
    channel.appendLine(`是否达到精度要求: ${result.precisionAssessment.isPrecise ? '是' : '否'}`);
    channel.appendLine(`置信区间: ${result.precisionAssessment.confidenceInterval.min.toLocaleString()} - ${result.precisionAssessment.confidenceInterval.max.toLocaleString()} tokens`);
    
    channel.appendLine(`\n⏱️ 延迟分布`);
    channel.appendLine(`P50: ${result.performanceMetrics.latencyDistribution.p50}ms`);
    channel.appendLine(`P90: ${result.performanceMetrics.latencyDistribution.p90}ms`);
    channel.appendLine(`P95: ${result.performanceMetrics.latencyDistribution.p95}ms`);
    channel.appendLine(`P99: ${result.performanceMetrics.latencyDistribution.p99}ms`);
    
    channel.appendLine(`\n📋 测试步骤详情`);
    channel.appendLine('-'.repeat(40));
    result.steps.forEach((step, index) => {
      const status = step.result === 'success' ? '✅' : step.result === 'failure' ? '❌' : '⚠️';
      channel.appendLine(
        `${status} 步骤${step.stepNumber}: ${step.totalTokenCount.toLocaleString()} tokens ` +
        `(${step.responseTime}ms, $${step.estimatedCost.toFixed(4)})`
      );
      
      if (step.errorMessage && index < 5) { // 只显示前5个错误
        channel.appendLine(`   错误: ${step.errorMessage}`);
      }
    });
    
    if (result.steps.length > 10) {
      channel.appendLine(`... 还有 ${result.steps.length - 10} 个步骤`);
    }
  }
  
  /**
   * 生成详细报告
   */
  private async generateDetailedReport(result: ImprovedTokenProbeResult): Promise<void> {
    const reportContent = this.generateReportContent(result);
    
    const doc = await vscode.workspace.openTextDocument({
      content: reportContent,
      language: 'markdown'
    });
    
    await vscode.window.showTextDocument(doc);
  }
  
  /**
   * 生成报告内容
   */
  private generateReportContent(result: ImprovedTokenProbeResult): string {
    const timestamp = new Date().toLocaleString();
    
    return `# Token Probe 详细报告\n\n` +
           `**模型:** ${result.model}  \n` +
           `**测试时间:** ${timestamp}  \n` +
           `**测试耗时:** ${(result.totalTestTime / 1000).toFixed(1)}秒  \n\n` +
           
           `## 📊 测试结果概览\n\n` +
           `| 指标 | 数值 |\n` +
           `|------|------|\n` +
           `| 理论最大上下文 | ${result.maxContextLength.toLocaleString()} tokens |\n` +
           `| 实际最大token | ${result.actualMaxTokens.toLocaleString()} tokens |\n` +
           `| 成功率 | ${result.successRate.toFixed(1)}% |\n` +
           `| 平均响应时间 | ${result.averageResponseTime.toFixed(0)}ms |\n` +
           `| 总成本 | $${result.totalCost.toFixed(4)} |\n` +
           `| 吞吐量 | ${result.performanceMetrics.throughput.toFixed(1)} tokens/秒 |\n` +
           `| 错误率 | ${result.performanceMetrics.errorRate.toFixed(1)}% |\n\n` +
           
           `## 🎯 精度分析\n\n` +
           `- **精度百分比:** ${result.precisionAssessment.precisionPercentage.toFixed(1)}%\n` +
           `- **是否达到精度要求:** ${result.precisionAssessment.isPrecise ? '✅ 是' : '❌ 否'}\n` +
           `- **置信区间:** ${result.precisionAssessment.confidenceInterval.min.toLocaleString()} - ${result.precisionAssessment.confidenceInterval.max.toLocaleString()} tokens\n\n` +
           
           `## ⏱️ 性能指标\n\n` +
           `### 延迟分布\n\n` +
           `| 百分位 | 延迟 |\n` +
           `|--------|------|\n` +
           `| P50 | ${result.performanceMetrics.latencyDistribution.p50}ms |\n` +
           `| P90 | ${result.performanceMetrics.latencyDistribution.p90}ms |\n` +
           `| P95 | ${result.performanceMetrics.latencyDistribution.p95}ms |\n` +
           `| P99 | ${result.performanceMetrics.latencyDistribution.p99}ms |\n\n` +
           
           `## 📋 详细测试步骤\n\n` +
           `| 步骤 | Token数量 | 输入Tokens | 输出Tokens | 结果 | 响应时间 | 成本 |\n` +
           `|------|-----------|------------|------------|------|----------|------|\n` +
           result.steps.map(step => 
             `| ${step.stepNumber} | ${step.totalTokenCount.toLocaleString()} | ${step.inputTokenCount.toLocaleString()} | ${step.actualOutputTokenCount || 'N/A'} | ${step.result === 'success' ? '✅' : step.result === 'failure' ? '❌' : '⚠️'} | ${step.responseTime}ms | $${step.estimatedCost.toFixed(4)} |`
           ).join('\n') + '\n\n' +
           
           `## 📈 成本分析\n\n` +
           `- **总成本:** $${result.totalCost.toFixed(4)}\n` +
           `- **平均每步成本:** $${(result.totalCost / result.steps.length).toFixed(4)}\n` +
           `- **成功步骤成本:** $${result.steps.filter(s => s.result === 'success').reduce((sum, s) => sum + s.estimatedCost, 0).toFixed(4)}\n\n` +
           
           `## 🔍 错误分析\n\n` +
           result.steps.filter(step => step.errorMessage).map(step => 
             `- **步骤${step.stepNumber}:** ${step.errorMessage}`
           ).join('\n') + '\n\n' +
           
           `---\n` +
           `*报告由 AI Agent Improved Token Probe 自动生成于 ${timestamp}*`;
  }
  
  /**
   * 显示Token使用统计
   */
  async showTokenUsageStats(): Promise<void> {
    const stats = this.llmMonitor.getUsageStats();
    
    const panel = vscode.window.createWebviewPanel(
      'tokenStats',
      'Token 使用统计',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    
    panel.webview.html = this.generateStatsWebview(stats);
  }
  
  /**
   * 生成统计Webview
   */
  private generateStatsWebview(stats: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Token 使用统计</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .stat-card {
            background: var(--vscode-panel-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
          }
          
          .stat-title {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 10px;
          }
          
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
          }
          
          .chart-container {
            background: var(--vscode-panel-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <h1>📊 Token 使用统计</h1>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-title">总调用次数</div>
            <div class="stat-value">${stats.totalCalls || 0}</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-title">总输入Tokens</div>
            <div class="stat-value">${(stats.totalInputTokens || 0).toLocaleString()}</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-title">总输出Tokens</div>
            <div class="stat-value">${(stats.totalOutputTokens || 0).toLocaleString()}</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-title">总成本</div>
            <div class="stat-value">$${(stats.totalCost || 0).toFixed(4)}</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-title">平均响应时间</div>
            <div class="stat-value">${(stats.averageResponseTime || 0).toFixed(0)}ms</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-title">成功率</div>
            <div class="stat-value">${(stats.successRate || 0).toFixed(1)}%</div>
          </div>
        </div>
        
        <div class="chart-container">
          <h3>📈 使用趋势</h3>
          <p>详细的使用趋势图表功能正在开发中...</p>
        </div>
      </body>
      </html>
    `;
  }
  
  /**
   * 导出Token报告
   */
  async exportTokenReport(): Promise<void> {
    try {
      const stats = this.llmMonitor.getUsageStats();
      const report = this.llmMonitor.generateReport();
      
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`token-usage-report-${new Date().toISOString().split('T')[0]}.json`),
        filters: {
          'JSON Files': ['json'],
          'All Files': ['*']
        }
      });
      
      if (saveUri) {
        const reportData = {
          timestamp: new Date().toISOString(),
          stats,
          report
        };
        
        await vscode.workspace.fs.writeFile(
          saveUri,
          Buffer.from(JSON.stringify(reportData, null, 2), 'utf8')
        );
        
        vscode.window.showInformationMessage(`Token使用报告已导出到: ${saveUri.fsPath}`);
      }
      
    } catch (error) {
      vscode.window.showErrorMessage(`导出报告失败: ${error}`);
    }
  }
}

/**
 * 注册改进的Token Probe命令
 */
export function registerImprovedTokenProbeCommands(context: vscode.ExtensionContext): void {
  ImprovedTokenProbeCommand.registerCommands(context);
}