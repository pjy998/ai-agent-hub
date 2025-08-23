import * as vscode from 'vscode';
import { SelfProjectScanAgent } from '../agents/SelfProjectScanAgent';
import { CSharpAnalysisCommand } from '../commands/csharp-analysis';
import { LLMMonitor } from '../monitoring/llm-monitor';
import { PerformanceMonitor } from '../config/optimization-config';
import { IntelligentParticipant, ExecutionFlow } from './base/intelligent-participant';
import { UserIntentAnalysis } from '../services/intelligent-input-analyzer';

/**
 * 项目报告生成 Chat 参与者
 * 使用GPT-4.1智能分析用户输入，提供各种报告生成功能
 */
export class ReportParticipant extends IntelligentParticipant {
  private selfAnalysisAgent: SelfProjectScanAgent;
  private csharpAnalysisCommand: CSharpAnalysisCommand;
  private llmMonitor: LLMMonitor;

  constructor() {
    super('report');
    this.selfAnalysisAgent = new SelfProjectScanAgent();
    this.csharpAnalysisCommand = new CSharpAnalysisCommand();
    this.llmMonitor = LLMMonitor.getInstance();
    this.initializeFlows();
  }

  /**
   * 初始化执行流程
   */
  protected initializeFlows(): void {
    this.registerFlow({
      name: 'project_report',
      description: '生成完整的项目分析报告，包括代码质量、架构分析等',
      supportedIntents: ['project_analysis', 'code_analysis', 'quality_check'],
      execute: async (
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken,
        analysis: UserIntentAnalysis
      ) => {
        await this.executeProjectReportRequest(request.prompt, stream, token, analysis);
      },
    });

    this.registerFlow({
      name: 'csharp_report',
      description: '专门针对C#项目的代码分析和规范检查报告',
      supportedIntents: ['csharp_analysis', 'code_standards', 'quality_check'],
      execute: async (
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken,
        analysis: UserIntentAnalysis
      ) => {
        await this.executeCSharpReportRequest(stream, token);
      },
    });

    this.registerFlow({
      name: 'llm_report',
      description: '生成AI模型使用统计和性能分析报告',
      supportedIntents: ['llm_monitoring', 'usage_statistics', 'performance_analysis'],
      execute: async (
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken,
        analysis: UserIntentAnalysis
      ) => {
        await this.executeLLMReportRequest(request.prompt, stream);
      },
    });

    this.registerFlow({
      name: 'performance_report',
      description: '生成项目性能监控和优化建议报告',
      supportedIntents: ['performance_analysis', 'optimization', 'monitoring'],
      execute: async (
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken,
        analysis: UserIntentAnalysis
      ) => {
        await this.executePerformanceReportRequest(stream);
      },
    });

    this.registerFlow({
      name: 'help',
      description: '显示报告参与者的使用帮助',
      supportedIntents: ['help', 'usage', 'guide'],
      execute: async (
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken,
        analysis: UserIntentAnalysis
      ) => {
        await this.executeHelpRequest(stream);
      },
    });

    this.setDefaultFlow('help');
  }

  /**
   * 检查工作区是否可用
   */
  private checkWorkspace(stream: vscode.ChatResponseStream): boolean {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      stream.markdown('❌ **错误**: 请先打开一个工作区才能生成报告。');
      return false;
    }
    return true;
  }

  /**
   * 执行项目报告请求
   */
  private async executeProjectReportRequest(
    prompt: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
    analysis: UserIntentAnalysis
  ): Promise<void> {
    stream.markdown('🔍 **开始项目分析**\n\n正在扫描项目结构和代码质量...');

    try {
      // 执行项目分析
      const analysis = await this.selfAnalysisAgent.scanProject();
      const report = await this.selfAnalysisAgent.generateReport(analysis);

      // 解析报告格式偏好
      const format = this.extractFormatFromPrompt(prompt);

      stream.markdown('\n\n✅ **分析完成！**\n\n');

      // 显示报告摘要
      stream.markdown('## 📊 报告摘要\n\n');
      stream.markdown(`- **项目名称**: ${report.summary.projectName}\n`);
      stream.markdown(`- **分析日期**: ${report.summary.analysisDate}\n`);
      stream.markdown(`- **整体健康度**: ${report.summary.overallHealth}/100\n`);
      stream.markdown(`- **关键问题**: ${report.summary.criticalIssues} 个\n`);
      stream.markdown(`- **改进建议**: ${report.summary.recommendations} 条\n\n`);

      // 保存完整报告
      const reportPath = await this.selfAnalysisAgent.saveReport(report, format);
      stream.markdown(`📄 **完整报告已保存**: \`${reportPath}\`\n\n`);

      // 显示关键发现
      if (report.summary.criticalIssues > 0) {
        stream.markdown('⚠️ **关键问题概览**:\n\n');
        const criticalIssues = analysis.recommendations
          .filter(r => r.priority === 'high')
          .slice(0, 3);

        criticalIssues.forEach((issue, index) => {
          stream.markdown(`${index + 1}. **${issue.title}**\n`);
          stream.markdown(`   ${issue.description}\n\n`);
        });
      }

      stream.markdown('💡 **提示**: 使用 `@report 帮助` 查看更多报告类型');
    } catch (error) {
      stream.markdown(
        `❌ **项目分析失败**: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 执行C#报告请求
   */
  private async executeCSharpReportRequest(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('🔍 **开始C#项目分析**\n\n正在分析C#代码质量和结构...');

    try {
      await this.csharpAnalysisCommand.generateProjectReport();
      stream.markdown('\n\n✅ **C#项目报告已生成！**\n\n');
      stream.markdown('📄 报告已在新的编辑器标签页中打开，包含以下内容：\n\n');
      stream.markdown('- 📊 项目概览和统计信息\n');
      stream.markdown('- 🏗️ 代码结构分析\n');
      stream.markdown('- 📈 复杂度和质量指标\n');
      stream.markdown('- ⚠️ 质量问题和改进建议\n');
      stream.markdown('- 📦 依赖关系分析\n\n');
    } catch (error) {
      stream.markdown(
        `❌ **C#分析失败**: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 执行LLM使用报告请求
   */
  private async executeLLMReportRequest(
    prompt: string,
    stream: vscode.ChatResponseStream
  ): Promise<void> {
    stream.markdown('📊 **LLM使用统计报告**\n\n');

    // 解析时间范围
    const timeRange = this.extractTimeRangeFromPrompt(prompt);

    try {
      const report = this.llmMonitor.generateReport(timeRange);
      stream.markdown(report);

      stream.markdown('\n\n💡 **提示**: \n');
      stream.markdown('- 使用 `@report llm 7天` 查看一周统计\n');
      stream.markdown('- 使用 `@report llm 1小时` 查看最近一小时\n');
    } catch (error) {
      stream.markdown(
        `❌ **LLM报告生成失败**: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 执行性能报告请求
   */
  private async executePerformanceReportRequest(stream: vscode.ChatResponseStream): Promise<void> {
    stream.markdown('⚡ **性能监控报告**\n\n');

    try {
      // 创建性能监控实例并生成报告
      const monitor = new PerformanceMonitor();
      const report = monitor.generateReport();

      if (report.trim()) {
        stream.markdown(report);
      } else {
        stream.markdown('📝 **当前没有性能监控数据**\n\n');
        stream.markdown('性能监控会在以下情况下收集数据：\n');
        stream.markdown('- 项目分析过程中\n');
        stream.markdown('- Token Probe测试期间\n');
        stream.markdown('- 大型操作执行时\n\n');
        stream.markdown('💡 **建议**: 先执行一些分析操作，然后再查看性能报告。');
      }
    } catch (error) {
      stream.markdown(
        `❌ **性能报告生成失败**: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 执行帮助请求
   */
  private async executeHelpRequest(stream: vscode.ChatResponseStream): Promise<void> {
    const helpMessage = this.generateHelpMessage();
    stream.markdown(helpMessage);
  }

  /**
   * 执行默认请求
   */
  private async executeDefaultRequest(stream: vscode.ChatResponseStream): Promise<void> {
    stream.markdown('👋 **欢迎使用报告生成器！**\n\n');
    stream.markdown('我可以帮助您生成各种类型的项目分析和统计报告。\n\n');

    stream.markdown('🚀 **快速开始**:\n');
    stream.markdown('- 输入 `项目分析` 生成完整项目报告\n');
    stream.markdown('- 输入 `c#` 生成C#代码质量报告\n');
    stream.markdown('- 输入 `llm统计` 查看LLM使用情况\n');
    stream.markdown('- 输入 `性能报告` 查看性能监控数据\n');
    stream.markdown('- 输入 `帮助` 获取详细使用指南\n\n');

    stream.markdown('💡 **提示**: 所有报告都会自动保存，方便后续查看和分享。');
  }

  /**
   * 从提示词中提取报告格式
   */
  private extractFormatFromPrompt(prompt: string): 'markdown' | 'json' | 'html' {
    if (prompt.includes('json')) return 'json';
    if (prompt.includes('html')) return 'html';
    return 'markdown'; // 默认格式
  }

  /**
   * 从提示词中提取时间范围（小时）
   */
  private extractTimeRangeFromPrompt(prompt: string): number {
    // 匹配数字+时间单位的模式
    const hourMatch = prompt.match(/(\d+)\s*[小时时]/);
    if (hourMatch) {
      return parseInt(hourMatch[1]);
    }

    const dayMatch = prompt.match(/(\d+)\s*[天日]/);
    if (dayMatch) {
      return parseInt(dayMatch[1]) * 24;
    }

    const weekMatch = prompt.match(/(\d+)\s*[周星期]/);
    if (weekMatch) {
      return parseInt(weekMatch[1]) * 24 * 7;
    }

    // 默认24小时
    return 24;
  }

  /**
   * 生成智能帮助信息
   */
  protected generateHelpMessage(): string {
    return (
      `# 📊 报告生成器使用指南\n\n` +
      `## 🎯 主要功能\n\n` +
      `- **项目分析报告**: 全面分析项目结构、代码质量和潜在问题\n` +
      `- **C#代码报告**: 专门针对C#项目的代码规范检查\n` +
      `- **AI使用报告**: 统计和分析AI模型的使用情况\n` +
      `- **性能监控报告**: 项目性能指标和优化建议\n\n` +
      `## 💬 使用示例\n\n` +
      `\`\`\`\n` +
      `@report 生成项目分析报告\n` +
      `@report 检查C#代码规范\n` +
      `@report 显示AI使用统计\n` +
      `@report 生成性能报告\n` +
      `\`\`\`\n\n` +
      `## 📋 报告格式\n\n` +
      `支持多种输出格式：\n` +
      `- **Markdown**: 适合阅读和分享\n` +
      `- **JSON**: 适合程序处理\n` +
      `- **HTML**: 适合网页展示\n\n` +
      `💡 **提示**: 您可以在请求中指定格式，例如 "生成JSON格式的项目报告"\n`
    );
  }
}
