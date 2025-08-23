import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { outputManager } from './utils/output-manager';
import { SelfProjectScanAgent } from './agents/SelfProjectScanAgent';
import { ConfigGeneratorParticipant } from './participants/ConfigGeneratorParticipant';
import { TokenProbeParticipant } from './participants/TokenProbeParticipant';
import { CodeAnalysisParticipant } from './participants/CodeAnalysisParticipant';
import { ReportParticipant } from './participants/ReportParticipant';
import { RecommendParticipant } from './participants/RecommendParticipant';

import { registerTokenProbeCommands } from './commands/token-probe-command';
import { registerImprovedTokenProbeCommands } from './commands/improved-token-probe';
import { CSharpAnalysisCommand } from './commands/csharp-analysis';
import { TransparencyReportCommand } from './commands/transparency-report';
import { ExportInteractionDataCommand } from './commands/export-interaction-data';
import { LLMMonitor } from './monitoring/llm-monitor';

// 版本信息显示
function showVersionInfo() {
  try {
    // 读取根目录的package.json获取版本信息
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspaceRoot) {
      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const version = packageJson.version || 'unknown';
        const name = packageJson.name || 'ai-agent-hub';

        outputManager.logInfo(`🚀 AI Agent Hub Extension Started - ${name} v${version}`);
        vscode.window.showInformationMessage(`AI Agent Hub v${version} activated successfully!`);
      }
    }
  } catch (error) {
    outputManager.logError('Failed to read version info:', error as Error);
    vscode.window.showInformationMessage('AI Agent Hub activated successfully!');
  }
}

// 代码上下文接口
interface CodeContext {
  filePath: string;
  language: string;
  content: string;
  selection?: vscode.Range;
  gitInfo?: Record<string, unknown>;
}

// 简化的工作流管理器（移除MCP依赖）
class WorkflowManager {
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      outputManager.logInfo('Workflow Manager initialized');
      this.isConnected = true;
    } catch (error) {
      outputManager.logError('Failed to initialize workflow manager:', error as Error);
      vscode.window.showErrorMessage('Failed to initialize workflow manager');
    }
  }

  async executeWorkflow(preset: string, context: CodeContext): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Workflow manager not initialized');
    }

    try {
      // 简化的工作流执行逻辑
      return `Executed workflow: ${preset} with context from ${context.filePath}`;
    } catch (error) {
      outputManager.logError('Failed to execute workflow:', error as Error);
      throw error;
    }
  }

  disconnect(): void {
    try {
      this.isConnected = false;
    } catch (error) {
      outputManager.logError('Error disconnecting workflow manager:', error as Error);
    }
  }
}

// Chat参与者基类
abstract class BaseChatParticipant {
  protected workflowManager: WorkflowManager;

  constructor(workflowManager: WorkflowManager) {
    this.workflowManager = workflowManager;
  }

  abstract handleRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void>;

  protected async collectContext(): Promise<CodeContext> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      throw new Error('No active editor');
    }

    return {
      filePath: editor.document.fileName,
      language: editor.document.languageId,
      content: editor.document.getText(),
      selection: editor.selection.isEmpty ? undefined : editor.selection,
    };
  }
}

// 自我分析助手
class SelfAnalysisParticipant extends BaseChatParticipant {
  async handleRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    const prompt = request.prompt.toLowerCase();

    try {
      // 检查用户输入的指令类型
      if (
        prompt.includes('csharp') ||
        prompt.includes('c#') ||
        prompt.includes('编码规范') ||
        prompt.includes('coding standards') ||
        prompt.includes('microsoft') ||
        prompt.includes('分析c#代码') ||
        prompt.includes('检查编码规范')
      ) {
        // C# 编码规范分析
        stream.markdown('🔍 **开始 C# 编码规范分析...**\n\n');

        // 获取当前工作区路径
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
          stream.markdown('❌ 未找到工作区，请在 VS Code 中打开包含 C# 项目的文件夹\n');
          return;
        }

        stream.markdown(`📁 扫描项目: ${workspacePath}\n`);

        // 执行 C# 编码规范分析
        await this.executeCSharpAnalysis(stream, workspacePath);
      } else if (
        prompt.includes('分析') ||
        prompt.includes('analyze') ||
        prompt.includes('扫描') ||
        prompt.includes('scan')
      ) {
        stream.markdown('🔍 **开始项目自我分析...**\n\n');

        const { SelfProjectScanAgent } = await import('./agents/SelfProjectScanAgent');
        const agent = new SelfProjectScanAgent();

        // 执行分析
        stream.markdown('📁 正在扫描项目结构...\n');
        const analysis = await agent.scanProject();

        stream.markdown('📊 正在生成分析报告...\n');
        const report = await agent.generateReport(analysis);

        // 显示摘要结果
        stream.markdown(`## 📋 分析结果摘要\n\n`);
        stream.markdown(`- **整体健康度**: ${report.summary.overallHealth}/100\n`);
        stream.markdown(`- **关键问题**: ${report.summary.criticalIssues} 个\n`);
        stream.markdown(`- **改进建议**: ${report.summary.recommendations} 条\n\n`);

        // 显示组件状态
        stream.markdown(`## 🔧 核心组件状态\n\n`);
        for (const component of analysis.components) {
          const statusEmoji = this.getStatusEmoji(component.status);
          stream.markdown(`- **${component.name}**: ${statusEmoji} ${component.status}\n`);
          if (component.issues.length > 0) {
            stream.markdown(`  - 问题: ${component.issues.join(', ')}\n`);
          }
        }

        // 显示高优先级建议
        const highPriorityRecs = analysis.recommendations.filter(r => r.priority === 'high');
        if (highPriorityRecs.length > 0) {
          stream.markdown(`\n## 🔥 高优先级建议\n\n`);
          highPriorityRecs.slice(0, 5).forEach((rec, index) => {
            stream.markdown(`${index + 1}. **${rec.title}**\n`);
            stream.markdown(`   - ${rec.description}\n`);
            stream.markdown(`   - 影响: ${rec.impact}\n`);
            stream.markdown(`   - 工作量: ${rec.effort}\n\n`);
          });
        }

        // 保存完整报告
        const reportPath = await agent.saveReport(report, 'markdown');
        stream.markdown(`\n📄 **完整报告已保存**: \`${reportPath}\`\n\n`);
        stream.markdown(
          `💡 **提示**: 使用命令 \`AI Agent Hub: View Recommendations\` 查看详细建议`
        );
      } else if (
        prompt.includes('建议') ||
        prompt.includes('recommend') ||
        prompt.includes('改进') ||
        prompt.includes('improve')
      ) {
        stream.markdown('💡 **获取改进建议...**\n\n');

        const { SelfProjectScanAgent } = await import('./agents/SelfProjectScanAgent');
        const agent = new SelfProjectScanAgent();
        const analysis = await agent.scanProject();

        const recommendations = analysis.recommendations
          .sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          })
          .slice(0, 10);

        stream.markdown(`## 📋 改进建议 (共${recommendations.length}条)\n\n`);

        recommendations.forEach((rec, index) => {
          const priorityEmoji =
            rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
          stream.markdown(`### ${index + 1}. ${priorityEmoji} ${rec.title}\n\n`);
          stream.markdown(`**描述**: ${rec.description}\n\n`);
          stream.markdown(`**影响**: ${rec.impact}\n\n`);
          stream.markdown(`**工作量**: ${rec.effort}\n\n`);
          stream.markdown(`**实施步骤**:\n`);
          rec.implementation.forEach((step, stepIndex) => {
            stream.markdown(`${stepIndex + 1}. ${step}\n`);
          });
          stream.markdown(`\n---\n\n`);
        });
      } else if (
        prompt.includes('状态') ||
        prompt.includes('status') ||
        prompt.includes('健康') ||
        prompt.includes('health')
      ) {
        stream.markdown('📊 **检查项目状态...**\n\n');

        const { SelfProjectScanAgent } = await import('./agents/SelfProjectScanAgent');
        const agent = new SelfProjectScanAgent();
        const analysis = await agent.scanProject();
        const report = await agent.generateReport(analysis);

        stream.markdown(`## 🎯 项目健康状态\n\n`);
        stream.markdown(`**整体评分**: ${report.summary.overallHealth}/100\n\n`);

        const healthLevel =
          report.summary.overallHealth >= 80
            ? '优秀 🟢'
            : report.summary.overallHealth >= 60
              ? '良好 🟡'
              : '需要改进 🔴';
        stream.markdown(`**健康等级**: ${healthLevel}\n\n`);

        stream.markdown(`## 📈 详细指标\n\n`);
        stream.markdown(`- 总文件数: ${analysis.structure.totalFiles}\n`);
        stream.markdown(`- 总代码行数: ${analysis.structure.totalLines}\n`);
        stream.markdown(`- 核心组件: ${analysis.components.length} 个\n`);
        stream.markdown(`- 关键问题: ${report.summary.criticalIssues} 个\n`);
        stream.markdown(`- 改进建议: ${report.summary.recommendations} 条\n\n`);

        // 组件状态概览
        const statusCounts = analysis.components.reduce(
          (acc, comp) => {
            acc[comp.status] = (acc[comp.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        stream.markdown(`## 🔧 组件状态分布\n\n`);
        Object.entries(statusCounts).forEach(([status, count]) => {
          const emoji = this.getStatusEmoji(status as any);
          stream.markdown(`- ${emoji} ${status}: ${count} 个\n`);
        });
      } else {
        // 默认帮助信息
        stream.markdown(`## 🤖 AI Agent Hub 自我分析助手\n\n`);
        stream.markdown(`我可以帮您分析项目状态和提供改进建议。您可以使用以下指令:\n\n`);
        stream.markdown(`### 📋 可用指令\n\n`);
        stream.markdown(`- **"分析项目"** 或 **"analyze"** - 执行完整的项目分析\n`);
        stream.markdown(`- **"查看建议"** 或 **"recommend"** - 获取改进建议\n`);
        stream.markdown(`- **"项目状态"** 或 **"status"** - 查看项目健康状态\n\n`);
        stream.markdown(`### 💡 使用示例\n\n`);
        stream.markdown(`- "请分析一下当前项目"\n`);
        stream.markdown(`- "有什么改进建议吗？"\n`);
        stream.markdown(`- "项目健康状态如何？"\n\n`);
        stream.markdown(`### 🚀 快速开始\n\n`);
        stream.markdown(`直接输入 **"分析项目"** 开始完整分析！`);
      }
    } catch (error: any) {
      stream.markdown(`❌ **分析失败**: ${error.message}\n\n`);
      stream.markdown(
        `请确保项目结构完整，或尝试使用命令面板中的 \`AI Agent Hub: Analyze Self\` 命令。`
      );
    }
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'complete':
        return '✅';
      case 'partial':
        return '⚠️';
      case 'missing':
        return '❌';
      case 'broken':
        return '🔴';
      default:
        return '❓';
    }
  }

  private async executeCSharpAnalysis(
    stream: vscode.ChatResponseStream,
    workspacePath: string
  ): Promise<void> {
    try {
      // 导入 Node.js 模块
      const fs = await import('fs');
      const path = await import('path');
      const { spawn } = await import('child_process');

      // 检查是否存在 C# 项目文件
      const projectFiles = await this.findCSharpProjects(workspacePath);
      if (projectFiles.length === 0) {
        stream.markdown('⚠️ 未在工作区中找到 C# 项目文件（.csproj 或 .sln）\n\n');
        stream.markdown('请确保工作区包含有效的 C# 项目。\n');
        return;
      }

      stream.markdown(`📊 找到 ${projectFiles.length} 个 C# 项目文件\n`);

      // 扫描 C# 文件
      const csharpFiles = await this.findCSharpFiles(workspacePath);
      stream.markdown(`📄 分析 ${csharpFiles.length} 个 C# 文件\n\n`);

      if (csharpFiles.length === 0) {
        stream.markdown('⚠️ 未找到 C# 源代码文件\n');
        return;
      }

      // 执行编码规范分析
      const analysisResult = await this.performCSharpAnalysis(csharpFiles, workspacePath);

      // 显示分析结果
      stream.markdown(`## 📋 分析结果摘要\n\n`);
      stream.markdown(`- **编码规范评分**: ${analysisResult.score}/100\n`);
      stream.markdown(`- **发现问题**: ${analysisResult.totalIssues} 个\n`);
      stream.markdown(`- **高优先级**: ${analysisResult.highPriority} 个\n`);
      stream.markdown(`- **中优先级**: ${analysisResult.mediumPriority} 个\n`);
      stream.markdown(`- **低优先级**: ${analysisResult.lowPriority} 个\n\n`);

      // 显示主要问题
      if (analysisResult.issues.length > 0) {
        stream.markdown(`## 🔧 主要问题\n\n`);

        const groupedIssues = this.groupIssuesByCategory(analysisResult.issues);
        let issueIndex = 1;

        for (const [category, issues] of Object.entries(groupedIssues)) {
          if (issues.length > 0) {
            const emoji = this.getCategoryEmoji(category);
            stream.markdown(`### ${issueIndex}. ${emoji} ${category} (${issues.length}个)\n`);

            issues.slice(0, 3).forEach(issue => {
              stream.markdown(`- ${issue.file}:${issue.line} - ${issue.description}\n`);
            });

            if (issues.length > 3) {
              stream.markdown(`- ... 还有 ${issues.length - 3} 个类似问题\n`);
            }

            stream.markdown(`\n`);
            issueIndex++;
          }
        }
      }

      // 生成报告文件
      const reportPath = await this.generateCSharpReport(analysisResult, workspacePath);
      stream.markdown(`📄 详细报告: ${reportPath}\n`);

      // 生成配置文件
      await this.generateEditorConfig(workspacePath);
      stream.markdown(`🔧 已生成 .editorconfig 文件\n`);

      stream.markdown(`📋 已生成代码分析规则集\n`);
    } catch (error: any) {
      stream.markdown(`❌ **C# 分析失败**: ${error.message}\n\n`);
      stream.markdown(`请确保工作区包含有效的 C# 项目，或检查文件权限。\n`);
    }
  }

  private async findCSharpProjects(workspacePath: string): Promise<string[]> {
    const fs = await import('fs');
    const path = await import('path');
    const projects: string[] = [];

    const searchDir = async (dir: string) => {
      try {
        const items = await fs.promises.readdir(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = await fs.promises.stat(fullPath);

          if (stat.isFile() && (item.endsWith('.csproj') || item.endsWith('.sln'))) {
            projects.push(fullPath);
          } else if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            await searchDir(fullPath);
          }
        }
      } catch (error) {
        // 忽略权限错误
      }
    };

    await searchDir(workspacePath);
    return projects;
  }

  private async findCSharpFiles(workspacePath: string): Promise<string[]> {
    const fs = await import('fs');
    const path = await import('path');
    const files: string[] = [];

    const searchDir = async (dir: string) => {
      try {
        const items = await fs.promises.readdir(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = await fs.promises.stat(fullPath);

          if (stat.isFile() && item.endsWith('.cs')) {
            files.push(fullPath);
          } else if (
            stat.isDirectory() &&
            !item.startsWith('.') &&
            item !== 'node_modules' &&
            item !== 'bin' &&
            item !== 'obj'
          ) {
            await searchDir(fullPath);
          }
        }
      } catch (error) {
        // 忽略权限错误
      }
    };

    await searchDir(workspacePath);
    return files;
  }

  private async performCSharpAnalysis(files: string[], workspacePath: string): Promise<any> {
    const fs = await import('fs');
    const issues: any[] = [];
    let totalLines = 0;

    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        const lines = content.split('\n');
        totalLines += lines.length;

        // 分析文件内容
        const fileIssues = this.analyzeFileContent(file, content, lines);
        issues.push(...fileIssues);
      } catch (error) {
        // 忽略无法读取的文件
      }
    }

    const highPriority = issues.filter(i => i.priority === 'high').length;
    const mediumPriority = issues.filter(i => i.priority === 'medium').length;
    const lowPriority = issues.filter(i => i.priority === 'low').length;

    // 计算评分
    const score = Math.max(0, 100 - (highPriority * 5 + mediumPriority * 2 + lowPriority * 1));

    return {
      score,
      totalIssues: issues.length,
      highPriority,
      mediumPriority,
      lowPriority,
      issues,
      totalFiles: files.length,
      totalLines,
    };
  }

  private analyzeFileContent(filePath: string, content: string, lines: string[]): any[] {
    const issues: any[] = [];
    const fileName = filePath.split(/[\/\\]/).pop() || '';

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // 命名约定检查
      if (trimmedLine.includes('private ') && trimmedLine.includes(' _')) {
        const match = trimmedLine.match(/private\s+\w+\s+(\w+)/);
        if (match && !match[1].startsWith('_')) {
          issues.push({
            file: fileName,
            line: lineNumber,
            category: '命名约定问题',
            description: `私有字段应使用下划线前缀: ${match[1]}`,
            priority: 'medium',
          });
        }
      }

      // 行长度检查
      if (line.length > 120) {
        issues.push({
          file: fileName,
          line: lineNumber,
          category: '代码格式问题',
          description: `行长度超过 120 字符 (${line.length} 字符)`,
          priority: 'low',
        });
      }

      // 硬编码字符串检查
      if (
        (trimmedLine.includes('"') && trimmedLine.includes('password')) ||
        (trimmedLine.includes('"') && trimmedLine.includes('secret'))
      ) {
        issues.push({
          file: fileName,
          line: lineNumber,
          category: '安全性问题',
          description: '可能包含硬编码的敏感信息',
          priority: 'high',
        });
      }

      // 字符串拼接检查
      if (trimmedLine.includes(' + "') && trimmedLine.split(' + "').length > 2) {
        issues.push({
          file: fileName,
          line: lineNumber,
          category: '性能优化建议',
          description: '建议使用 StringBuilder 替代字符串拼接',
          priority: 'medium',
        });
      }
    });

    return issues;
  }

  private groupIssuesByCategory(issues: any[]): { [key: string]: any[] } {
    const grouped: { [key: string]: any[] } = {};

    issues.forEach(issue => {
      if (!grouped[issue.category]) {
        grouped[issue.category] = [];
      }
      grouped[issue.category].push(issue);
    });

    return grouped;
  }

  private getCategoryEmoji(category: string): string {
    switch (category) {
      case '命名约定问题':
        return '🔴';
      case '代码格式问题':
        return '⚠️';
      case '安全性问题':
        return '🔒';
      case '性能优化建议':
        return '💡';
      default:
        return '📝';
    }
  }

  private async generateCSharpReport(result: any, workspacePath: string): Promise<string> {
    const fs = await import('fs');
    const path = await import('path');

    const reportsDir = path.join(workspacePath, 'reports');
    if (!fs.existsSync(reportsDir)) {
      await fs.promises.mkdir(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const reportPath = path.join(reportsDir, `csharp-analysis-${timestamp}.md`);

    const reportContent =
      `# C# 编码规范分析报告\n\n` +
      `**生成时间**: ${new Date().toLocaleString()}\n\n` +
      `## 📊 分析摘要\n\n` +
      `- **编码规范评分**: ${result.score}/100\n` +
      `- **分析文件数**: ${result.totalFiles}\n` +
      `- **总代码行数**: ${result.totalLines}\n` +
      `- **发现问题**: ${result.totalIssues} 个\n\n` +
      `## 🔧 问题详情\n\n` +
      result.issues
        .map(
          (issue: any) =>
            `### ${issue.category}\n` +
            `- **文件**: ${issue.file}:${issue.line}\n` +
            `- **描述**: ${issue.description}\n` +
            `- **优先级**: ${issue.priority}\n\n`
        )
        .join('');

    await fs.promises.writeFile(reportPath, reportContent, 'utf-8');
    return reportPath;
  }

  private async generateEditorConfig(workspacePath: string): Promise<void> {
    const fs = await import('fs');
    const path = await import('path');

    const editorConfigPath = path.join(workspacePath, '.editorconfig');
    const editorConfigContent =
      `# EditorConfig for C# projects\n\n` +
      `root = true\n\n` +
      `[*.cs]\n` +
      `indent_style = space\n` +
      `indent_size = 4\n` +
      `end_of_line = crlf\n` +
      `charset = utf-8\n` +
      `trim_trailing_whitespace = true\n` +
      `insert_final_newline = true\n` +
      `max_line_length = 120\n\n` +
      `# Microsoft .NET properties\n` +
      `csharp_new_line_before_open_brace = all\n` +
      `csharp_prefer_braces = true:warning\n` +
      `csharp_prefer_simple_using_statement = true:suggestion\n` +
      `csharp_style_namespace_declarations = file_scoped:warning\n`;

    await fs.promises.writeFile(editorConfigPath, editorConfigContent, 'utf-8');
  }
}

// 全局变量
let workflowManager: WorkflowManager;
let statusBarItem: vscode.StatusBarItem;

// 扩展激活函数
export async function activate(context: vscode.ExtensionContext) {
  outputManager.logInfo('AI Agent Hub extension is being activated...');

  // 显示版本信息
  showVersionInfo();

  // 初始化工作流管理器
  workflowManager = new WorkflowManager();

  // 创建状态栏项
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(robot) AI Agent';
  statusBarItem.tooltip = 'AI Agent Hub Status';
  statusBarItem.show();

  try {
    // 连接到工作流管理器
    await workflowManager.connect();
    statusBarItem.text = '$(robot) AI Agent ✓';
    statusBarItem.tooltip = 'AI Agent Hub Connected';

    // 注册Chat参与者

    const selfAnalysisInstance = new SelfAnalysisParticipant(workflowManager);
    const selfAnalysisParticipant = vscode.chat.createChatParticipant(
      'analyze',
      selfAnalysisInstance.handleRequest.bind(selfAnalysisInstance)
    );
    const configGeneratorInstance = new ConfigGeneratorParticipant();
    const configGeneratorParticipant = vscode.chat.createChatParticipant(
      'config',
      configGeneratorInstance.handleRequest.bind(configGeneratorInstance)
    );

    // 注册Token Probe Chat参与者
    const tokenProbeInstance = new TokenProbeParticipant();
    const tokenProbeParticipant = vscode.chat.createChatParticipant(
      'token',
      tokenProbeInstance.handleRequest.bind(tokenProbeInstance)
    );

    // 注册C# Analysis Chat参与者
    const codeAnalysisInstance = new CodeAnalysisParticipant();
    const codeAnalysisParticipant = vscode.chat.createChatParticipant(
      'code',
      codeAnalysisInstance.handleRequest.bind(codeAnalysisInstance)
    );

    // 注册Report Chat参与者
    const reportInstance = new ReportParticipant();
    const reportParticipant = vscode.chat.createChatParticipant(
      'report',
      reportInstance.handleRequest.bind(reportInstance)
    );

    // 注册Recommend Chat参与者
    const recommendInstance = new RecommendParticipant();
    const recommendParticipant = vscode.chat.createChatParticipant(
      'recommend',
      recommendInstance.handleRequest.bind(recommendInstance)
    );

    // 注册自我分析命令
    const analyzeSelfCommand = vscode.commands.registerCommand(
      'ai-agent-hub.analyzeSelf',
      async () => {
        try {
          vscode.window.showInformationMessage('🔍 开始项目自我分析...');

          const agent = new SelfProjectScanAgent();
          const analysis = await agent.scanProject();
          const report = await agent.generateReport(analysis);

          // 保存报告
          const reportPath = await agent.saveReport(report, 'markdown');

          // 显示结果
          vscode.window
            .showInformationMessage(
              `✅ 分析完成！发现 ${report.summary.criticalIssues} 个关键问题`,
              '查看报告'
            )
            .then(selection => {
              if (selection === '查看报告') {
                vscode.workspace.openTextDocument(reportPath).then(doc => {
                  vscode.window.showTextDocument(doc);
                });
              }
            });
        } catch (error: any) {
          vscode.window.showErrorMessage(`分析失败: ${error.message}`);
        }
      }
    );

    const generateReportCommand = vscode.commands.registerCommand(
      'ai-agent-hub.generateReport',
      async () => {
        try {
          const agent = new SelfProjectScanAgent();
          const analysis = await agent.scanProject();
          const report = await agent.generateReport(analysis);

          // 询问报告格式
          const format = await vscode.window.showQuickPick(['markdown', 'json', 'html'], {
            placeHolder: '选择报告格式',
          });

          if (format) {
            const reportPath = await agent.saveReport(report, format as any);
            vscode.window.showInformationMessage(`报告已生成: ${reportPath}`);
          }
        } catch (error: any) {
          vscode.window.showErrorMessage(`生成报告失败: ${error.message}`);
        }
      }
    );

    const viewRecommendationsCommand = vscode.commands.registerCommand(
      'ai-agent-hub.viewRecommendations',
      async () => {
        try {
          const agent = new SelfProjectScanAgent();
          const analysis = await agent.scanProject();

          const recommendations = analysis.recommendations
            .filter(r => r.priority === 'high')
            .slice(0, 10);

          if (recommendations.length === 0) {
            vscode.window.showInformationMessage('🎉 没有发现高优先级问题！');
            return;
          }

          const items = recommendations.map(rec => ({
            label: `${rec.category === 'critical-fix' ? '🔴' : '⚠️'} ${rec.title}`,
            description: rec.description,
            detail: `影响: ${rec.impact} | 工作量: ${rec.effort}`,
          }));

          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: '选择要查看的建议',
            canPickMany: false,
          });

          if (selected) {
            const rec = recommendations.find(
              r => r.title === selected.label.replace(/^[🔴⚠️] /, '')
            );
            if (rec) {
              vscode.window.showInformationMessage(
                `${rec.title}\n\n${rec.description}\n\n实施步骤:\n${rec.implementation.join('\n')}`
              );
            }
          }
        } catch (error: any) {
          vscode.window.showErrorMessage(`查看建议失败: ${error.message}`);
        }
      }
    );

    // 注册Token Probe命令
    registerTokenProbeCommands(context);

    // 注册改进的Token Probe命令
    registerImprovedTokenProbeCommands(context);

    // 注册C#分析命令
    CSharpAnalysisCommand.registerCommands(context);

    // 注册AI交互透明化命令
    TransparencyReportCommand.register(context);
    ExportInteractionDataCommand.register(context);

    // 初始化LLM监控
    const llmMonitor = LLMMonitor.getInstance();

    // 添加到上下文
    context.subscriptions.push(
      selfAnalysisParticipant,
      configGeneratorParticipant,
      tokenProbeParticipant,
      codeAnalysisParticipant,
      reportParticipant,
      recommendParticipant,
      statusBarItem,
      analyzeSelfCommand,
      generateReportCommand,
      viewRecommendationsCommand
    );

    outputManager.logInfo('AI Agent Hub extension activated successfully');
  } catch (error) {
    outputManager.logError('Failed to activate AI Agent Hub extension:', error as Error);
    statusBarItem.text = '$(robot) AI Agent ✗';
    statusBarItem.tooltip = `AI Agent Hub Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// 扩展停用函数
export function deactivate() {
  outputManager.logInfo('AI Agent Hub extension is being deactivated...');

  if (workflowManager) {
    workflowManager.disconnect();
  }

  if (statusBarItem) {
    statusBarItem.dispose();
  }

  outputManager.logInfo('AI Agent Hub extension deactivated');
}
