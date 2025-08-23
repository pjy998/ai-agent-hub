import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const process = globalThis.process;
import { ContextCollector } from '../context/ContextCollector';
import { ContextRanker } from '../context/ContextRanker';
import { outputManager } from '../utils/output-manager';

export interface ProjectAnalysis {
  projectRoot: string;
  structure: ProjectStructure;
  components: CoreComponent[];
  dependencies: DependencyAnalysis;
  quality: QualityMetrics;
  security: SecurityAudit;
  recommendations: Recommendation[];
  timestamp: string;
}

export interface ProjectStructure {
  directories: DirectoryInfo[];
  files: FileInfo[];
  totalFiles: number;
  totalLines: number;
  fileTypes: Record<string, number>;
}

export interface DirectoryInfo {
  path: string;
  name: string;
  fileCount: number;
  subdirectories: string[];
  purpose: string;
}

export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  lines: number;
  lastModified: Date;
  importance: number;
}

export interface CoreComponent {
  name: string;
  path: string;
  type: 'extension' | 'mcp-server' | 'preset-system' | 'context-intelligence' | 'tools-framework';
  status: 'complete' | 'partial' | 'missing' | 'broken';
  entryPoints: string[];
  publicApis: string[];
  dependencies: string[];
  issues: string[];
}

export interface DependencyAnalysis {
  npmPackages: PackageDependency[];
  internalModules: InternalDependency[];
  circularDependencies: string[];
  unusedDependencies: string[];
  vulnerabilities: SecurityVulnerability[];
}

export interface PackageDependency {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency' | 'peerDependency';
  used: boolean;
  vulnerabilities: number;
}

export interface InternalDependency {
  from: string;
  to: string;
  type: 'import' | 'require' | 'type-only';
}

export interface QualityMetrics {
  codeComplexity: number;
  testCoverage: number;
  documentationScore: number;
  typeSafetyScore: number;
  errorHandlingScore: number;
  maintainabilityIndex: number;
}

export interface SecurityAudit {
  pathTraversalRisks: SecurityIssue[];
  commandInjectionRisks: SecurityIssue[];
  inputValidationIssues: SecurityIssue[];
  privilegeEscalationRisks: SecurityIssue[];
  overallSecurityScore: number;
}

export interface SecurityIssue {
  file: string;
  line: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

export interface SecurityVulnerability {
  package: string;
  version: string;
  severity: string;
  description: string;
  fixAvailable: boolean;
}

export interface Recommendation {
  category: 'critical-fix' | 'performance' | 'security' | 'quality' | 'feature' | 'documentation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  implementation: string[];
  files: string[];
}

export interface AnalysisReport {
  summary: {
    projectName: string;
    analysisDate: string;
    overallHealth: number;
    criticalIssues: number;
    recommendations: number;
  };
  sections: {
    projectOverview: string;
    architectureAnalysis: string;
    qualityAssessment: string;
    securityReview: string;
    performanceAnalysis: string;
    improvementRoadmap: string;
    nextSteps: string;
  };
  data: ProjectAnalysis;
}

export class SelfProjectScanAgent {
  private contextCollector: ContextCollector;
  private contextRanker: ContextRanker;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot =
      projectRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    this.contextCollector = new ContextCollector(this.projectRoot);
    this.contextRanker = new ContextRanker();
  }

  /**
   * 执行完整的项目自我分析
   */
  async scanProject(): Promise<ProjectAnalysis> {
    outputManager.logInfo('🔍 开始项目自我分析...');

    const analysis: ProjectAnalysis = {
      projectRoot: this.projectRoot,
      structure: await this.analyzeProjectStructure(),
      components: await this.identifyCoreComponents(),
      dependencies: await this.analyzeDependencies(),
      quality: await this.assessCodeQuality(),
      security: await this.performSecurityAudit(),
      recommendations: [],
      timestamp: new Date().toISOString(),
    };

    // 生成改进建议
    analysis.recommendations = await this.generateRecommendations(analysis);

    outputManager.logInfo('✅ 项目分析完成');
    return analysis;
  }

  /**
   * 分析项目结构
   */
  private async analyzeProjectStructure(): Promise<ProjectStructure> {
    outputManager.logInfo('📁 分析项目结构...');

    const directories: DirectoryInfo[] = [];
    const files: FileInfo[] = [];
    const fileTypes: Record<string, number> = {};
    let totalLines = 0;

    const scanDirectory = async (dirPath: string, relativePath: string = ''): Promise<void> => {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const subdirectories: string[] = [];
      let fileCount = 0;

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativeFullPath = path.join(relativePath, entry.name);

        // 跳过不需要的目录
        if (entry.isDirectory() && this.shouldSkipDirectory(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          subdirectories.push(entry.name);
          await scanDirectory(fullPath, relativeFullPath);
        } else {
          const stats = await fs.promises.stat(fullPath);
          const extension = path.extname(entry.name);

          // 计算文件行数
          let lines = 0;
          if (this.isTextFile(extension)) {
            try {
              const content = await fs.promises.readFile(fullPath, 'utf-8');
              lines = content.split('\n').length;
              totalLines += lines;
            } catch (_error) {
              // 忽略读取错误
            }
          }

          const fileInfo: FileInfo = {
            path: relativeFullPath,
            name: entry.name,
            extension,
            size: stats.size,
            lines,
            lastModified: stats.mtime,
            importance: this.calculateFileImportance(relativeFullPath, extension),
          };

          files.push(fileInfo);
          fileTypes[extension] = (fileTypes[extension] || 0) + 1;
          fileCount++;
        }
      }

      if (relativePath) {
        directories.push({
          path: relativePath,
          name: path.basename(relativePath),
          fileCount,
          subdirectories,
          purpose: this.identifyDirectoryPurpose(relativePath),
        });
      }
    };

    await scanDirectory(this.projectRoot);

    return {
      directories,
      files,
      totalFiles: files.length,
      totalLines,
      fileTypes,
    };
  }

  /**
   * 识别核心组件
   */
  private async identifyCoreComponents(): Promise<CoreComponent[]> {
    outputManager.logInfo('🔧 识别核心组件...');

    const components: CoreComponent[] = [];

    // VS Code Extension
    const extensionComponent = await this.analyzeVSCodeExtension();
    if (extensionComponent) components.push(extensionComponent);

    // MCP Server
    const mcpComponent = await this.analyzeMCPServer();
    if (mcpComponent) components.push(mcpComponent);

    // Preset System
    const presetComponent = await this.analyzePresetSystem();
    if (presetComponent) components.push(presetComponent);

    // Context Intelligence
    const contextComponent = await this.analyzeContextIntelligence();
    if (contextComponent) components.push(contextComponent);

    // Tools Framework
    const toolsComponent = await this.analyzeToolsFramework();
    if (toolsComponent) components.push(toolsComponent);

    return components;
  }

  /**
   * 分析VS Code扩展组件
   */
  private async analyzeVSCodeExtension(): Promise<CoreComponent | null> {
    const extensionPath = path.join(this.projectRoot, 'packages/ai-agent');

    if (!fs.existsSync(extensionPath)) {
      return null;
    }

    const packageJsonPath = path.join(extensionPath, 'package.json');
    const extensionTsPath = path.join(extensionPath, 'src/extension.ts');

    const issues: string[] = [];
    let status: CoreComponent['status'] = 'complete';

    // 检查关键文件
    if (!fs.existsSync(packageJsonPath)) {
      issues.push('缺少 package.json 文件');
      status = 'broken';
    }

    if (!fs.existsSync(extensionTsPath)) {
      issues.push('缺少 extension.ts 入口文件');
      status = 'broken';
    }

    // 检查激活问题
    try {
      const extensionContent = await fs.promises.readFile(extensionTsPath, 'utf-8');
      if (extensionContent.includes('MCP SDK导入路径错误')) {
        issues.push('MCP SDK导入路径错误导致扩展无法启动');
        status = 'broken';
      }
    } catch (_error) {
      issues.push('无法读取extension.ts文件');
      status = 'broken';
    }

    return {
      name: 'VS Code Extension',
      path: 'packages/ai-agent/',
      type: 'extension',
      status,
      entryPoints: ['src/extension.ts'],
      publicApis: ['activate', 'deactivate'],
      dependencies: ['@vscode/vsce', 'vscode'],
      issues,
    };
  }

  /**
   * 分析MCP服务器组件
   */
  private async analyzeMCPServer(): Promise<CoreComponent | null> {
    const mcpPath = path.join(this.projectRoot, 'packages/ai-mcp');

    if (!fs.existsSync(mcpPath)) {
      return null;
    }

    const issues: string[] = [];
    let status: CoreComponent['status'] = 'partial';

    // 检查AI集成
    const aiManagerPath = path.join(mcpPath, 'src/ai/manager.ts');
    if (fs.existsSync(aiManagerPath)) {
      try {
        const content = await fs.promises.readFile(aiManagerPath, 'utf-8');
        if (content.includes('模拟 AI 响应')) {
          issues.push('使用模拟AI响应，未集成真实模型');
        }
      } catch (_error) {
        issues.push('无法读取AI管理器文件');
      }
    }

    return {
      name: 'MCP Server',
      path: 'packages/ai-mcp/',
      type: 'mcp-server',
      status,
      entryPoints: ['src/index.ts'],
      publicApis: ['startServer', 'executeWorkflow'],
      dependencies: ['@modelcontextprotocol/sdk'],
      issues,
    };
  }

  /**
   * 分析预设系统组件
   */
  private async analyzePresetSystem(): Promise<CoreComponent | null> {
    const presetsPath = path.join(this.projectRoot, 'agents/presets');

    if (!fs.existsSync(presetsPath)) {
      return null;
    }

    const presetFiles = await fs.promises.readdir(presetsPath);
    const yamlFiles = presetFiles.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    return {
      name: 'Preset System',
      path: 'agents/presets/',
      type: 'preset-system',
      status: yamlFiles.length > 0 ? 'complete' : 'partial',
      entryPoints: yamlFiles,
      publicApis: ['loadPreset', 'executePreset'],
      dependencies: ['yaml'],
      issues: yamlFiles.length === 0 ? ['没有找到预设文件'] : [],
    };
  }

  /**
   * 分析上下文智能组件
   */
  private async analyzeContextIntelligence(): Promise<CoreComponent | null> {
    const contextPath = path.join(this.projectRoot, 'packages/ai-agent/src/context');

    if (!fs.existsSync(contextPath)) {
      return null;
    }

    const collectorPath = path.join(contextPath, 'collector.ts');
    const rankerPath = path.join(contextPath, 'ranker.ts');

    const issues: string[] = [];
    let status: CoreComponent['status'] = 'complete';

    if (!fs.existsSync(collectorPath)) {
      issues.push('缺少上下文收集器');
      status = 'partial';
    }

    if (!fs.existsSync(rankerPath)) {
      issues.push('缺少上下文排序器');
      status = 'partial';
    }

    return {
      name: 'Context Intelligence',
      path: 'packages/ai-agent/src/context/',
      type: 'context-intelligence',
      status,
      entryPoints: ['collector.ts', 'ranker.ts'],
      publicApis: ['collectContext', 'rankContext'],
      dependencies: [],
      issues,
    };
  }

  /**
   * 分析工具框架组件
   */
  private async analyzeToolsFramework(): Promise<CoreComponent | null> {
    const toolsPath = path.join(this.projectRoot, 'packages/ai-mcp/src/tools');

    if (!fs.existsSync(toolsPath)) {
      return null;
    }

    const issues: string[] = [];
    let status: CoreComponent['status'] = 'partial';

    // 检查安全验证
    const fileToolsPath = path.join(toolsPath, 'file-tools.ts');
    const shellToolsPath = path.join(toolsPath, 'shell-tools.ts');

    if (fs.existsSync(fileToolsPath)) {
      try {
        const content = await fs.promises.readFile(fileToolsPath, 'utf-8');
        if (!content.includes('validateFilePath') || content.includes('// TODO')) {
          issues.push('文件工具缺少完整的安全验证');
        }
      } catch (_error) {
        issues.push('无法读取文件工具');
      }
    }

    if (fs.existsSync(shellToolsPath)) {
      try {
        const content = await fs.promises.readFile(shellToolsPath, 'utf-8');
        if (!content.includes('validateShellCommand') || content.includes('// TODO')) {
          issues.push('Shell工具缺少完整的安全验证');
        }
      } catch (_error) {
        issues.push('无法读取Shell工具');
      }
    }

    return {
      name: 'Tools Framework',
      path: 'packages/ai-mcp/src/tools/',
      type: 'tools-framework',
      status,
      entryPoints: ['index.ts', 'manager.ts'],
      publicApis: ['executeTool', 'validateTool'],
      dependencies: [],
      issues,
    };
  }

  /**
   * 分析依赖关系
   */
  private async analyzeDependencies(): Promise<DependencyAnalysis> {
    outputManager.logInfo('📦 分析依赖关系...');

    // 这里实现依赖分析逻辑
    return {
      npmPackages: [],
      internalModules: [],
      circularDependencies: [],
      unusedDependencies: [],
      vulnerabilities: [],
    };
  }

  /**
   * 评估代码质量
   */
  private async assessCodeQuality(): Promise<QualityMetrics> {
    outputManager.logInfo('📊 评估代码质量...');

    // 这里实现代码质量评估逻辑
    return {
      codeComplexity: 0,
      testCoverage: 0,
      documentationScore: 0,
      typeSafetyScore: 0,
      errorHandlingScore: 0,
      maintainabilityIndex: 0,
    };
  }

  /**
   * 执行安全审查
   */
  private async performSecurityAudit(): Promise<SecurityAudit> {
    outputManager.logInfo('🔒 执行安全审查...');

    // 这里实现安全审查逻辑
    return {
      pathTraversalRisks: [],
      commandInjectionRisks: [],
      inputValidationIssues: [],
      privilegeEscalationRisks: [],
      overallSecurityScore: 0,
    };
  }

  /**
   * 生成改进建议
   */
  private async generateRecommendations(analysis: ProjectAnalysis): Promise<Recommendation[]> {
    outputManager.logInfo('💡 生成改进建议...');

    const recommendations: Recommendation[] = [];

    // 基于组件分析生成建议
    for (const component of analysis.components) {
      for (const issue of component.issues) {
        recommendations.push({
          category: component.status === 'broken' ? 'critical-fix' : 'quality',
          priority: component.status === 'broken' ? 'high' : 'medium',
          title: `修复${component.name}问题`,
          description: issue,
          impact: `影响${component.name}的正常功能`,
          effort: 'medium',
          implementation: [`检查并修复${component.path}中的问题`],
          files: [component.path],
        });
      }
    }

    return recommendations;
  }

  /**
   * 生成分析报告
   */
  async generateReport(analysis: ProjectAnalysis): Promise<AnalysisReport> {
    outputManager.logInfo('📄 生成分析报告...');

    const report: AnalysisReport = {
      summary: {
        projectName: 'AI Agent Hub',
        analysisDate: new Date().toLocaleDateString('zh-CN'),
        overallHealth: this.calculateOverallHealth(analysis),
        criticalIssues: analysis.recommendations.filter(r => r.priority === 'high').length,
        recommendations: analysis.recommendations.length,
      },
      sections: {
        projectOverview: this.generateProjectOverview(analysis),
        architectureAnalysis: this.generateArchitectureAnalysis(analysis),
        qualityAssessment: this.generateQualityAssessment(analysis),
        securityReview: this.generateSecurityReview(analysis),
        performanceAnalysis: this.generatePerformanceAnalysis(analysis),
        improvementRoadmap: this.generateImprovementRoadmap(analysis),
        nextSteps: this.generateNextSteps(analysis),
      },
      data: analysis,
    };

    return report;
  }

  /**
   * 保存分析报告到文件
   */
  async saveReport(
    report: AnalysisReport,
    format: 'markdown' | 'json' | 'html' = 'markdown'
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const reportsDir = path.join(this.projectRoot, 'reports');

    // 确保报告目录存在
    if (!fs.existsSync(reportsDir)) {
      await fs.promises.mkdir(reportsDir, { recursive: true });
    }

    let filename: string;
    let content: string;

    switch (format) {
      case 'json':
        filename = `self-analysis-${timestamp}.json`;
        content = JSON.stringify(report, null, 2);
        break;
      case 'html':
        filename = `self-analysis-${timestamp}.html`;
        content = this.generateHTMLReport(report);
        break;
      default:
        filename = `self-analysis-${timestamp}.md`;
        content = this.generateMarkdownReport(report);
    }

    const filepath = path.join(reportsDir, filename);
    await fs.promises.writeFile(filepath, content, 'utf-8');

    outputManager.logInfo(`✅ 报告已保存: ${filepath}`);
    return filepath;
  }

  // 辅助方法

  private shouldSkipDirectory(name: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '.vscode', '.idea'];
    return skipDirs.includes(name) || name.startsWith('.');
  }

  private isTextFile(extension: string): boolean {
    const textExtensions = [
      '.ts',
      '.js',
      '.json',
      '.yaml',
      '.yml',
      '.md',
      '.txt',
      '.css',
      '.html',
      '.xml',
    ];
    return textExtensions.includes(extension.toLowerCase());
  }

  private calculateFileImportance(filePath: string, extension: string): number {
    let importance = 0;

    // 基于文件类型
    if (['.ts', '.js'].includes(extension)) importance += 3;
    else if (['.json', '.yaml', '.yml'].includes(extension)) importance += 2;
    else if (['.md'].includes(extension)) importance += 1;

    // 基于文件路径
    if (filePath.includes('src/')) importance += 2;
    if (filePath.includes('test')) importance += 1;
    if (filePath.includes('package.json')) importance += 3;
    if (filePath.includes('README')) importance += 2;

    return importance;
  }

  private identifyDirectoryPurpose(dirPath: string): string {
    const pathLower = dirPath.toLowerCase();

    if (pathLower.includes('src')) return '源代码';
    if (pathLower.includes('test')) return '测试文件';
    if (pathLower.includes('doc')) return '文档';
    if (pathLower.includes('config')) return '配置文件';
    if (pathLower.includes('tool')) return '工具';
    if (pathLower.includes('agent')) return 'AI代理';
    if (pathLower.includes('preset')) return '预设模板';
    if (pathLower.includes('package')) return '包模块';

    return '其他';
  }

  private calculateOverallHealth(analysis: ProjectAnalysis): number {
    let score = 100;

    // 基于组件状态扣分
    for (const component of analysis.components) {
      if (component.status === 'broken') score -= 20;
      else if (component.status === 'partial') score -= 10;
      else if (component.status === 'missing') score -= 15;
    }

    // 基于推荐数量扣分
    const criticalRecommendations = analysis.recommendations.filter(
      r => r.priority === 'high'
    ).length;
    score -= criticalRecommendations * 5;

    return Math.max(0, Math.min(100, score));
  }

  private generateProjectOverview(analysis: ProjectAnalysis): string {
    return `
## 项目概览

**项目名称**: AI Agent Hub
**分析时间**: ${analysis.timestamp}
**项目根目录**: ${analysis.projectRoot}

### 项目规模
- 总文件数: ${analysis.structure.totalFiles}
- 总代码行数: ${analysis.structure.totalLines}
- 目录数量: ${analysis.structure.directories.length}

### 文件类型分布
${Object.entries(analysis.structure.fileTypes)
  .sort(([, a], [, b]) => b - a)
  .map(([ext, count]) => `- ${ext || '无扩展名'}: ${count} 个文件`)
  .join('\n')}

### 核心组件状态
${analysis.components
  .map(comp => `- **${comp.name}**: ${this.getStatusEmoji(comp.status)} ${comp.status}`)
  .join('\n')}
    `.trim();
  }

  private generateArchitectureAnalysis(analysis: ProjectAnalysis): string {
    return `
## 架构分析

### 组件详情
${analysis.components
  .map(
    comp => `
#### ${comp.name}
- **路径**: ${comp.path}
- **类型**: ${comp.type}
- **状态**: ${this.getStatusEmoji(comp.status)} ${comp.status}
- **入口点**: ${comp.entryPoints.join(', ')}
- **公共API**: ${comp.publicApis.join(', ')}
- **依赖**: ${comp.dependencies.join(', ')}
${comp.issues.length > 0 ? `- **问题**: ${comp.issues.join('; ')}` : ''}
`
  )
  .join('\n')}
    `.trim();
  }

  private generateQualityAssessment(analysis: ProjectAnalysis): string {
    return `
## 代码质量评估

### 质量指标
- 代码复杂度: ${analysis.quality.codeComplexity}/10
- 测试覆盖率: ${analysis.quality.testCoverage}%
- 文档完整性: ${analysis.quality.documentationScore}/10
- 类型安全性: ${analysis.quality.typeSafetyScore}/10
- 错误处理: ${analysis.quality.errorHandlingScore}/10
- 可维护性指数: ${analysis.quality.maintainabilityIndex}/100
    `.trim();
  }

  private generateSecurityReview(analysis: ProjectAnalysis): string {
    return `
## 安全性审查

### 安全评分
总体安全评分: ${analysis.security.overallSecurityScore}/100

### 安全问题统计
- 路径遍历风险: ${analysis.security.pathTraversalRisks.length} 个
- 命令注入风险: ${analysis.security.commandInjectionRisks.length} 个
- 输入验证问题: ${analysis.security.inputValidationIssues.length} 个
- 权限提升风险: ${analysis.security.privilegeEscalationRisks.length} 个
    `.trim();
  }

  private generatePerformanceAnalysis(analysis: ProjectAnalysis): string {
    return `
## 性能分析

### 性能指标
- 项目启动时间: 待测量
- 内存使用情况: 待测量
- 文件处理速度: 待测量
- 上下文收集效率: 待优化

### 性能建议
- 实现文件缓存机制
- 优化大文件处理
- 添加并发处理支持
    `.trim();
  }

  private generateImprovementRoadmap(analysis: ProjectAnalysis): string {
    const criticalIssues = analysis.recommendations.filter(r => r.priority === 'high');
    const mediumIssues = analysis.recommendations.filter(r => r.priority === 'medium');
    const lowIssues = analysis.recommendations.filter(r => r.priority === 'low');

    return `
## 改进路线图

### 🔥 高优先级 (${criticalIssues.length} 项)
${criticalIssues.map(rec => `- **${rec.title}**: ${rec.description}`).join('\n')}

### 📈 中优先级 (${mediumIssues.length} 项)
${mediumIssues.map(rec => `- **${rec.title}**: ${rec.description}`).join('\n')}

### 💡 低优先级 (${lowIssues.length} 项)
${lowIssues.map(rec => `- **${rec.title}**: ${rec.description}`).join('\n')}
    `.trim();
  }

  private generateNextSteps(analysis: ProjectAnalysis): string {
    const nextSteps = analysis.recommendations
      .filter(r => r.priority === 'high')
      .slice(0, 5)
      .map((rec, index) => `${index + 1}. ${rec.title}`)
      .join('\n');

    return `
## 下一步行动

### 立即行动项
${nextSteps}

### 建议执行顺序
1. 修复阻塞性问题
2. 完善安全验证
3. 优化用户体验
4. 增强功能完整性
5. 提升代码质量
    `.trim();
  }

  private generateMarkdownReport(report: AnalysisReport): string {
    return `
# AI Agent Hub 自我分析报告

${report.sections.projectOverview}

${report.sections.architectureAnalysis}

${report.sections.qualityAssessment}

${report.sections.securityReview}

${report.sections.performanceAnalysis}

${report.sections.improvementRoadmap}

${report.sections.nextSteps}

---
*报告生成时间: ${report.summary.analysisDate}*
*整体健康度: ${report.summary.overallHealth}/100*
    `.trim();
  }

  private generateHTMLReport(report: AnalysisReport): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Agent Hub 自我分析报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #e9ecef; border-radius: 5px; }
        .critical { color: #dc3545; }
        .warning { color: #ffc107; }
        .success { color: #28a745; }
    </style>
</head>
<body>
    <div class="header">
        <h1>AI Agent Hub 自我分析报告</h1>
        <p>生成时间: ${report.summary.analysisDate}</p>
        <p>整体健康度: <strong>${report.summary.overallHealth}/100</strong></p>
    </div>
    
    <div class="section">
        ${report.sections.projectOverview.replace(/\n/g, '<br>')}
    </div>
    
    <div class="section">
        ${report.sections.architectureAnalysis.replace(/\n/g, '<br>')}
    </div>
    
    <div class="section">
        ${report.sections.improvementRoadmap.replace(/\n/g, '<br>')}
    </div>
</body>
</html>
    `.trim();
  }

  private getStatusEmoji(status: CoreComponent['status']): string {
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
}
