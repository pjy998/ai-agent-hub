import * as vscode from 'vscode';
import { SelfProjectScanAgent } from '../agents/SelfProjectScanAgent';
import { CSharpAnalysisCommand } from '../commands/csharp-analysis';
import { LLMMonitor } from '../monitoring/llm-monitor';
import { PerformanceMonitor } from '../config/optimization-config';

/**
 * 项目报告生成 Chat 参与者
 * 在 GitHub Copilot Chat 中提供各种报告生成功能
 */
export class ReportParticipant {
  private selfAnalysisAgent: SelfProjectScanAgent;
  private csharpAnalysisCommand: CSharpAnalysisCommand;
  private llmMonitor: LLMMonitor;
  
  constructor() {
    this.selfAnalysisAgent = new SelfProjectScanAgent();
    this.csharpAnalysisCommand = new CSharpAnalysisCommand();
    this.llmMonitor = LLMMonitor.getInstance();
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
        stream.markdown('❌ **错误**: 请先打开一个工作区才能生成报告。');
        return;
      }
      
      // 解析用户意图
      if (this.isProjectReportRequest(prompt)) {
        await this.handleProjectReportRequest(prompt, stream, token);
      } else if (this.isCSharpReportRequest(prompt)) {
        await this.handleCSharpReportRequest(stream, token);
      } else if (this.isLLMReportRequest(prompt)) {
        await this.handleLLMReportRequest(prompt, stream);
      } else if (this.isPerformanceReportRequest(prompt)) {
        await this.handlePerformanceReportRequest(stream);
      } else if (this.isHelpRequest(prompt)) {
        await this.handleHelpRequest(stream);
      } else {
        await this.handleDefaultRequest(stream);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      stream.markdown(`❌ **报告生成错误**: ${errorMessage}`);
    }
  }
  
  /**
   * 判断是否为项目报告请求
   */
  private isProjectReportRequest(prompt: string): boolean {
    const keywords = ['项目', 'project', '分析', 'analysis', '扫描', 'scan', '自我', 'self'];
    return keywords.some(keyword => prompt.includes(keyword));
  }
  
  /**
   * 判断是否为C#报告请求
   */
  private isCSharpReportRequest(prompt: string): boolean {
    const keywords = ['c#', 'csharp', 'cs', 'dotnet', '.net'];
    return keywords.some(keyword => prompt.includes(keyword));
  }
  
  /**
   * 判断是否为LLM使用报告请求
   */
  private isLLMReportRequest(prompt: string): boolean {
    const keywords = ['llm', 'token', '使用', 'usage', '成本', 'cost', '统计', 'stats'];
    return keywords.some(keyword => prompt.includes(keyword));
  }
  
  /**
   * 判断是否为性能报告请求
   */
  private isPerformanceReportRequest(prompt: string): boolean {
    const keywords = ['性能', 'performance', '监控', 'monitor', '优化', 'optimization'];
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
   * 处理项目报告请求
   */
  private async handleProjectReportRequest(
    prompt: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
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
      
      stream.markdown('💡 **提示**: 使用 \`@report 帮助\` 查看更多报告类型');
      
    } catch (error) {
      stream.markdown(`❌ **项目分析失败**: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 处理C#报告请求
   */
  private async handleCSharpReportRequest(
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
      stream.markdown(`❌ **C#分析失败**: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 处理LLM使用报告请求
   */
  private async handleLLMReportRequest(
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
      stream.markdown('- 使用 \`@report llm 7天\` 查看一周统计\n');
      stream.markdown('- 使用 \`@report llm 1小时\` 查看最近一小时\n');
      
    } catch (error) {
      stream.markdown(`❌ **LLM报告生成失败**: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 处理性能报告请求
   */
  private async handlePerformanceReportRequest(
    stream: vscode.ChatResponseStream
  ): Promise<void> {
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
      stream.markdown(`❌ **性能报告生成失败**: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 处理帮助请求
   */
  private async handleHelpRequest(stream: vscode.ChatResponseStream): Promise<void> {
    stream.markdown('# 📊 报告生成器使用指南\n\n');
    
    stream.markdown('## 📖 功能概述\n');
    stream.markdown('报告生成器为您提供多种类型的项目分析和统计报告，帮助您了解项目状态和性能指标。\n\n');
    
    stream.markdown('## 🚀 可用报告类型\n\n');
    
    stream.markdown('### 1. 项目分析报告\n');
    stream.markdown('- `@report 项目分析` - 生成完整的项目健康度报告\n');
    stream.markdown('- `@report 项目分析 markdown` - 指定Markdown格式\n');
    stream.markdown('- `@report 项目分析 json` - 指定JSON格式\n');
    stream.markdown('- `@report 项目分析 html` - 指定HTML格式\n\n');
    
    stream.markdown('### 2. C#项目报告\n');
    stream.markdown('- `@report c#` - 生成C#代码质量分析报告\n');
    stream.markdown('- `@report csharp` - 同上\n');
    stream.markdown('- `@report .net` - 同上\n\n');
    
    stream.markdown('### 3. LLM使用统计\n');
    stream.markdown('- `@report llm` - 查看24小时LLM使用统计\n');
    stream.markdown('- `@report llm 7天` - 查看一周统计\n');
    stream.markdown('- `@report token统计` - 查看Token使用情况\n\n');
    
    stream.markdown('### 4. 性能监控报告\n');
    stream.markdown('- `@report 性能` - 查看性能监控数据\n');
    stream.markdown('- `@report 优化` - 查看优化建议\n\n');
    
    stream.markdown('## 💡 使用技巧\n');
    stream.markdown('1. 报告会自动保存到项目的reports目录\n');
    stream.markdown('2. 支持多种格式输出（Markdown、JSON、HTML）\n');
    stream.markdown('3. 可以指定时间范围查看历史数据\n');
    stream.markdown('4. 报告包含可操作的改进建议\n\n');
    
    stream.markdown('🔧 如需更多帮助，请查看项目文档或使用VS Code命令面板。');
  }
  
  /**
   * 处理默认请求
   */
  private async handleDefaultRequest(stream: vscode.ChatResponseStream): Promise<void> {
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
}