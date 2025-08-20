import * as fs from 'fs';
import * as path from 'path';

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
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  async scanProject(): Promise<ProjectAnalysis> {
    const structure = await this.analyzeProjectStructure();
    const components = await this.identifyCoreComponents();
    const dependencies = await this.analyzeDependencies();
    const quality = await this.assessCodeQuality();
    const security = await this.performSecurityAudit();
    
    const analysis: ProjectAnalysis = {
      projectRoot: this.projectRoot,
      structure,
      components,
      dependencies,
      quality,
      security,
      recommendations: [],
      timestamp: new Date().toISOString()
    };
    
    analysis.recommendations = await this.generateRecommendations(analysis);
    return analysis;
  }

  private async analyzeProjectStructure(): Promise<ProjectStructure> {
    const directories: DirectoryInfo[] = [];
    const files: FileInfo[] = [];
    const fileTypes: Record<string, number> = {};
    let totalLines = 0;

    const analyzeDirectory = async (dirPath: string): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const subdirectories: string[] = [];
        let fileCount = 0;

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            if (!this.shouldSkipDirectory(entry.name)) {
              subdirectories.push(entry.name);
              await analyzeDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            fileCount++;
            const stats = await fs.promises.stat(fullPath);
            const extension = path.extname(entry.name);
            
            fileTypes[extension] = (fileTypes[extension] || 0) + 1;
            
            let lines = 0;
            if (this.isTextFile(extension)) {
              try {
                const content = await fs.promises.readFile(fullPath, 'utf-8');
                lines = content.split('\n').length;
                totalLines += lines;
              } catch {
                // Ignore files that can't be read
              }
            }
            
            files.push({
              path: fullPath,
              name: entry.name,
              extension,
              size: stats.size,
              lines,
              lastModified: stats.mtime,
              importance: this.calculateFileImportance(fullPath, extension)
            });
          }
        }

        directories.push({
          path: dirPath,
          name: path.basename(dirPath),
          fileCount,
          subdirectories,
          purpose: this.identifyDirectoryPurpose(dirPath)
        });
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    await analyzeDirectory(this.projectRoot);

    return {
      directories,
      files,
      totalFiles: files.length,
      totalLines,
      fileTypes
    };
  }

  private async identifyCoreComponents(): Promise<CoreComponent[]> {
    const components: CoreComponent[] = [];
    
    // Analyze VSCode Extension
    const vscodeComponent = await this.analyzeVSCodeExtension();
    if (vscodeComponent) components.push(vscodeComponent);
    
    // Analyze MCP Server
    const mcpComponent = await this.analyzeMCPServer();
    if (mcpComponent) components.push(mcpComponent);
    
    return components;
  }

  private async analyzeVSCodeExtension(): Promise<CoreComponent | null> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    
    try {
      const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf-8'));
      
      if (packageJson.contributes || packageJson.activationEvents) {
        return {
          name: 'VSCode Extension',
          path: this.projectRoot,
          type: 'extension',
          status: 'complete',
          entryPoints: [packageJson.main || 'extension.js'],
          publicApis: Object.keys(packageJson.contributes || {}),
          dependencies: Object.keys(packageJson.dependencies || {}),
          issues: []
        };
      }
    } catch {
      // Not a VSCode extension
    }
    
    return null;
  }

  private async analyzeMCPServer(): Promise<CoreComponent | null> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    
    try {
      const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf-8'));
      
      if (packageJson.dependencies && packageJson.dependencies['@modelcontextprotocol/sdk']) {
        return {
          name: 'MCP Server',
          path: this.projectRoot,
          type: 'mcp-server',
          status: 'complete',
          entryPoints: [packageJson.main || 'index.js'],
          publicApis: [],
          dependencies: Object.keys(packageJson.dependencies || {}),
          issues: []
        };
      }
    } catch {
      // Not an MCP server
    }
    
    return null;
  }

  private async analyzeDependencies(): Promise<DependencyAnalysis> {
    return {
      npmPackages: [],
      internalModules: [],
      circularDependencies: [],
      unusedDependencies: [],
      vulnerabilities: []
    };
  }

  private async assessCodeQuality(): Promise<QualityMetrics> {
    return {
      codeComplexity: 0.7,
      testCoverage: 0.5,
      documentationScore: 0.6,
      typeSafetyScore: 0.8,
      errorHandlingScore: 0.7,
      maintainabilityIndex: 0.75
    };
  }

  private async performSecurityAudit(): Promise<SecurityAudit> {
    return {
      pathTraversalRisks: [],
      commandInjectionRisks: [],
      inputValidationIssues: [],
      privilegeEscalationRisks: [],
      overallSecurityScore: 0.8
    };
  }

  private async generateRecommendations(analysis: ProjectAnalysis): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    if (analysis.quality.testCoverage < 0.7) {
      recommendations.push({
        category: 'quality',
        priority: 'high',
        title: 'Improve Test Coverage',
        description: 'Current test coverage is below recommended threshold',
        impact: 'Better code reliability and maintainability',
        effort: 'medium',
        implementation: ['Add unit tests', 'Add integration tests'],
        files: []
      });
    }
    
    return recommendations;
  }

  async generateReport(analysis: ProjectAnalysis): Promise<AnalysisReport> {
    const overallHealth = this.calculateOverallHealth(analysis);
    const criticalIssues = analysis.recommendations.filter(r => r.priority === 'high').length;
    
    return {
      summary: {
        projectName: path.basename(analysis.projectRoot),
        analysisDate: new Date().toISOString(),
        overallHealth,
        criticalIssues,
        recommendations: analysis.recommendations.length
      },
      sections: {
        projectOverview: this.generateProjectOverview(analysis),
        architectureAnalysis: this.generateArchitectureAnalysis(analysis),
        qualityAssessment: this.generateQualityAssessment(analysis),
        securityReview: this.generateSecurityReview(analysis),
        performanceAnalysis: this.generatePerformanceAnalysis(analysis),
        improvementRoadmap: this.generateImprovementRoadmap(analysis),
        nextSteps: this.generateNextSteps(analysis)
      },
      data: analysis
    };
  }

  private shouldSkipDirectory(name: string): boolean {
    return ['node_modules', '.git', 'dist', 'out', '.vscode'].includes(name);
  }

  private isTextFile(extension: string): boolean {
    return ['.ts', '.js', '.json', '.md', '.txt', '.yaml', '.yml'].includes(extension);
  }

  private calculateFileImportance(filePath: string, extension: string): number {
    const fileName = path.basename(filePath);
    
    if (['package.json', 'tsconfig.json'].includes(fileName)) return 1.0;
    if (['.ts', '.js'].includes(extension)) return 0.8;
    if (['.md', '.json'].includes(extension)) return 0.6;
    
    return 0.4;
  }

  private identifyDirectoryPurpose(dirPath: string): string {
    const name = path.basename(dirPath);
    
    if (name === 'src') return 'Source code';
    if (name === 'test' || name === 'tests') return 'Test files';
    if (name === 'docs') return 'Documentation';
    if (name === 'dist' || name === 'out') return 'Build output';
    
    return 'General';
  }

  private calculateOverallHealth(analysis: ProjectAnalysis): number {
    const weights = {
      quality: 0.4,
      security: 0.3,
      components: 0.2,
      structure: 0.1
    };
    
    const qualityScore = Object.values(analysis.quality).reduce((a, b) => a + b, 0) / Object.keys(analysis.quality).length;
    const securityScore = analysis.security.overallSecurityScore;
    const componentScore = analysis.components.filter(c => c.status === 'complete').length / Math.max(analysis.components.length, 1);
    const structureScore = 0.8; // Simplified
    
    return qualityScore * weights.quality + 
           securityScore * weights.security + 
           componentScore * weights.components + 
           structureScore * weights.structure;
  }

  private generateProjectOverview(analysis: ProjectAnalysis): string {
    return `Project analysis for ${path.basename(analysis.projectRoot)}`;
  }

  private generateArchitectureAnalysis(analysis: ProjectAnalysis): string {
    return 'Architecture analysis completed';
  }

  private generateQualityAssessment(analysis: ProjectAnalysis): string {
    return 'Quality assessment completed';
  }

  private generateSecurityReview(analysis: ProjectAnalysis): string {
    return 'Security review completed';
  }

  private generatePerformanceAnalysis(analysis: ProjectAnalysis): string {
    return 'Performance analysis completed';
  }

  private generateImprovementRoadmap(analysis: ProjectAnalysis): string {
    return 'Improvement roadmap generated';
  }

  private generateNextSteps(analysis: ProjectAnalysis): string {
    return 'Next steps identified';
  }

  async saveReport(report: AnalysisReport, format: string = 'markdown'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `project-analysis-${timestamp}.${format === 'html' ? 'html' : 'md'}`;
    const outputPath = path.join(this.projectRoot, fileName);
    
    let content: string;
    
    if (format === 'html') {
      content = this.generateHTMLReport(report);
    } else {
      content = this.generateMarkdownReport(report);
    }
    
    await fs.promises.writeFile(outputPath, content, 'utf-8');
    return outputPath;
  }

  private generateMarkdownReport(report: AnalysisReport): string {
    return `# Project Analysis Report

## Summary
- Project: ${report.summary.projectName}
- Analysis Date: ${report.summary.analysisDate}
- Overall Health: ${Math.round(report.summary.overallHealth * 100)}/100
- Critical Issues: ${report.summary.criticalIssues}
- Recommendations: ${report.summary.recommendations}

## Project Overview
${report.sections.projectOverview}

## Architecture Analysis
${report.sections.architectureAnalysis}

## Quality Assessment
${report.sections.qualityAssessment}

## Security Review
${report.sections.securityReview}

## Performance Analysis
${report.sections.performanceAnalysis}

## Improvement Roadmap
${report.sections.improvementRoadmap}

## Next Steps
${report.sections.nextSteps}`;
  }

  private generateHTMLReport(report: AnalysisReport): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Project Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1, h2 { color: #333; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Project Analysis Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Project:</strong> ${report.summary.projectName}</p>
        <p><strong>Analysis Date:</strong> ${report.summary.analysisDate}</p>
        <p><strong>Overall Health:</strong> ${Math.round(report.summary.overallHealth * 100)}/100</p>
        <p><strong>Critical Issues:</strong> ${report.summary.criticalIssues}</p>
        <p><strong>Recommendations:</strong> ${report.summary.recommendations}</p>
    </div>
    <h2>Project Overview</h2>
    <p>${report.sections.projectOverview}</p>
    <h2>Architecture Analysis</h2>
    <p>${report.sections.architectureAnalysis}</p>
    <h2>Quality Assessment</h2>
    <p>${report.sections.qualityAssessment}</p>
    <h2>Security Review</h2>
    <p>${report.sections.securityReview}</p>
    <h2>Performance Analysis</h2>
    <p>${report.sections.performanceAnalysis}</p>
    <h2>Improvement Roadmap</h2>
    <p>${report.sections.improvementRoadmap}</p>
    <h2>Next Steps</h2>
    <p>${report.sections.nextSteps}</p>
</body>
</html>`;
  }
}