import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { outputManager } from '../utils/output-manager';

/**
 * C#项目信息接口
 */
export interface CSharpProjectInfo {
  /** 项目路径 */
  projectPath: string;
  /** 项目名称 */
  projectName: string;
  /** 项目类型 */
  projectType: 'console' | 'library' | 'web' | 'test' | 'unknown';
  /** .NET版本 */
  targetFramework: string;
  /** 包引用 */
  packageReferences: PackageReference[];
  /** 项目引用 */
  projectReferences: string[];
  /** 源文件统计 */
  sourceFiles: SourceFileInfo[];
  /** 代码统计 */
  codeMetrics: CodeMetrics;
  /** 质量评估 */
  qualityAssessment: QualityAssessment;
}

/**
 * 包引用接口
 */
export interface PackageReference {
  /** 包名 */
  name: string;
  /** 版本 */
  version: string;
  /** 是否为开发依赖 */
  isDevelopmentDependency?: boolean;
}

/**
 * 源文件信息接口
 */
export interface SourceFileInfo {
  /** 文件路径 */
  filePath: string;
  /** 相对路径 */
  relativePath: string;
  /** 文件大小（字节） */
  size: number;
  /** 行数 */
  lineCount: number;
  /** 代码行数（不包括空行和注释） */
  codeLineCount: number;
  /** 注释行数 */
  commentLineCount: number;
  /** 类定义 */
  classes: ClassInfo[];
  /** 接口定义 */
  interfaces: InterfaceInfo[];
  /** 枚举定义 */
  enums: EnumInfo[];
  /** 方法定义 */
  methods: MethodInfo[];
  /** 复杂度评分 */
  complexityScore: number;
}

/**
 * 类信息接口
 */
export interface ClassInfo {
  /** 类名 */
  name: string;
  /** 命名空间 */
  namespace: string;
  /** 访问修饰符 */
  accessModifier: 'public' | 'private' | 'protected' | 'internal';
  /** 是否为抽象类 */
  isAbstract: boolean;
  /** 是否为静态类 */
  isStatic: boolean;
  /** 基类 */
  baseClass?: string;
  /** 实现的接口 */
  interfaces: string[];
  /** 属性数量 */
  propertyCount: number;
  /** 方法数量 */
  methodCount: number;
  /** 行号范围 */
  lineRange: { start: number; end: number };
}

/**
 * 接口信息接口
 */
export interface InterfaceInfo {
  /** 接口名 */
  name: string;
  /** 命名空间 */
  namespace: string;
  /** 访问修饰符 */
  accessModifier: 'public' | 'private' | 'protected' | 'internal';
  /** 继承的接口 */
  baseInterfaces: string[];
  /** 方法数量 */
  methodCount: number;
  /** 属性数量 */
  propertyCount: number;
  /** 行号范围 */
  lineRange: { start: number; end: number };
}

/**
 * 枚举信息接口
 */
export interface EnumInfo {
  /** 枚举名 */
  name: string;
  /** 命名空间 */
  namespace: string;
  /** 访问修饰符 */
  accessModifier: 'public' | 'private' | 'protected' | 'internal';
  /** 枚举值数量 */
  valueCount: number;
  /** 行号范围 */
  lineRange: { start: number; end: number };
}

/**
 * 方法信息接口
 */
export interface MethodInfo {
  /** 方法名 */
  name: string;
  /** 所属类 */
  className: string;
  /** 访问修饰符 */
  accessModifier: 'public' | 'private' | 'protected' | 'internal';
  /** 是否为静态方法 */
  isStatic: boolean;
  /** 是否为异步方法 */
  isAsync: boolean;
  /** 参数数量 */
  parameterCount: number;
  /** 代码行数 */
  lineCount: number;
  /** 圈复杂度 */
  cyclomaticComplexity: number;
  /** 行号范围 */
  lineRange: { start: number; end: number };
}

/**
 * 代码统计接口
 */
export interface CodeMetrics {
  /** 总文件数 */
  totalFiles: number;
  /** 总行数 */
  totalLines: number;
  /** 总代码行数 */
  totalCodeLines: number;
  /** 总注释行数 */
  totalCommentLines: number;
  /** 注释覆盖率 */
  commentCoverage: number;
  /** 总类数 */
  totalClasses: number;
  /** 总接口数 */
  totalInterfaces: number;
  /** 总枚举数 */
  totalEnums: number;
  /** 总方法数 */
  totalMethods: number;
  /** 平均方法复杂度 */
  averageMethodComplexity: number;
  /** 最大方法复杂度 */
  maxMethodComplexity: number;
}

/**
 * 质量评估接口
 */
export interface QualityAssessment {
  /** 总体评分 (0-100) */
  overallScore: number;
  /** 代码结构评分 */
  structureScore: number;
  /** 命名规范评分 */
  namingScore: number;
  /** 复杂度评分 */
  complexityScore: number;
  /** 文档化评分 */
  documentationScore: number;
  /** 问题列表 */
  issues: QualityIssue[];
  /** 建议列表 */
  recommendations: string[];
}

/**
 * 质量问题接口
 */
export interface QualityIssue {
  /** 问题类型 */
  type: 'error' | 'warning' | 'info';
  /** 问题分类 */
  category: 'naming' | 'complexity' | 'structure' | 'documentation' | 'performance';
  /** 问题描述 */
  description: string;
  /** 文件路径 */
  filePath: string;
  /** 行号 */
  lineNumber?: number;
  /** 严重程度 (1-10) */
  severity: number;
}

/**
 * C#项目分析器
 */
export class CSharpAnalyzer {
  private static instance: CSharpAnalyzer;

  private constructor() {}

  static getInstance(): CSharpAnalyzer {
    if (!CSharpAnalyzer.instance) {
      CSharpAnalyzer.instance = new CSharpAnalyzer();
    }
    return CSharpAnalyzer.instance;
  }

  /**
   * 分析C#项目
   */
  async analyzeProject(projectPath: string): Promise<CSharpProjectInfo> {
    const projectFiles = await this.findProjectFiles(projectPath);

    if (projectFiles.length === 0) {
      throw new Error('未找到C#项目文件(.csproj)');
    }

    // 分析主项目文件
    const mainProjectFile = projectFiles[0];
    const projectInfo = await this.analyzeProjectFile(mainProjectFile);

    // 分析源代码文件
    const sourceFiles = await this.analyzeSourceFiles(projectPath);
    projectInfo.sourceFiles = sourceFiles;

    // 计算代码统计
    projectInfo.codeMetrics = this.calculateCodeMetrics(sourceFiles);

    // 进行质量评估
    projectInfo.qualityAssessment = this.assessQuality(projectInfo);

    return projectInfo;
  }

  /**
   * 查找项目文件
   */
  private async findProjectFiles(projectPath: string): Promise<string[]> {
    const projectFiles: string[] = [];

    const searchDir = async (dir: string) => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
            await searchDir(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.csproj')) {
            projectFiles.push(fullPath);
          }
        }
      } catch (error) {
        outputManager.logWarning(`无法读取目录 ${dir}: ${error}`);
      }
    };

    await searchDir(projectPath);
    return projectFiles;
  }

  /**
   * 分析项目文件
   */
  private async analyzeProjectFile(projectFilePath: string): Promise<CSharpProjectInfo> {
    const content = await fs.promises.readFile(projectFilePath, 'utf-8');
    const projectName = path.basename(projectFilePath, '.csproj');
    const projectPath = path.dirname(projectFilePath);

    // 解析项目类型
    const projectType = this.determineProjectType(content);

    // 解析目标框架
    const targetFramework = this.extractTargetFramework(content);

    // 解析包引用
    const packageReferences = this.extractPackageReferences(content);

    // 解析项目引用
    const projectReferences = this.extractProjectReferences(content);

    return {
      projectPath,
      projectName,
      projectType,
      targetFramework,
      packageReferences,
      projectReferences,
      sourceFiles: [],
      codeMetrics: {
        totalFiles: 0,
        totalLines: 0,
        totalCodeLines: 0,
        totalCommentLines: 0,
        commentCoverage: 0,
        totalClasses: 0,
        totalInterfaces: 0,
        totalEnums: 0,
        totalMethods: 0,
        averageMethodComplexity: 0,
        maxMethodComplexity: 0,
      },
      qualityAssessment: {
        overallScore: 0,
        structureScore: 0,
        namingScore: 0,
        complexityScore: 0,
        documentationScore: 0,
        issues: [],
        recommendations: [],
      },
    };
  }

  /**
   * 分析源代码文件
   */
  private async analyzeSourceFiles(projectPath: string): Promise<SourceFileInfo[]> {
    const sourceFiles: SourceFileInfo[] = [];

    const searchDir = async (dir: string) => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
            await searchDir(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.cs')) {
            const fileInfo = await this.analyzeSourceFile(fullPath, projectPath);
            sourceFiles.push(fileInfo);
          }
        }
      } catch (error) {
        outputManager.logWarning(`无法读取目录 ${dir}: ${error}`);
      }
    };

    await searchDir(projectPath);
    return sourceFiles;
  }

  /**
   * 分析单个源文件
   */
  private async analyzeSourceFile(filePath: string, projectPath: string): Promise<SourceFileInfo> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(projectPath, filePath);

    // 基本统计
    const lineCount = lines.length;
    const { codeLineCount, commentLineCount } = this.countCodeLines(lines);
    const size = Buffer.byteLength(content, 'utf-8');

    // 代码结构分析
    const classes = this.extractClasses(content);
    const interfaces = this.extractInterfaces(content);
    const enums = this.extractEnums(content);
    const methods = this.extractMethods(content);

    // 复杂度计算
    const complexityScore = this.calculateFileComplexity(content);

    return {
      filePath,
      relativePath,
      size,
      lineCount,
      codeLineCount,
      commentLineCount,
      classes,
      interfaces,
      enums,
      methods,
      complexityScore,
    };
  }

  /**
   * 计算代码行数
   */
  private countCodeLines(lines: string[]): { codeLineCount: number; commentLineCount: number } {
    let codeLineCount = 0;
    let commentLineCount = 0;
    let inBlockComment = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '') {
        continue; // 空行
      }

      if (inBlockComment) {
        commentLineCount++;
        if (trimmed.includes('*/')) {
          inBlockComment = false;
        }
        continue;
      }

      if (trimmed.startsWith('//')) {
        commentLineCount++;
      } else if (trimmed.startsWith('/*')) {
        commentLineCount++;
        if (!trimmed.includes('*/')) {
          inBlockComment = true;
        }
      } else {
        codeLineCount++;
      }
    }

    return { codeLineCount, commentLineCount };
  }

  /**
   * 提取类定义
   */
  private extractClasses(content: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const classRegex =
      /^\s*(public|private|protected|internal)?\s*(abstract|static)?\s*class\s+(\w+)(?:\s*:\s*([\w\s,<>]+))?/gm;
    const lines = content.split('\n');

    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const accessModifier = (match[1] || 'internal') as any;
      const isAbstract = match[2] === 'abstract';
      const isStatic = match[2] === 'static';
      const className = match[3];
      const inheritance = match[4] || '';

      // 解析继承关系
      const inheritanceParts = inheritance
        .split(',')
        .map(s => s.trim())
        .filter(s => s);
      const baseClass = inheritanceParts.find(part => !part.startsWith('I')) || undefined;
      const interfaces = inheritanceParts.filter(part => part.startsWith('I'));

      // 查找类的行号范围
      const lineRange = this.findCodeBlockRange(content, match.index);

      // 计算属性和方法数量
      const classContent = this.extractCodeBlock(content, match.index);
      const propertyCount = (
        classContent.match(/\s+(public|private|protected|internal)\s+[\w<>\[\]]+\s+\w+\s*{/g) || []
      ).length;
      const methodCount = (
        classContent.match(/\s+(public|private|protected|internal)\s+[\w<>\[\]]+\s+\w+\s*\(/g) || []
      ).length;

      classes.push({
        name: className,
        namespace: this.extractNamespace(content, match.index),
        accessModifier,
        isAbstract,
        isStatic,
        baseClass,
        interfaces,
        propertyCount,
        methodCount,
        lineRange,
      });
    }

    return classes;
  }

  /**
   * 提取接口定义
   */
  private extractInterfaces(content: string): InterfaceInfo[] {
    const interfaces: InterfaceInfo[] = [];
    const interfaceRegex =
      /^\s*(public|private|protected|internal)?\s*interface\s+(\w+)(?:\s*:\s*([\w\s,<>]+))?/gm;

    let match;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const accessModifier = (match[1] || 'internal') as any;
      const interfaceName = match[2];
      const baseInterfaces = match[3] ? match[3].split(',').map(s => s.trim()) : [];

      const lineRange = this.findCodeBlockRange(content, match.index);
      const interfaceContent = this.extractCodeBlock(content, match.index);

      const methodCount = (interfaceContent.match(/\s+[\w<>\[\]]+\s+\w+\s*\(/g) || []).length;
      const propertyCount = (interfaceContent.match(/\s+[\w<>\[\]]+\s+\w+\s*\{/g) || []).length;

      interfaces.push({
        name: interfaceName,
        namespace: this.extractNamespace(content, match.index),
        accessModifier,
        baseInterfaces,
        methodCount,
        propertyCount,
        lineRange,
      });
    }

    return interfaces;
  }

  /**
   * 提取枚举定义
   */
  private extractEnums(content: string): EnumInfo[] {
    const enums: EnumInfo[] = [];
    const enumRegex = /^\s*(public|private|protected|internal)?\s*enum\s+(\w+)/gm;

    let match;
    while ((match = enumRegex.exec(content)) !== null) {
      const accessModifier = (match[1] || 'internal') as any;
      const enumName = match[2];

      const lineRange = this.findCodeBlockRange(content, match.index);
      const enumContent = this.extractCodeBlock(content, match.index);

      const valueCount = (enumContent.match(/^\s*\w+\s*[,=]/gm) || []).length;

      enums.push({
        name: enumName,
        namespace: this.extractNamespace(content, match.index),
        accessModifier,
        valueCount,
        lineRange,
      });
    }

    return enums;
  }

  /**
   * 提取方法定义
   */
  private extractMethods(content: string): MethodInfo[] {
    const methods: MethodInfo[] = [];
    const methodRegex =
      /^\s*(public|private|protected|internal)\s+(static\s+)?(async\s+)?[\w<>\[\]]+\s+(\w+)\s*\(([^)]*)\)/gm;

    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      const accessModifier = match[1] as any;
      const isStatic = !!match[2];
      const isAsync = !!match[3];
      const methodName = match[4];
      const parameters = match[5];

      const parameterCount = parameters.trim() ? parameters.split(',').length : 0;
      const lineRange = this.findCodeBlockRange(content, match.index);
      const methodContent = this.extractCodeBlock(content, match.index);

      const lineCount = methodContent.split('\n').length;
      const cyclomaticComplexity = this.calculateCyclomaticComplexity(methodContent);

      methods.push({
        name: methodName,
        className: this.findContainingClass(content, match.index),
        accessModifier,
        isStatic,
        isAsync,
        parameterCount,
        lineCount,
        cyclomaticComplexity,
        lineRange,
      });
    }

    return methods;
  }

  /**
   * 计算圈复杂度
   */
  private calculateCyclomaticComplexity(code: string): number {
    let complexity = 1; // 基础复杂度

    // 计算决策点
    const decisionPoints = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bforeach\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\b&&\b/g,
      /\b\|\|\b/g,
      /\?.*:/g, // 三元操作符
    ];

    for (const pattern of decisionPoints) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * 计算代码统计
   */
  private calculateCodeMetrics(sourceFiles: SourceFileInfo[]): CodeMetrics {
    const totalFiles = sourceFiles.length;
    const totalLines = sourceFiles.reduce((sum, file) => sum + file.lineCount, 0);
    const totalCodeLines = sourceFiles.reduce((sum, file) => sum + file.codeLineCount, 0);
    const totalCommentLines = sourceFiles.reduce((sum, file) => sum + file.commentLineCount, 0);
    const commentCoverage = totalCodeLines > 0 ? (totalCommentLines / totalCodeLines) * 100 : 0;

    const totalClasses = sourceFiles.reduce((sum, file) => sum + file.classes.length, 0);
    const totalInterfaces = sourceFiles.reduce((sum, file) => sum + file.interfaces.length, 0);
    const totalEnums = sourceFiles.reduce((sum, file) => sum + file.enums.length, 0);
    const totalMethods = sourceFiles.reduce((sum, file) => sum + file.methods.length, 0);

    const allMethods = sourceFiles.flatMap(file => file.methods);
    const averageMethodComplexity =
      allMethods.length > 0
        ? allMethods.reduce((sum, method) => sum + method.cyclomaticComplexity, 0) /
          allMethods.length
        : 0;
    const maxMethodComplexity =
      allMethods.length > 0
        ? Math.max(...allMethods.map(method => method.cyclomaticComplexity))
        : 0;

    return {
      totalFiles,
      totalLines,
      totalCodeLines,
      totalCommentLines,
      commentCoverage,
      totalClasses,
      totalInterfaces,
      totalEnums,
      totalMethods,
      averageMethodComplexity,
      maxMethodComplexity,
    };
  }

  /**
   * 质量评估
   */
  private assessQuality(projectInfo: CSharpProjectInfo): QualityAssessment {
    const issues: QualityIssue[] = [];
    const recommendations: string[] = [];

    // 结构评分
    let structureScore = 100;

    // 命名规范评分
    let namingScore = 100;

    // 复杂度评分
    let complexityScore = 100;
    if (projectInfo.codeMetrics.averageMethodComplexity > 10) {
      complexityScore -= 20;
      issues.push({
        type: 'warning',
        category: 'complexity',
        description: `平均方法复杂度过高: ${projectInfo.codeMetrics.averageMethodComplexity.toFixed(1)}`,
        filePath: projectInfo.projectPath,
        severity: 6,
      });
    }

    if (projectInfo.codeMetrics.maxMethodComplexity > 20) {
      complexityScore -= 30;
      issues.push({
        type: 'error',
        category: 'complexity',
        description: `存在极高复杂度方法: ${projectInfo.codeMetrics.maxMethodComplexity}`,
        filePath: projectInfo.projectPath,
        severity: 8,
      });
    }

    // 文档化评分
    let documentationScore = Math.min(100, projectInfo.codeMetrics.commentCoverage * 2);
    if (projectInfo.codeMetrics.commentCoverage < 20) {
      issues.push({
        type: 'warning',
        category: 'documentation',
        description: `注释覆盖率过低: ${projectInfo.codeMetrics.commentCoverage.toFixed(1)}%`,
        filePath: projectInfo.projectPath,
        severity: 5,
      });
      recommendations.push('增加代码注释，提高代码可读性');
    }

    // 生成建议
    if (projectInfo.codeMetrics.averageMethodComplexity > 5) {
      recommendations.push('考虑重构复杂方法，提高代码可维护性');
    }

    if (projectInfo.codeMetrics.totalClasses > 50) {
      recommendations.push('项目规模较大，建议考虑模块化设计');
    }

    const overallScore = (structureScore + namingScore + complexityScore + documentationScore) / 4;

    return {
      overallScore,
      structureScore,
      namingScore,
      complexityScore,
      documentationScore,
      issues,
      recommendations,
    };
  }

  // 辅助方法
  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = ['bin', 'obj', '.vs', '.git', 'node_modules', 'packages'];
    return skipDirs.includes(dirName);
  }

  private determineProjectType(
    content: string
  ): 'console' | 'library' | 'web' | 'test' | 'unknown' {
    if (content.includes('<OutputType>Exe</OutputType>')) return 'console';
    if (content.includes('<OutputType>Library</OutputType>')) return 'library';
    if (content.includes('Microsoft.AspNetCore')) return 'web';
    if (content.includes('Microsoft.NET.Test.Sdk')) return 'test';
    return 'unknown';
  }

  private extractTargetFramework(content: string): string {
    const match = content.match(/<TargetFramework>(.*?)<\/TargetFramework>/);
    return match ? match[1] : 'unknown';
  }

  private extractPackageReferences(content: string): PackageReference[] {
    const packages: PackageReference[] = [];
    const regex = /<PackageReference\s+Include="([^"]+)"\s+Version="([^"]+)"/g;

    let match;
    while ((match = regex.exec(content)) !== null) {
      packages.push({
        name: match[1],
        version: match[2],
      });
    }

    return packages;
  }

  private extractProjectReferences(content: string): string[] {
    const projects: string[] = [];
    const regex = /<ProjectReference\s+Include="([^"]+)"/g;

    let match;
    while ((match = regex.exec(content)) !== null) {
      projects.push(match[1]);
    }

    return projects;
  }

  private extractNamespace(content: string, position: number): string {
    const beforePosition = content.substring(0, position);
    const match = beforePosition.match(/namespace\s+([\w.]+)/g);
    return match ? match[match.length - 1].replace('namespace ', '') : 'global';
  }

  private findCodeBlockRange(content: string, startIndex: number): { start: number; end: number } {
    const lines = content.substring(0, startIndex).split('\n');
    const start = lines.length;

    // 简化实现：假设代码块在接下来的50行内
    const end = start + 50;

    return { start, end };
  }

  private extractCodeBlock(content: string, startIndex: number): string {
    // 简化实现：提取接下来的1000个字符
    return content.substring(startIndex, startIndex + 1000);
  }

  private findContainingClass(content: string, methodIndex: number): string {
    const beforeMethod = content.substring(0, methodIndex);
    const classMatch = beforeMethod.match(/class\s+(\w+)/g);
    return classMatch ? classMatch[classMatch.length - 1].replace('class ', '') : 'unknown';
  }

  private calculateFileComplexity(content: string): number {
    // 基于多个因素计算文件复杂度
    const lines = content.split('\n').length;
    const classes = (content.match(/class\s+\w+/g) || []).length;
    const methods = (content.match(/\w+\s*\(/g) || []).length;
    const conditionals = (content.match(/\b(if|while|for|switch)\b/g) || []).length;

    return Math.round(lines * 0.1 + classes * 5 + methods * 2 + conditionals * 3);
  }
}

/**
 * 获取C#分析器实例
 */
export function getCSharpAnalyzer(): CSharpAnalyzer {
  return CSharpAnalyzer.getInstance();
}
