import * as vscode from 'vscode';
import { CSharpAnalysisCommand } from '../commands/csharp-analysis';
import { getCSharpAnalyzer, CSharpProjectInfo } from '../analyzers/CSharpAnalyzer';
import { outputManager } from '../utils/output-manager';
import {
  ParticipantsConfigManager,
  PARTICIPANTS_CONFIG,
  COMMON_COMMANDS,
} from '../config/participants-config';
import { ParticipantHelper, HELP_TEMPLATES } from '../utils/participant-helper';
import { IntelligentParticipant, ExecutionFlow } from './base/intelligent-participant';
import { UserIntentAnalysis } from '../services/intelligent-input-analyzer';
import * as path from 'path';

/**
 * 智能代码分析 Chat 参与者
 * 在 GitHub Copilot Chat 中提供多语言项目分析功能
 * 支持自动检测项目语言类型并提供相应的分析服务
 * 使用 GPT-4.1 智能分析用户输入并选择最合适的执行流程
 */
export class CodeAnalysisParticipant extends IntelligentParticipant {
  private analysisCommand: CSharpAnalysisCommand;

  constructor() {
    super('code');
    this.analysisCommand = new CSharpAnalysisCommand();
  }

  /**
   * 初始化智能执行流程
   */
  protected initializeFlows(): void {
    // 项目分析流程
    this.registerFlow({
      name: 'project_analysis',
      description: '全面分析项目结构、代码质量和技术栈',
      supportedIntents: ['code_analysis', 'project_analysis', 'project_scan'],
      execute: async (request, context, stream, token, analysis) => {
        await this.executeProjectAnalysis(stream, token, analysis);
      },
    });

    // 质量检查流程
    this.registerFlow({
      name: 'quality_check',
      description: '检查代码质量、性能和安全性问题',
      supportedIntents: ['quality_check', 'code_quality', 'performance_analysis'],
      execute: async (request, context, stream, token, analysis) => {
        await this.executeQualityCheck(stream, token, analysis);
      },
    });

    // 报告生成流程
    this.registerFlow({
      name: 'report_generation',
      description: '生成详细的项目分析报告',
      supportedIntents: ['report_generation', 'generate_report', 'analysis_report'],
      execute: async (request, context, stream, token, analysis) => {
        await this.executeReportGeneration(stream, token, analysis);
      },
    });

    // 问题显示流程
    this.registerFlow({
      name: 'issues_display',
      description: '显示项目中发现的问题和建议',
      supportedIntents: ['issues_display', 'show_issues', 'problems'],
      execute: async (request, context, stream, token, analysis) => {
        await this.executeIssuesDisplay(stream, token, analysis);
      },
    });

    // 统计信息流程
    this.registerFlow({
      name: 'stats_display',
      description: '显示项目统计信息和指标',
      supportedIntents: ['stats_display', 'statistics', 'metrics'],
      execute: async (request, context, stream, token, analysis) => {
        await this.executeStatsDisplay(stream, token, analysis);
      },
    });

    // 帮助流程
    this.registerFlow({
      name: 'help',
      description: '显示使用帮助和功能说明',
      supportedIntents: ['help_request', 'help', 'usage'],
      execute: async (request, context, stream, token, analysis) => {
        await this.executeHelpRequest(stream, analysis);
      },
    });

    // 默认流程
    this.registerFlow({
      name: 'default',
      description: '智能选择最合适的分析方式',
      execute: async (request, context, stream, token, analysis) => {
        await this.executeDefaultRequest(stream, analysis);
      },
    });

    this.setDefaultFlow('default');
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
    const hasCSharpFiles = files.some(
      file =>
        file.fsPath.endsWith('.cs') ||
        file.fsPath.endsWith('.csproj') ||
        file.fsPath.endsWith('.sln')
    );

    // TypeScript 项目检测
    const hasTypeScriptFiles = files.some(
      file =>
        file.fsPath.endsWith('.ts') ||
        file.fsPath.endsWith('.tsx') ||
        file.fsPath.includes('tsconfig.json')
    );

    // JavaScript 项目检测
    const hasJavaScriptFiles = files.some(
      file =>
        file.fsPath.endsWith('.js') ||
        file.fsPath.endsWith('.jsx') ||
        file.fsPath.includes('package.json')
    );

    // Python 项目检测
    const hasPythonFiles = files.some(
      file =>
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
   * 执行项目分析流程
   */
  private async executeProjectAnalysis(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
    analysis: UserIntentAnalysis
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
   * 执行质量检查流程
   */
  private async executeQualityCheck(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
    analysis: UserIntentAnalysis
  ): Promise<void> {
    stream.markdown('🔍 **开始 C# 代码质量检查...**\n\n');

    try {
      const workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;
      const analyzer = getCSharpAnalyzer();
      const projectInfo = await analyzer.analyzeProject(workspacePath);

      await this.displayQualityAssessment(projectInfo, stream);
    } catch (error) {
      stream.markdown(
        `❌ 质量检查失败: ${error instanceof Error ? error.message : String(error)}\n`
      );
    }
  }

  /**
   * 执行报告生成流程
   */
  private async executeReportGeneration(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
    analysis: UserIntentAnalysis
  ): Promise<void> {
    stream.markdown('📊 **生成 C# 项目分析报告...**\n\n');

    try {
      await this.analysisCommand.generateProjectReport();
      stream.markdown('✅ 报告已生成并保存到工作区\n');
      stream.markdown('💡 您可以在文件资源管理器中查看生成的报告文件\n');
    } catch (error) {
      stream.markdown(
        `❌ 报告生成失败: ${error instanceof Error ? error.message : String(error)}\n`
      );
    }
  }

  /**
   * 执行问题显示流程
   */
  private async executeIssuesDisplay(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
    analysis: UserIntentAnalysis
  ): Promise<void> {
    stream.markdown('⚠️ **显示 C# 项目质量问题...**\n\n');

    try {
      await this.analysisCommand.showQualityIssues();
      stream.markdown('✅ 质量问题已在新窗口中显示\n');
      stream.markdown('💡 您可以在问题面板中查看详细的问题列表\n');
    } catch (error) {
      stream.markdown(
        `❌ 问题显示失败: ${error instanceof Error ? error.message : String(error)}\n`
      );
    }
  }

  /**
   * 执行统计信息显示流程
   */
  private async executeStatsDisplay(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
    analysis: UserIntentAnalysis
  ): Promise<void> {
    stream.markdown('📈 **显示 C# 项目统计信息...**\n\n');

    try {
      const workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;
      const analyzer = getCSharpAnalyzer();
      const projectInfo = await analyzer.analyzeProject(workspacePath);

      await this.displayProjectStats(projectInfo, stream);
    } catch (error) {
      stream.markdown(
        `❌ 统计信息获取失败: ${error instanceof Error ? error.message : String(error)}\n`
      );
    }
  }

  /**
   * 执行帮助请求流程
   */
  private async executeHelpRequest(
    stream: vscode.ChatResponseStream,
    analysis: UserIntentAnalysis
  ): Promise<void> {
    const helpMessage = this.generateHelpMessage();
    stream.markdown(helpMessage);

    // 添加使用示例
    const participantName = ParticipantHelper.getParticipantName('CODE');
    stream.markdown('\n## 📝 使用示例\n\n');
    stream.markdown(`- "${participantName} 帮我分析一下这个项目" - AI会智能选择全面分析流程\n`);
    stream.markdown(`- "${participantName} 检查代码质量有什么问题" - AI会选择质量检查流程\n`);
    stream.markdown(`- "${participantName} 生成一份详细报告" - AI会选择报告生成流程\n`);
    stream.markdown(`- "${participantName} 项目有哪些统计数据" - AI会选择统计显示流程\n`);

    stream.markdown(
      '\n💡 **智能提示**: 直接用自然语言描述您的需求，AI会自动理解并选择最合适的处理方式！'
    );
  }

  /**
   * 获取语言显示名称
   */
  private getLanguageDisplayName(language?: string): string {
    switch (language) {
      case 'csharp':
        return 'C# ';
      case 'typescript':
        return 'TypeScript ';
      case 'javascript':
        return 'JavaScript ';
      case 'python':
        return 'Python ';
      default:
        return '通用代码';
    }
  }

  /**
   * 执行默认请求流程
   */
  private async executeDefaultRequest(
    stream: vscode.ChatResponseStream,
    analysis: UserIntentAnalysis
  ): Promise<void> {
    // 检查工作区
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      stream.markdown('❌ **错误**: 请先打开一个包含代码项目的工作区。');
      return;
    }

    // 检测项目语言类型
    const projectLanguage = await this.detectProjectLanguage();
    if (!projectLanguage) {
      stream.markdown(
        '❌ **错误**: 未检测到支持的项目类型。当前支持：C#、TypeScript、JavaScript、Python。'
      );
      return;
    }
    const languageName = this.getLanguageDisplayName(projectLanguage);
    stream.markdown(`👋 **欢迎使用${languageName}项目分析助手！**\n\n`);

    stream.markdown('我可以帮助您：\n');

    // 使用模板生成快速操作
    const quickActions = ParticipantHelper.generateQuickActions(
      'CODE',
      HELP_TEMPLATES.ANALYSIS_ASSISTANT.quickActions
    );
    stream.markdown(quickActions);
    stream.markdown(
      `\n- ❓ **获取帮助**: ${ParticipantHelper.getParticipantName('CODE')} 帮助\n\n`
    );

    stream.markdown(`💡 **提示**: 检测到${languageName}项目，已为您启用相应的分析功能。`);
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
    stream.markdown(
      `**总体评分**: ${projectInfo.qualityAssessment.overallScore.toFixed(1)}/100\n\n`
    );

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
      const issueCommand = ParticipantHelper.getCommandReference('CODE', 'SHOW_ISSUES');
      stream.markdown(`💡 使用 ${issueCommand} 查看详细问题列表\n\n`);
    }

    const reportCommand = ParticipantHelper.getCommandReference('CODE', 'GENERATE_REPORT');
    stream.markdown(`📊 使用 ${reportCommand} 获取完整分析报告`);
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
    stream.markdown(
      `| 代码结构 | ${qa.structureScore.toFixed(1)} | ${this.getScoreGrade(qa.structureScore)} |\n`
    );
    stream.markdown(
      `| 命名规范 | ${qa.namingScore.toFixed(1)} | ${this.getScoreGrade(qa.namingScore)} |\n`
    );
    stream.markdown(
      `| 复杂度 | ${qa.complexityScore.toFixed(1)} | ${this.getScoreGrade(qa.complexityScore)} |\n`
    );
    stream.markdown(
      `| 文档化 | ${qa.documentationScore.toFixed(1)} | ${this.getScoreGrade(qa.documentationScore)} |\n\n`
    );

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
    stream.markdown(
      `| 平均方法复杂度 | ${metrics.averageMethodComplexity?.toFixed(2) || 'N/A'} |\n`
    );
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
