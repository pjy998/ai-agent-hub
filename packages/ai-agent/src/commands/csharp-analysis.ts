import * as vscode from 'vscode';
import * as path from 'path';
import { getCSharpAnalyzer, CSharpProjectInfo, QualityIssue } from '../analyzers/CSharpAnalyzer';
import { LLMMonitor } from '../monitoring/llm-monitor';
import { outputManager } from '../utils/output-manager';

/**
 * C#项目分析命令处理器
 */
export class CSharpAnalysisCommand {
  private llmMonitor: LLMMonitor;

  constructor() {
    this.llmMonitor = LLMMonitor.getInstance();
  }

  /**
   * 注册C#分析相关命令
   */
  static registerCommands(context: vscode.ExtensionContext): void {
    const analysisCommand = new CSharpAnalysisCommand();

    // 注册分析当前项目命令
    const analyzeProjectCommand = vscode.commands.registerCommand(
      'ai-agent.analyzeCSharpProject',
      () => analysisCommand.analyzeCSharpProject()
    );

    // 注册分析选定文件夹命令
    const analyzeFolderCommand = vscode.commands.registerCommand(
      'ai-agent.analyzeCSharpFolder',
      (uri: vscode.Uri) => analysisCommand.analyzeCSharpFolder(uri)
    );

    // 注册生成项目报告命令
    const generateReportCommand = vscode.commands.registerCommand(
      'ai-agent.generateCSharpReport',
      () => analysisCommand.generateProjectReport()
    );

    // 注册显示质量问题命令
    const showIssuesCommand = vscode.commands.registerCommand('ai-agent.showCSharpIssues', () =>
      analysisCommand.showQualityIssues()
    );

    context.subscriptions.push(
      analyzeProjectCommand,
      analyzeFolderCommand,
      generateReportCommand,
      showIssuesCommand
    );
  }

  /**
   * 分析当前C#项目
   */
  async analyzeCSharpProject(): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
      }

      const projectPath = workspaceFolders[0].uri.fsPath;
      await this.performAnalysis(projectPath, '当前项目');
    } catch (error) {
      vscode.window.showErrorMessage(`分析失败: ${error}`);
      outputManager.logError(
        'C#项目分析失败',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 分析指定的C#文件夹
   */
  async analyzeCSharpFolder(uri?: vscode.Uri): Promise<void> {
    try {
      let folderPath: string;

      if (uri) {
        folderPath = uri.fsPath;
      } else {
        const selectedFolder = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: '选择C#项目文件夹',
        });

        if (!selectedFolder || selectedFolder.length === 0) {
          return;
        }

        folderPath = selectedFolder[0].fsPath;
      }

      await this.performAnalysis(folderPath, path.basename(folderPath));
    } catch (error) {
      vscode.window.showErrorMessage(`分析失败: ${error}`);
      outputManager.logError(
        'C#文件夹分析失败',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 执行项目分析
   */
  private async performAnalysis(
    projectPath: string,
    projectName: string
  ): Promise<CSharpProjectInfo> {
    const channel = outputManager.getCSharpAnalysisChannel();
    channel.show();
    channel.clear();
    channel.appendLine(`开始分析C#项目: ${projectName}`);
    channel.appendLine(`项目路径: ${projectPath}`);
    channel.appendLine('='.repeat(60));

    // 显示进度
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `分析C#项目: ${projectName}`,
        cancellable: false,
      },
      async progress => {
        progress.report({ increment: 0, message: '初始化分析器...' });

        const analyzer = getCSharpAnalyzer();

        progress.report({ increment: 20, message: '扫描项目文件...' });

        const startTime = Date.now();
        const projectInfo = await analyzer.analyzeProject(projectPath);
        const endTime = Date.now();
        const analysisTime = endTime - startTime;

        progress.report({ increment: 80, message: '生成分析报告...' });

        // 显示分析结果
        this.displayAnalysisResults(projectInfo, analysisTime);

        progress.report({ increment: 100, message: '分析完成' });

        // 显示完成通知
        const action = await vscode.window.showInformationMessage(
          `C#项目分析完成！总体评分: ${projectInfo.qualityAssessment.overallScore.toFixed(1)}/100`,
          '查看报告',
          '查看问题'
        );

        if (action === '查看报告') {
          await this.generateProjectReport(projectInfo);
        } else if (action === '查看问题') {
          await this.showQualityIssues(projectInfo);
        }

        return projectInfo;
      }
    );
  }

  /**
   * 显示分析结果
   */
  private displayAnalysisResults(projectInfo: CSharpProjectInfo, analysisTime: number): void {
    const { codeMetrics, qualityAssessment } = projectInfo;

    const channel = outputManager.getCSharpAnalysisChannel();

    channel.appendLine('\n📊 项目概览');
    channel.appendLine('-'.repeat(40));
    channel.appendLine(`项目名称: ${projectInfo.projectName}`);
    channel.appendLine(`项目类型: ${projectInfo.projectType}`);
    channel.appendLine(`目标框架: ${projectInfo.targetFramework}`);
    channel.appendLine(`分析时间: ${analysisTime}ms`);

    channel.appendLine('\n📈 代码统计');
    channel.appendLine('-'.repeat(40));
    channel.appendLine(`总文件数: ${codeMetrics.totalFiles}`);
    channel.appendLine(`总行数: ${codeMetrics.totalLines.toLocaleString()}`);
    channel.appendLine(`代码行数: ${codeMetrics.totalCodeLines.toLocaleString()}`);
    channel.appendLine(`注释行数: ${codeMetrics.totalCommentLines.toLocaleString()}`);
    channel.appendLine(`注释覆盖率: ${codeMetrics.commentCoverage.toFixed(1)}%`);

    channel.appendLine('\n🏗️ 代码结构');
    channel.appendLine('-'.repeat(40));
    channel.appendLine(`类数量: ${codeMetrics.totalClasses}`);
    channel.appendLine(`接口数量: ${codeMetrics.totalInterfaces}`);
    channel.appendLine(`枚举数量: ${codeMetrics.totalEnums}`);
    channel.appendLine(`方法数量: ${codeMetrics.totalMethods}`);
    channel.appendLine(`平均方法复杂度: ${codeMetrics.averageMethodComplexity.toFixed(1)}`);
    channel.appendLine(`最大方法复杂度: ${codeMetrics.maxMethodComplexity}`);

    channel.appendLine('\n📦 依赖关系');
    channel.appendLine('-'.repeat(40));
    channel.appendLine(`包引用数量: ${projectInfo.packageReferences.length}`);
    channel.appendLine(`项目引用数量: ${projectInfo.projectReferences.length}`);

    if (projectInfo.packageReferences.length > 0) {
      channel.appendLine('\n主要包引用:');
      projectInfo.packageReferences.slice(0, 10).forEach(pkg => {
        channel.appendLine(`  • ${pkg.name} (${pkg.version})`);
      });

      if (projectInfo.packageReferences.length > 10) {
        channel.appendLine(`  ... 还有 ${projectInfo.packageReferences.length - 10} 个包`);
      }
    }

    channel.appendLine('\n🎯 质量评估');
    channel.appendLine('-'.repeat(40));
    channel.appendLine(`总体评分: ${qualityAssessment.overallScore.toFixed(1)}/100`);
    channel.appendLine(`结构评分: ${qualityAssessment.structureScore.toFixed(1)}/100`);
    channel.appendLine(`命名评分: ${qualityAssessment.namingScore.toFixed(1)}/100`);
    channel.appendLine(`复杂度评分: ${qualityAssessment.complexityScore.toFixed(1)}/100`);
    channel.appendLine(`文档评分: ${qualityAssessment.documentationScore.toFixed(1)}/100`);

    if (qualityAssessment.issues.length > 0) {
      channel.appendLine('\n⚠️ 主要问题');
      channel.appendLine('-'.repeat(40));
      qualityAssessment.issues.slice(0, 5).forEach(issue => {
        const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
        channel.appendLine(`${icon} ${issue.description}`);
      });

      if (qualityAssessment.issues.length > 5) {
        channel.appendLine(`... 还有 ${qualityAssessment.issues.length - 5} 个问题`);
      }
    }

    if (qualityAssessment.recommendations.length > 0) {
      channel.appendLine('\n💡 改进建议');
      channel.appendLine('-'.repeat(40));
      qualityAssessment.recommendations.forEach(recommendation => {
        channel.appendLine(`• ${recommendation}`);
      });
    }

    channel.appendLine('\n' + '='.repeat(60));
    channel.appendLine('分析完成！');
  }

  /**
   * 生成项目报告
   */
  async generateProjectReport(projectInfo?: CSharpProjectInfo): Promise<void> {
    try {
      if (!projectInfo) {
        // 如果没有提供项目信息，重新分析当前项目
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          vscode.window.showErrorMessage('请先打开一个工作区');
          return;
        }

        const analyzer = getCSharpAnalyzer();
        projectInfo = await analyzer.analyzeProject(workspaceFolders[0].uri.fsPath);
      }

      const reportContent = this.generateReportContent(projectInfo);

      // 创建新的文档显示报告
      const doc = await vscode.workspace.openTextDocument({
        content: reportContent,
        language: 'markdown',
      });

      await vscode.window.showTextDocument(doc);
    } catch (error) {
      vscode.window.showErrorMessage(`生成报告失败: ${error}`);
    }
  }

  /**
   * 生成报告内容
   */
  private generateReportContent(projectInfo: CSharpProjectInfo): string {
    const { codeMetrics, qualityAssessment } = projectInfo;
    const timestamp = new Date().toLocaleString();

    return (
      `# C# 项目分析报告

` +
      `**项目名称:** ${projectInfo.projectName}  
` +
      `**项目类型:** ${projectInfo.projectType}  
` +
      `**目标框架:** ${projectInfo.targetFramework}  
` +
      `**分析时间:** ${timestamp}  
` +
      `**总体评分:** ${qualityAssessment.overallScore.toFixed(1)}/100

` +
      `## 📊 项目概览

` +
      `| 指标 | 数值 |
` +
      `|------|------|
` +
      `| 总文件数 | ${codeMetrics.totalFiles} |
` +
      `| 总行数 | ${codeMetrics.totalLines.toLocaleString()} |
` +
      `| 代码行数 | ${codeMetrics.totalCodeLines.toLocaleString()} |
` +
      `| 注释行数 | ${codeMetrics.totalCommentLines.toLocaleString()} |
` +
      `| 注释覆盖率 | ${codeMetrics.commentCoverage.toFixed(1)}% |

` +
      `## 🏗️ 代码结构

` +
      `| 类型 | 数量 |
` +
      `|------|------|
` +
      `| 类 | ${codeMetrics.totalClasses} |
` +
      `| 接口 | ${codeMetrics.totalInterfaces} |
` +
      `| 枚举 | ${codeMetrics.totalEnums} |
` +
      `| 方法 | ${codeMetrics.totalMethods} |

` +
      `### 复杂度分析

` +
      `- **平均方法复杂度:** ${codeMetrics.averageMethodComplexity.toFixed(1)}
` +
      `- **最大方法复杂度:** ${codeMetrics.maxMethodComplexity}

` +
      `## 📦 依赖关系

` +
      `### 包引用 (${projectInfo.packageReferences.length})

` +
      projectInfo.packageReferences.map(pkg => `- **${pkg.name}** (${pkg.version})`).join('\n') +
      '\n\n' +
      `### 项目引用 (${projectInfo.projectReferences.length})

` +
      projectInfo.projectReferences.map(ref => `- ${ref}`).join('\n') +
      '\n\n' +
      `## 🎯 质量评估

` +
      `| 维度 | 评分 |
` +
      `|------|------|
` +
      `| 总体评分 | ${qualityAssessment.overallScore.toFixed(1)}/100 |
` +
      `| 结构评分 | ${qualityAssessment.structureScore.toFixed(1)}/100 |
` +
      `| 命名评分 | ${qualityAssessment.namingScore.toFixed(1)}/100 |
` +
      `| 复杂度评分 | ${qualityAssessment.complexityScore.toFixed(1)}/100 |
` +
      `| 文档评分 | ${qualityAssessment.documentationScore.toFixed(1)}/100 |

` +
      `## ⚠️ 质量问题

` +
      qualityAssessment.issues
        .map(issue => {
          const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
          return `${icon} **${issue.category}**: ${issue.description} (严重程度: ${issue.severity}/10)`;
        })
        .join('\n') +
      '\n\n' +
      `## 💡 改进建议

` +
      qualityAssessment.recommendations.map(rec => `- ${rec}`).join('\n') +
      '\n\n' +
      `## 📁 文件详情

` +
      `### 最复杂的文件 (Top 10)

` +
      projectInfo.sourceFiles
        .sort((a, b) => b.complexityScore - a.complexityScore)
        .slice(0, 10)
        .map(
          file =>
            `- **${file.relativePath}** (复杂度: ${file.complexityScore}, 行数: ${file.lineCount})`
        )
        .join('\n') +
      '\n\n' +
      `### 最大的文件 (Top 10)

` +
      projectInfo.sourceFiles
        .sort((a, b) => b.lineCount - a.lineCount)
        .slice(0, 10)
        .map(
          file =>
            `- **${file.relativePath}** (行数: ${file.lineCount}, 大小: ${(file.size / 1024).toFixed(1)} KB)`
        )
        .join('\n') +
      '\n\n' +
      `---
` +
      `*报告由 AI Agent 自动生成于 ${timestamp}*`
    );
  }

  /**
   * 显示质量问题
   */
  async showQualityIssues(projectInfo?: CSharpProjectInfo): Promise<void> {
    try {
      if (!projectInfo) {
        // 如果没有提供项目信息，重新分析当前项目
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          vscode.window.showErrorMessage('请先打开一个工作区');
          return;
        }

        const analyzer = getCSharpAnalyzer();
        projectInfo = await analyzer.analyzeProject(workspaceFolders[0].uri.fsPath);
      }

      const issues = projectInfo.qualityAssessment.issues;

      if (issues.length === 0) {
        vscode.window.showInformationMessage('恭喜！没有发现质量问题。');
        return;
      }

      // 创建问题面板
      const panel = vscode.window.createWebviewPanel(
        'csharpIssues',
        'C# 质量问题',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      panel.webview.html = this.generateIssuesWebview(issues, projectInfo.projectName);
    } catch (error) {
      vscode.window.showErrorMessage(`显示问题失败: ${error}`);
    }
  }

  /**
   * 生成问题Webview
   */
  private generateIssuesWebview(issues: QualityIssue[], projectName: string): string {
    const issuesByCategory = issues.reduce(
      (acc, issue) => {
        if (!acc[issue.category]) {
          acc[issue.category] = [];
        }
        acc[issue.category].push(issue);
        return acc;
      },
      {} as Record<string, QualityIssue[]>
    );

    const categoryColors = {
      error: '#ff4444',
      warning: '#ffaa00',
      info: '#4488ff',
      naming: '#8844ff',
      complexity: '#ff8844',
      structure: '#44ff88',
      documentation: '#44aaff',
      performance: '#ff4488',
    };

    const categorySections = Object.entries(issuesByCategory)
      .map(([category, categoryIssues]) => {
        const color = categoryColors[category as keyof typeof categoryColors] || '#666666';
        const issueItems = categoryIssues
          .sort((a, b) => b.severity - a.severity)
          .map(issue => {
            const typeIcon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
            return `
              <div class="issue-item severity-${issue.severity}">
                <div class="issue-header">
                  <span class="issue-icon">${typeIcon}</span>
                  <span class="issue-type">${issue.type.toUpperCase()}</span>
                  <span class="issue-severity">严重程度: ${issue.severity}/10</span>
                </div>
                <div class="issue-description">${issue.description}</div>
                ${issue.filePath ? `<div class="issue-file">📁 ${issue.filePath}</div>` : ''}
                ${issue.lineNumber ? `<div class="issue-line">📍 第 ${issue.lineNumber} 行</div>` : ''}
              </div>
            `;
          })
          .join('');

        return `
          <div class="category-section">
            <h2 class="category-title" style="border-left-color: ${color}">
              ${category.toUpperCase()} (${categoryIssues.length})
            </h2>
            <div class="issues-list">
              ${issueItems}
            </div>
          </div>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>C# 质量问题 - ${projectName}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            line-height: 1.6;
          }
          
          .header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid var(--vscode-panel-border);
          }
          
          .header h1 {
            margin: 0;
            color: var(--vscode-textLink-foreground);
            font-size: 24px;
          }
          
          .header .subtitle {
            margin-top: 5px;
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
          }
          
          .summary {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: wrap;
          }
          
          .summary-item {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 10px 15px;
            border-radius: 5px;
            font-weight: bold;
          }
          
          .category-section {
            margin-bottom: 30px;
            background: var(--vscode-panel-background);
            border-radius: 8px;
            overflow: hidden;
          }
          
          .category-title {
            margin: 0;
            padding: 15px 20px;
            background: var(--vscode-panel-border);
            border-left: 4px solid #666;
            font-size: 18px;
            font-weight: 600;
          }
          
          .issues-list {
            padding: 0;
          }
          
          .issue-item {
            padding: 15px 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            transition: background-color 0.2s;
          }
          
          .issue-item:hover {
            background: var(--vscode-list-hoverBackground);
          }
          
          .issue-item:last-child {
            border-bottom: none;
          }
          
          .issue-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
          }
          
          .issue-icon {
            font-size: 16px;
          }
          
          .issue-type {
            font-weight: bold;
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 3px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
          }
          
          .issue-severity {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-left: auto;
          }
          
          .issue-description {
            font-size: 14px;
            margin-bottom: 5px;
          }
          
          .issue-file, .issue-line {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
          }
          
          .severity-8, .severity-9, .severity-10 {
            border-left: 3px solid #ff4444;
          }
          
          .severity-5, .severity-6, .severity-7 {
            border-left: 3px solid #ffaa00;
          }
          
          .severity-1, .severity-2, .severity-3, .severity-4 {
            border-left: 3px solid #4488ff;
          }
          
          .no-issues {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
          }
          
          .no-issues .icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔍 C# 质量问题分析</h1>
          <div class="subtitle">项目: ${projectName} | 分析时间: ${new Date().toLocaleString()}</div>
        </div>
        
        <div class="summary">
          <div class="summary-item">总问题数: ${issues.length}</div>
          <div class="summary-item">错误: ${issues.filter(i => i.type === 'error').length}</div>
          <div class="summary-item">警告: ${issues.filter(i => i.type === 'warning').length}</div>
          <div class="summary-item">信息: ${issues.filter(i => i.type === 'info').length}</div>
        </div>
        
        ${
          issues.length > 0
            ? categorySections
            : `
          <div class="no-issues">
            <div class="icon">🎉</div>
            <h2>恭喜！没有发现质量问题</h2>
            <p>您的代码质量很好，继续保持！</p>
          </div>
        `
        }
      </body>
      </html>
    `;
  }
}

/**
 * 注册C#分析命令
 */
export function registerCSharpAnalysisCommands(context: vscode.ExtensionContext): void {
  CSharpAnalysisCommand.registerCommands(context);
}
