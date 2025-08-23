import * as vscode from 'vscode';
import { CSharpAnalysisCommand } from '../commands/csharp-analysis';
import { getCSharpAnalyzer, CSharpProjectInfo } from '../analyzers/csharp-analyzer';
import { outputManager } from '../utils/output-manager';
import * as path from 'path';

/**
 * 通用代码分析 Chat 参与者
 * 在 GitHub Copilot Chat 中提供多语言项目分析功能
 * 支持自动检测项目语言类型并提供相应的分析服务
 */
export class CodeAnalysisParticipant {
  private analysisCommand: CSharpAnalysisCommand;
  
  constructor() {
    this.analysisCommand = new CSharpAnalysisCommand();
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
        stream.markdown('❌ **错误**: 请先打开一个包含代码项目的工作区。');
        return;
      }
      
      // 检测项目语言类型
      const projectLanguage = await this.detectProjectLanguage();
      if (!projectLanguage) {
        stream.markdown('❌ **错误**: 未检测到支持的项目类型。当前支持：C#、TypeScript、JavaScript、Python。');
        return;
      }
      
      // 解析用户意图
      if (this.isProjectAnalysisRequest(prompt)) {
        await this.handleProjectAnalysis(stream, token);
      } else if (this.isQualityCheckRequest(prompt)) {
        await this.handleQualityCheck(stream, token);
      } else if (this.isReportRequest(prompt)) {
        await this.handleReportGeneration(stream, token);
      } else if (this.isIssuesRequest(prompt)) {
        await this.handleIssuesDisplay(stream, token);
      } else if (this.isStatsRequest(prompt)) {
        await this.handleStatsDisplay(stream, token);
      } else if (this.isHelpRequest(prompt)) {
        await this.handleHelpRequest(stream);
      } else {
        await this.handleDefaultRequest(stream, projectLanguage);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      stream.markdown(`❌ **代码分析错误**: ${errorMessage}`);
      outputManager.logError('代码分析Chat参与者错误', error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * 检测项目语言类型
   */
  private async detectProjectLanguage(): Promise<string | null> {
    const workspaceFolder = vscode.workspace.workspaceFolders![0];
    const workspacePath = workspaceFolder.uri.fsPath;
    
    // 检查项目文件以确定语言类型
    const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 100);
    
    // C# 项目检测
    const hasCSharpFiles = files.some(file => 
      file.fsPath.endsWith('.cs') || 
      file.fsPath.endsWith('.csproj') || 
      file.fsPath.endsWith('.sln')
    );
    
    // TypeScript 项目检测
    const hasTypeScriptFiles = files.some(file => 
      file.fsPath.endsWith('.ts') || 
      file.fsPath.endsWith('.tsx') ||
      file.fsPath.includes('tsconfig.json')
    );
    
    // JavaScript 项目检测
    const hasJavaScriptFiles = files.some(file => 
      file.fsPath.endsWith('.js') || 
      file.fsPath.endsWith('.jsx') ||
      file.fsPath.includes('package.json')
    );
    
    // Python 项目检测
    const hasPythonFiles = files.some(file => 
      file.fsPath.endsWith('.py') ||
      file.fsPath.includes('requirements.txt') ||
      file.fsPath.includes('setup.py')
    );
    
    // 优先级：C# > TypeScript > JavaScript > Python
    if (hasCSharpFiles) return 'csharp';
    if (hasTypeScriptFiles) return 'typescript';
    if (hasJavaScriptFiles) return 'javascript';
    if (hasPythonFiles) return 'python';
    
    return null;
  }
  
  /**
   * 判断是否为项目分析请求
   */
  private isProjectAnalysisRequest(prompt: string): boolean {
    const keywords = ['分析项目', '分析', 'analyze', 'project', '项目分析', '扫描项目', 'scan'];
    return keywords.some(keyword => prompt.includes(keyword));
  }
  
  /**
   * 判断是否为代码质量检查请求
   */
  private isQualityCheckRequest(prompt: string): boolean {
    const keywords = ['质量', 'quality', '编码规范', 'standards', '规范检查', 'check'];
    return keywords.some(keyword => prompt.includes(keyword));
  }
  
  /**
   * 判断是否为报告生成请求
   */
  private isReportRequest(prompt: string): boolean {
    const keywords = ['报告', 'report', '生成报告', 'generate', '导出', 'export'];
    return keywords.some(keyword => prompt.includes(keyword));
  }
  
  /**
   * 判断是否为问题显示请求
   */
  private isIssuesRequest(prompt: string): boolean {
    const keywords = ['问题', 'issues', '错误', 'errors', '警告', 'warnings', '建议', 'suggestions'];
    return keywords.some(keyword => prompt.includes(keyword));
  }
  
  /**
   * 判断是否为统计信息请求
   */
  private isStatsRequest(prompt: string): boolean {
    const keywords = ['统计', 'stats', '数据', 'data', '指标', 'metrics', '概览', 'overview'];
    return keywords.some(keyword => prompt.includes(keyword));
  }
  
  /**
   * 判断是否为帮助请求
   */
  private isHelpRequest(prompt: string): boolean {
    const keywords = ['帮助', 'help', '使用', 'usage', '指南', 'guide', '命令', 'commands'];
    return keywords.some(keyword => prompt.includes(keyword));
  }
  
  /**
   * 处理项目分析请求
   */
  private async handleProjectAnalysis(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('🔍 **开始 C# 项目分析...**\n\n');
    
    const workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;
    stream.markdown(`📁 分析项目: ${workspacePath}\n`);
    
    try {
      const analyzer = getCSharpAnalyzer();
      const startTime = Date.now();
      
      stream.markdown('⏳ 正在扫描项目文件...\n');
      const projectInfo = await analyzer.analyzeProject(workspacePath);
      
      const endTime = Date.now();
      const analysisTime = endTime - startTime;
      
      stream.markdown('✅ 分析完成！\n\n');
      
      // 显示分析摘要
      await this.displayAnalysisSummary(projectInfo, analysisTime, stream);
      
    } catch (error) {
      stream.markdown(`❌ 分析失败: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }
  
  /**
   * 处理代码质量检查请求
   */
  private async handleQualityCheck(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('🔍 **开始 C# 代码质量检查...**\n\n');
    
    try {
      const workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;
      const analyzer = getCSharpAnalyzer();
      const projectInfo = await analyzer.analyzeProject(workspacePath);
      
      await this.displayQualityAssessment(projectInfo, stream);
      
    } catch (error) {
      stream.markdown(`❌ 质量检查失败: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }
  
  /**
   * 处理报告生成请求
   */
  private async handleReportGeneration(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('📊 **生成 C# 项目分析报告...**\n\n');
    
    try {
      await this.analysisCommand.generateProjectReport();
      stream.markdown('✅ 报告已生成并保存到工作区\n');
      stream.markdown('💡 您可以在文件资源管理器中查看生成的报告文件\n');
      
    } catch (error) {
      stream.markdown(`❌ 报告生成失败: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }
  
  /**
   * 处理问题显示请求
   */
  private async handleIssuesDisplay(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('⚠️ **显示 C# 项目质量问题...**\n\n');
    
    try {
      await this.analysisCommand.showQualityIssues();
      stream.markdown('✅ 质量问题已在新窗口中显示\n');
      stream.markdown('💡 您可以在问题面板中查看详细的问题列表\n');
      
    } catch (error) {
      stream.markdown(`❌ 问题显示失败: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }
  
  /**
   * 处理统计信息显示请求
   */
  private async handleStatsDisplay(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('📈 **显示 C# 项目统计信息...**\n\n');
    
    try {
      const workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;
      const analyzer = getCSharpAnalyzer();
      const projectInfo = await analyzer.analyzeProject(workspacePath);
      
      await this.displayProjectStats(projectInfo, stream);
      
    } catch (error) {
      stream.markdown(`❌ 统计信息获取失败: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }
  
  /**
   * 处理帮助请求
   */
  private async handleHelpRequest(stream: vscode.ChatResponseStream): Promise<void> {
    stream.markdown('# 🔍 C# 项目分析助手\n\n');
    
    stream.markdown('## 📖 功能概述\n');
    stream.markdown('专门为 C# 项目提供深度代码分析、质量评估和编码规范检查的智能助手。\n\n');
    
    stream.markdown('## 🚀 主要功能\n\n');
    stream.markdown('### 项目分析\n');
    stream.markdown('- `@csharp 分析项目` - 完整的项目结构和代码分析\n');
    stream.markdown('- `@csharp 分析` - 快速项目扫描\n');
    stream.markdown('- `@csharp 扫描` - 项目文件扫描\n\n');
    
    stream.markdown('### 代码质量\n');
    stream.markdown('- `@csharp 质量检查` - 代码质量评估\n');
    stream.markdown('- `@csharp 编码规范` - 编码规范检查\n');
    stream.markdown('- `@csharp 规范` - 代码规范验证\n\n');
    
    stream.markdown('### 报告生成\n');
    stream.markdown('- `@csharp 生成报告` - 生成详细分析报告\n');
    stream.markdown('- `@csharp 报告` - 快速报告生成\n');
    stream.markdown('- `@csharp 导出` - 导出分析结果\n\n');
    
    stream.markdown('### 问题查看\n');
    stream.markdown('- `@csharp 显示问题` - 显示代码质量问题\n');
    stream.markdown('- `@csharp 问题` - 查看问题列表\n');
    stream.markdown('- `@csharp 建议` - 获取改进建议\n\n');
    
    stream.markdown('### 统计信息\n');
    stream.markdown('- `@csharp 统计` - 项目统计信息\n');
    stream.markdown('- `@csharp 数据` - 项目数据概览\n');
    stream.markdown('- `@csharp 指标` - 质量指标\n\n');
    
    stream.markdown('## 💡 使用技巧\n');
    stream.markdown('1. 确保工作区包含有效的 C# 项目文件（.csproj 或 .sln）\n');
    stream.markdown('2. 首次分析可能需要较长时间，请耐心等待\n');
    stream.markdown('3. 定期进行质量检查以保持代码质量\n');
    stream.markdown('4. 使用生成的报告进行团队代码审查\n\n');
    
    stream.markdown('🔧 如需更多帮助，请使用VS Code命令面板中的 `AI Agent: Analyze Project` 命令。');
  }
  
  /**
   * 获取语言显示名称
   */
  private getLanguageDisplayName(language?: string): string {
    switch (language) {
      case 'csharp': return 'C# ';
      case 'typescript': return 'TypeScript ';
      case 'javascript': return 'JavaScript ';
      case 'python': return 'Python ';
      default: return '通用代码';
    }
  }
  
  /**
   * 处理默认请求
   */
  private async handleDefaultRequest(stream: vscode.ChatResponseStream, projectLanguage?: string): Promise<void> {
    const languageName = this.getLanguageDisplayName(projectLanguage);
    stream.markdown(`👋 **欢迎使用${languageName}项目分析助手！**\n\n`);
    
    stream.markdown('我可以帮助您：\n');
    stream.markdown('- 🔍 **分析项目**: `@codeanalysis 分析项目`\n');
    stream.markdown('- 🎯 **质量检查**: `@codeanalysis 质量检查`\n');
    stream.markdown('- 📊 **生成报告**: `@codeanalysis 生成报告`\n');
    stream.markdown('- ⚠️ **显示问题**: `@codeanalysis 显示问题`\n');
    stream.markdown('- 📈 **查看统计**: `@codeanalysis 统计`\n');
    stream.markdown('- ❓ **获取帮助**: `@codeanalysis 帮助`\n\n');
    
    if (projectLanguage) {
      stream.markdown(`💡 **提示**: 检测到${languageName}项目，已为您启用相应的分析功能。`);
    } else {
      stream.markdown('💡 **提示**: 请确保您的工作区包含有效的项目文件。');
    }
  }
  
  /**
   * 显示分析摘要
   */
  private async displayAnalysisSummary(
    projectInfo: CSharpProjectInfo,
    analysisTime: number,
    stream: vscode.ChatResponseStream
  ): Promise<void> {
    stream.markdown('## 📋 分析摘要\n\n');
    
    // 基本信息
    stream.markdown(`**项目名称**: ${projectInfo.projectName}\n`);
    stream.markdown(`**项目类型**: ${projectInfo.projectType}\n`);
    stream.markdown(`**分析时间**: ${this.formatDuration(analysisTime)}\n`);
    stream.markdown(`**总体评分**: ${projectInfo.qualityAssessment.overallScore.toFixed(1)}/100\n\n`);
    
    // 文件统计
    stream.markdown('### 📊 文件统计\n\n');
    stream.markdown(`- **C# 文件**: ${projectInfo.codeMetrics.totalFiles} 个\n`);
    stream.markdown(`- **代码行数**: ${projectInfo.codeMetrics.totalLines.toLocaleString()} 行\n`);
    stream.markdown(`- **类数量**: ${projectInfo.codeMetrics.totalClasses} 个\n`);
    stream.markdown(`- **方法数量**: ${projectInfo.codeMetrics.totalMethods} 个\n\n`);
    
    // 质量评估
    const qa = projectInfo.qualityAssessment;
    stream.markdown('### 🎯 质量评估\n\n');
    stream.markdown(`- **代码结构**: ${qa.structureScore.toFixed(1)}/100\n`);
    stream.markdown(`- **命名规范**: ${qa.namingScore.toFixed(1)}/100\n`);
    stream.markdown(`- **复杂度**: ${qa.complexityScore.toFixed(1)}/100\n`);
    stream.markdown(`- **文档化**: ${qa.documentationScore.toFixed(1)}/100\n\n`);
    
    // 问题统计
    const issues = projectInfo.qualityAssessment.issues;
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;
    const infoCount = issues.filter(i => i.type === 'info').length;
    
    stream.markdown('### ⚠️ 问题统计\n\n');
    stream.markdown(`- 🔴 **错误**: ${errorCount} 个\n`);
    stream.markdown(`- 🟡 **警告**: ${warningCount} 个\n`);
    stream.markdown(`- 🔵 **信息**: ${infoCount} 个\n\n`);
    
    if (issues.length > 0) {
      stream.markdown('💡 使用 `@csharp 显示问题` 查看详细问题列表\n');
    }
    
    stream.markdown('📊 使用 `@csharp 生成报告` 获取完整分析报告');
  }
  
  /**
   * 显示质量评估
   */
  private async displayQualityAssessment(
    projectInfo: CSharpProjectInfo,
    stream: vscode.ChatResponseStream
  ): Promise<void> {
    const qa = projectInfo.qualityAssessment;
    
    stream.markdown('## 🎯 代码质量评估\n\n');
    
    // 总体评分
    const scoreEmoji = qa.overallScore >= 80 ? '🟢' : qa.overallScore >= 60 ? '🟡' : '🔴';
    stream.markdown(`### ${scoreEmoji} 总体评分: ${qa.overallScore.toFixed(1)}/100\n\n`);
    
    // 详细评分
    stream.markdown('### 📊 详细评分\n\n');
    stream.markdown(`| 评估项目 | 得分 | 等级 |\n`);
    stream.markdown(`|---------|------|------|\n`);
    stream.markdown(`| 代码结构 | ${qa.structureScore.toFixed(1)} | ${this.getScoreGrade(qa.structureScore)} |\n`);
    stream.markdown(`| 命名规范 | ${qa.namingScore.toFixed(1)} | ${this.getScoreGrade(qa.namingScore)} |\n`);
    stream.markdown(`| 复杂度 | ${qa.complexityScore.toFixed(1)} | ${this.getScoreGrade(qa.complexityScore)} |\n`);
    stream.markdown(`| 文档化 | ${qa.documentationScore.toFixed(1)} | ${this.getScoreGrade(qa.documentationScore)} |\n\n`);
    
    // 改进建议
    if (qa.recommendations && qa.recommendations.length > 0) {
      stream.markdown('### 💡 改进建议\n\n');
      qa.recommendations.slice(0, 5).forEach((rec, index) => {
        stream.markdown(`${index + 1}. ${rec}\n`);
      });
      
      if (qa.recommendations.length > 5) {
        stream.markdown(`\n... 还有 ${qa.recommendations.length - 5} 条建议\n`);
      }
    }
  }
  
  /**
   * 显示项目统计信息
   */
  private async displayProjectStats(
    projectInfo: CSharpProjectInfo,
    stream: vscode.ChatResponseStream
  ): Promise<void> {
    stream.markdown('## 📈 项目统计信息\n\n');
    
    // 基础统计
    stream.markdown('### 📊 基础统计\n\n');
    stream.markdown(`| 项目 | 数量 |\n`);
    stream.markdown(`|------|------|\n`);
    stream.markdown(`| C# 文件 | ${projectInfo.codeMetrics.totalFiles} |\n`);
    stream.markdown(`| 代码行数 | ${projectInfo.codeMetrics.totalLines.toLocaleString()} |\n`);
    stream.markdown(`| 类 | ${projectInfo.codeMetrics.totalClasses} |\n`);
    stream.markdown(`| 接口 | ${projectInfo.codeMetrics.totalInterfaces} |\n`);
    stream.markdown(`| 方法 | ${projectInfo.codeMetrics.totalMethods} |\n`);
    stream.markdown(`| 枚举 | ${projectInfo.codeMetrics.totalEnums} |\n\n`);
    
    // 复杂度统计
    const metrics = projectInfo.codeMetrics;
    stream.markdown('### 🔄 复杂度指标\n\n');
    stream.markdown(`| 指标 | 值 |\n`);
    stream.markdown(`|------|-----|\n`);
    stream.markdown(`| 平均方法复杂度 | ${metrics.averageMethodComplexity?.toFixed(2) || 'N/A'} |\n`);
    stream.markdown(`| 最大方法复杂度 | ${metrics.maxMethodComplexity || 'N/A'} |\n`);
    stream.markdown(`| 注释覆盖率 | ${metrics.commentCoverage?.toFixed(2) || 'N/A'}% |\n`);
    stream.markdown(`| 代码行数 | ${metrics.totalCodeLines.toLocaleString()} |\n\n`);
    
    // 依赖统计
    if (projectInfo.packageReferences && projectInfo.packageReferences.length > 0) {
      stream.markdown('### 📦 依赖统计\n\n');
      stream.markdown(`**外部依赖**: ${projectInfo.packageReferences.length} 个\n\n`);
      
      const topDeps = projectInfo.packageReferences.slice(0, 5);
      topDeps.forEach((dep: any) => {
        stream.markdown(`- ${dep.name} (${dep.version})\n`);
      });
      
      if (projectInfo.packageReferences.length > 5) {
        stream.markdown(`\n... 还有 ${projectInfo.packageReferences.length - 5} 个依赖\n`);
      }
    }
  }
  
  /**
   * 获取评分等级
   */
  private getScoreGrade(score: number): string {
    if (score >= 90) return '🟢 优秀';
    if (score >= 80) return '🟡 良好';
    if (score >= 70) return '🟠 一般';
    if (score >= 60) return '🔴 较差';
    return '🔴 很差';
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