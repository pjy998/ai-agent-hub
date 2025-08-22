import * as vscode from 'vscode';
import { OptimizedSelfProjectScanAgent } from '../agents/OptimizedSelfProjectScanAgent';
import { OPTIMIZATION_PRESETS } from '../config/optimization-config';
import { getCopilotChatAPI, CopilotChatRequest } from '../integrations/copilot-chat-api';

/**
 * GitHub Copilot Chat 支持的模型列表
 * 更新时间: 2024年12月
 * 扣费倍数: 0x = 免费, 0.33x = 1/3费用, 1x = 标准费用
 * 
 * 注意：estimatedTokenLimit 仅为预估值，由于GitHub Copilot通过微软代理访问模型，
 * 实际的Token限制可能与原厂设置不同，建议使用Token Probe功能进行实际测试
 */
export const COPILOT_MODELS = {
  // OpenAI 系列
  'gpt-4.1': {
    name: 'GPT-4.1',
    description: '最新的GPT-4模型，支持长上下文',
    estimatedTokenLimit: 128000,
    costMultiplier: 0, // 0x 免费
    provider: 'OpenAI'
  },
  'gpt-4o': {
    name: 'GPT-4o',
    description: 'GPT-4 Omni模型，多模态能力',
    estimatedTokenLimit: 128000,
    costMultiplier: 0, // 0x 免费
    provider: 'OpenAI'
  },
  'gpt-5-mini': {
    name: 'GPT-5 mini (Preview)',
    description: 'GPT-5 mini预览版，轻量级模型',
    estimatedTokenLimit: 64000,
    costMultiplier: 0, // 0x 免费
    provider: 'OpenAI',
    isPreview: true
  },
  'gpt-5': {
    name: 'GPT-5 (Preview)',
    description: 'GPT-5预览版，最先进的语言模型',
    estimatedTokenLimit: 200000,
    costMultiplier: 1.0, // 1x 标准费用
    provider: 'OpenAI',
    isPreview: true
  },
  'o3-mini': {
    name: 'o3-mini',
    description: 'OpenAI o3-mini模型，推理优化',
    estimatedTokenLimit: 64000,
    costMultiplier: 0.33, // 0.33x
    provider: 'OpenAI'
  },
  'o4-mini': {
    name: 'o4-mini (Preview)',
    description: 'OpenAI o4-mini预览版',
    estimatedTokenLimit: 64000,
    costMultiplier: 0.33, // 0.33x
    provider: 'OpenAI',
    isPreview: true
  },
  
  // Anthropic Claude 系列
  'claude-sonnet-3.5': {
    name: 'Claude Sonnet 3.5',
    description: 'Anthropic Claude Sonnet 3.5模型',
    estimatedTokenLimit: 200000,
    costMultiplier: 1.0, // 1x 标准费用
    provider: 'Anthropic'
  },
  'claude-sonnet-3.7': {
    name: 'Claude Sonnet 3.7',
    description: 'Anthropic Claude Sonnet 3.7模型',
    estimatedTokenLimit: 200000,
    costMultiplier: 1.0, // 1x 标准费用
    provider: 'Anthropic'
  },
  'claude-sonnet-4': {
    name: 'Claude Sonnet 4',
    description: 'Anthropic Claude Sonnet 4模型',
    estimatedTokenLimit: 300000,
    costMultiplier: 1.0, // 1x 标准费用
    provider: 'Anthropic'
  },
  
  // Google Gemini 系列
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    description: 'Google Gemini 2.5 Pro模型',
    estimatedTokenLimit: 1000000,
    costMultiplier: 1.0, // 1x 标准费用
    provider: 'Google'
  },
  
  // 兼容旧版本模型名称
  'gpt-4': {
    name: 'GPT-4 (Legacy)',
    description: '标准GPT-4模型（旧版本兼容）',
    estimatedTokenLimit: 8192,
    costMultiplier: 0,
    provider: 'OpenAI',
    isLegacy: true
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo (Legacy)',
    description: '快速响应的GPT-3.5模型（旧版本兼容）',
    estimatedTokenLimit: 4096,
    costMultiplier: 0,
    provider: 'OpenAI',
    isLegacy: true
  },
  'claude-3-sonnet': {
    name: 'Claude 3 Sonnet (Legacy)',
    description: 'Anthropic Claude 3 Sonnet模型（旧版本兼容）',
    estimatedTokenLimit: 200000,
    costMultiplier: 1.0,
    provider: 'Anthropic',
    isLegacy: true
  },
  'claude-3-haiku': {
    name: 'Claude 3 Haiku (Legacy)',
    description: 'Anthropic Claude 3 Haiku模型（旧版本兼容）',
    estimatedTokenLimit: 200000,
    costMultiplier: 1.0,
    provider: 'Anthropic',
    isLegacy: true
  }
} as const;

export type CopilotModel = keyof typeof COPILOT_MODELS;

/**
 * Token Probe 配置接口
 */
export interface TokenProbeConfig {
  /** 目标模型 */
  model: CopilotModel;
  /** 起始token数量 */
  startTokens: number;
  /** 最大token数量 */
  maxTokens: number;
  /** 每次递增的步长 */
  stepSize: number;
  /** 是否启用二分法优化 */
  enableBinarySearch: boolean;
  /** 测试超时时间(毫秒) */
  timeout: number;
  /** 重试次数 */
  retryCount: number;
}

/**
 * Token Probe 结果接口
 */
export interface TokenProbeResult {
  /** 测试的模型 */
  model: CopilotModel;
  /** 最大可用上下文token数 */
  maxContextTokens: number;
  /** 测试过程中的步骤 */
  testSteps: TokenProbeStep[];
  /** 总测试时间(毫秒) */
  totalTestTime: number;
  /** 测试状态 */
  status: 'success' | 'failed' | 'timeout';
  /** 错误信息 */
  error?: string;
  /** 项目信息 */
  projectInfo: {
    path: string;
    totalFiles: number;
    summaryLength: number;
  };
}

/**
 * Token Probe 测试步骤
 */
export interface TokenProbeStep {
  /** 步骤序号 */
  step: number;
  /** 测试的token数量 */
  tokenCount: number;
  /** 实际发送的内容长度 */
  contentLength: number;
  /** 测试结果 */
  result: 'success' | 'failed' | 'error';
  /** 响应时间(毫秒) */
  responseTime: number;
  /** 错误信息 */
  error?: string;
  /** 测试方法 */
  method: 'linear' | 'binary';
}

/**
 * Token Probe 核心类
 */
export class TokenProbe {
  private config: TokenProbeConfig;
  private projectSummary: string = '';
  private basePrompt: string = '';
  
  constructor(config: Partial<TokenProbeConfig> = {}) {
    this.config = {
      model: 'gpt-4.1',
      startTokens: 10000,
      maxTokens: 200000,
      stepSize: 10000,
      enableBinarySearch: true,
      timeout: 30000,
      retryCount: 3,
      ...config
    };
  }
  
  /**
   * 执行Token Probe测试
   */
  async probe(projectPath: string): Promise<TokenProbeResult> {
    const startTime = Date.now();
    const result: TokenProbeResult = {
      model: this.config.model,
      maxContextTokens: 0,
      testSteps: [],
      totalTestTime: 0,
      status: 'failed',
      projectInfo: {
        path: projectPath,
        totalFiles: 0,
        summaryLength: 0
      }
    };
    
    try {
      // 1. 生成项目摘要
      await this.generateProjectSummary(projectPath, result);
      
      // 2. 准备基础提示词
      this.prepareBasePrompt();
      
      // 3. 执行token限制测试
      if (this.config.enableBinarySearch) {
        await this.binarySearchTest(result);
      } else {
        await this.linearSearchTest(result);
      }
      
      result.status = 'success';
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      result.status = 'failed';
    } finally {
      result.totalTestTime = Date.now() - startTime;
    }
    
    return result;
  }
  
  /**
   * 生成项目摘要
   */
  private async generateProjectSummary(projectPath: string, result: TokenProbeResult): Promise<void> {
    try {
      // 使用优化版本的扫描代理生成项目摘要
      const agent = new OptimizedSelfProjectScanAgent();
      const scanResult = await agent.scanProject();
      
      // 更新项目信息
      result.projectInfo.totalFiles = scanResult.components?.length || 0;
      
      // 生成详细的项目摘要
      this.projectSummary = this.generateDetailedSummary(scanResult);
      result.projectInfo.summaryLength = this.projectSummary.length;
      
    } catch (error) {
      // 如果扫描失败，使用简单的文件列表作为摘要
      this.projectSummary = await this.generateSimpleSummary(projectPath);
      result.projectInfo.summaryLength = this.projectSummary.length;
    }
  }
  
  /**
   * 生成指定大小的项目摘要
   */
  private async generateProjectSummaryWithSize(targetSize: number): Promise<string> {
    try {
      // 使用优化的项目扫描代理
      const scanAgent = new OptimizedSelfProjectScanAgent();
      
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('未找到工作区文件夹');
      }
      
      // 扫描项目
      const result = await scanAgent.scanProject();
      
      // 构建基础摘要
      const baseSummary = this.buildBaseSummary(result, targetSize);
      
      // 根据目标大小调整内容
      return this.adjustSummarySize(baseSummary, targetSize);
      
    } catch (error) {
      throw new Error(`生成项目摘要失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 构建基础摘要
   */
  private buildBaseSummary(result: any, targetSize: number): string {
    const sections = [
      `# Token Probe 测试项目摘要`,
      `\n## 测试配置`,
      `- 目标大小: ${targetSize.toLocaleString()} 字符`,
      `- 模型: ${this.config.model}`,
      `- 测试时间: ${new Date().toLocaleString()}`,
      `\n## 项目基本信息`,
      `- 项目路径: ${result.projectPath}`,
      `- 文件总数: ${result.fileCount || 0}`,
      `- 项目大小: ${(result.totalSize || 0).toLocaleString()} 字节`,
      `- 扫描耗时: ${result.scanDuration || 0}ms`
    ];
    
    if (result.structure) {
      sections.push(`\n## 项目结构`, result.structure);
    }
    
    if (result.content) {
      sections.push(`\n## 主要文件内容`, result.content);
    }
    
    if (result.dependencies) {
      sections.push(`\n## 依赖信息`, JSON.stringify(result.dependencies, null, 2));
    }
    
    return sections.join('\n');
  }
  
  /**
   * 调整摘要大小以匹配目标
   */
  private adjustSummarySize(summary: string, targetSize: number): string {
    const currentSize = summary.length;
    
    if (currentSize > targetSize) {
      // 内容过长，需要截断
      const truncatePoint = targetSize - 200; // 预留空间给截断提示
      const truncated = summary.substring(0, truncatePoint);
      return truncated + '\n\n[内容已截断以适应Token限制测试]\n' + 
             `原始长度: ${currentSize.toLocaleString()} 字符\n` +
             `截断后长度: ${(truncatePoint + 100).toLocaleString()} 字符`;
    } else if (currentSize < targetSize * 0.8) {
      // 内容过短，需要填充
      return this.padSummaryContent(summary, targetSize);
    }
    
    return summary;
  }
  
  /**
   * 填充摘要内容
   */
  private padSummaryContent(summary: string, targetSize: number): string {
    const currentSize = summary.length;
    const needPadding = targetSize - currentSize - 200; // 预留空间
    
    if (needPadding <= 0) {
      return summary;
    }
    
    const paddingContent = this.generatePaddingContent(needPadding);
    
    return summary + '\n\n## Token测试填充内容\n' + paddingContent + 
           `\n\n[已添加 ${needPadding.toLocaleString()} 字符填充内容以达到目标大小]`;
  }
  
  /**
   * 生成详细的项目摘要
   */
  private generateDetailedSummary(scanResult: any): string {
    let summary = `# 项目分析摘要\n\n`;
    
    // 项目结构信息
    summary += `## 项目结构\n`;
    summary += `- 总文件数: ${scanResult.structure.totalFiles}\n`;
    summary += `- 代码文件数: ${scanResult.structure.codeFiles}\n`;
    summary += `- 总代码行数: ${scanResult.structure.totalLines}\n`;
    summary += `- 项目大小: ${scanResult.structure.totalSize} 字节\n\n`;
    
    // 核心组件
    if (scanResult.coreComponents && scanResult.coreComponents.length > 0) {
      summary += `## 核心组件 (${scanResult.coreComponents.length}个)\n`;
      scanResult.coreComponents.slice(0, 10).forEach((component: any, index: number) => {
        summary += `${index + 1}. **${component.name}** (${component.type})\n`;
        summary += `   - 文件: ${component.filePath}\n`;
        summary += `   - 描述: ${component.description || '无描述'}\n`;
        if (component.dependencies && component.dependencies.length > 0) {
          summary += `   - 依赖: ${component.dependencies.slice(0, 3).join(', ')}${component.dependencies.length > 3 ? '...' : ''}\n`;
        }
        summary += `\n`;
      });
    }
    
    // 依赖分析
    if (scanResult.dependencies) {
      summary += `## 依赖分析\n`;
      if (scanResult.dependencies.external && scanResult.dependencies.external.length > 0) {
        summary += `### 外部依赖 (${scanResult.dependencies.external.length}个)\n`;
        scanResult.dependencies.external.slice(0, 15).forEach((dep: any) => {
          summary += `- ${dep.name}${dep.version ? `@${dep.version}` : ''}\n`;
        });
        summary += `\n`;
      }
      
      if (scanResult.dependencies.internal && scanResult.dependencies.internal.length > 0) {
        summary += `### 内部依赖 (${scanResult.dependencies.internal.length}个)\n`;
        scanResult.dependencies.internal.slice(0, 10).forEach((dep: any) => {
          summary += `- ${dep.name} (${dep.type})\n`;
        });
        summary += `\n`;
      }
    }
    
    // 代码质量指标
    if (scanResult.qualityMetrics) {
      summary += `## 代码质量指标\n`;
      summary += `- 整体评分: ${scanResult.qualityMetrics.overallScore}/100\n`;
      summary += `- 代码复杂度: ${scanResult.qualityMetrics.complexity || '未知'}\n`;
      summary += `- 测试覆盖率: ${scanResult.qualityMetrics.testCoverage || '未知'}\n`;
      summary += `- 文档完整性: ${scanResult.qualityMetrics.documentation || '未知'}\n\n`;
    }
    
    // 推荐建议
    if (scanResult.recommendations && scanResult.recommendations.length > 0) {
      summary += `## 推荐建议\n`;
      scanResult.recommendations.slice(0, 5).forEach((rec: any, index: number) => {
        summary += `${index + 1}. **${rec.title}** (${rec.priority})\n`;
        summary += `   ${rec.description}\n\n`;
      });
    }
    
    return summary;
  }
  
  /**
   * 生成简单的项目摘要
   */
  private async generateSimpleSummary(projectPath: string): Promise<string> {
    const fs = require('fs').promises;
    const path = require('path');
    
    let summary = `# 项目文件列表\n\n项目路径: ${projectPath}\n\n`;
    
    try {
      const files = await this.getProjectFiles(projectPath);
      summary += `总文件数: ${files.length}\n\n## 文件列表\n`;
      
      files.slice(0, 50).forEach((file, index) => {
        summary += `${index + 1}. ${file}\n`;
      });
      
      if (files.length > 50) {
        summary += `... 还有 ${files.length - 50} 个文件\n`;
      }
      
    } catch (error) {
      summary += `无法读取项目文件: ${error}\n`;
    }
    
    return summary;
  }
  
  /**
   * 获取项目文件列表
   */
  private async getProjectFiles(projectPath: string): Promise<string[]> {
    const fs = require('fs').promises;
    const path = require('path');
    const files: string[] = [];
    
    const scanDir = async (dirPath: string, relativePath: string = '') => {
      try {
        const items = await fs.readdir(dirPath);
        
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const relativeItemPath = path.join(relativePath, item);
          const stat = await fs.stat(itemPath);
          
          if (stat.isDirectory()) {
            // 跳过常见的忽略目录
            if (!['node_modules', '.git', 'dist', 'out', 'build', 'bin', 'obj'].includes(item)) {
              await scanDir(itemPath, relativeItemPath);
            }
          } else {
            files.push(relativeItemPath);
          }
        }
      } catch (error) {
        // 忽略权限错误
      }
    };
    
    await scanDir(projectPath);
    return files;
  }
  
  /**
   * 准备基础提示词
   */
  private prepareBasePrompt(): void {
    this.basePrompt = [
      '# Token Probe 测试请求',
      '',
      '你是GitHub Copilot Chat AI助手，正在进行Token上下文限制测试。',
      '',
      '## 测试目标',
      '- 测试当前模型的最大可用上下文长度',
      '- 使用二分法逐步增加内容直到达到Token限制',
      '- 记录准确的Token限制阈值',
      '',
      '## 响应要求',
      '请简单回复"Token测试成功"来确认你能够处理这个请求。',
      '无需分析或总结以下项目内容，仅需确认接收。',
      '',
      '## 项目内容（用于Token限制测试）',
      ''
    ].join('\n');
  }
  
  /**
   * 生成填充内容
   */
  private generatePaddingContent(size: number): string {
    const patterns = [
      '这是用于Token限制测试的填充内容。',
      '本段落用于增加文本长度以测试模型的上下文处理能力。',
      '通过逐步增加内容长度，我们可以准确测定模型的Token限制。',
      '二分法搜索能够高效地找到最大可用上下文长度。',
      'GitHub Copilot Chat支持多种模型，每种模型都有不同的Token限制。'
    ];
    
    let content = '';
    let patternIndex = 0;
    
    while (content.length < size) {
      const pattern = patterns[patternIndex % patterns.length];
      const remaining = size - content.length;
      
      if (remaining < pattern.length) {
        content += pattern.substring(0, remaining);
        break;
      }
      
      content += pattern + '\n';
      patternIndex++;
    }
    
    return content;
  }
  
  /**
   * 线性搜索测试
   */
  private async linearSearchTest(result: TokenProbeResult): Promise<void> {
    let currentTokens = this.config.startTokens;
    let stepCount = 0;
    
    while (currentTokens <= this.config.maxTokens) {
      stepCount++;
      
      const step: TokenProbeStep = {
        step: stepCount,
        tokenCount: currentTokens,
        contentLength: 0,
        result: 'failed',
        responseTime: 0,
        method: 'linear'
      };
      
      const testContent = await this.generateTestContent(currentTokens);
      step.contentLength = testContent.length;
      
      const stepStartTime = Date.now();
      
      try {
        const success = await this.testTokenLimit(testContent);
        step.responseTime = Date.now() - stepStartTime;
        
        if (success) {
          step.result = 'success';
          result.maxContextTokens = currentTokens;
        } else {
          step.result = 'failed';
          result.testSteps.push(step);
          break;
        }
        
      } catch (error) {
        step.result = 'error';
        step.error = error instanceof Error ? error.message : String(error);
        step.responseTime = Date.now() - stepStartTime;
        result.testSteps.push(step);
        break;
      }
      
      result.testSteps.push(step);
      currentTokens += this.config.stepSize;
    }
  }
  
  /**
   * 二分法搜索测试
   */
  private async binarySearchTest(result: TokenProbeResult): Promise<void> {
    let low = this.config.startTokens;
    let high = this.config.maxTokens;
    let stepCount = 0;
    
    while (low <= high) {
      stepCount++;
      const mid = Math.floor((low + high) / 2);
      
      const step: TokenProbeStep = {
        step: stepCount,
        tokenCount: mid,
        contentLength: 0,
        result: 'failed',
        responseTime: 0,
        method: 'binary'
      };
      
      const testContent = await this.generateTestContent(mid);
      step.contentLength = testContent.length;
      
      const stepStartTime = Date.now();
      
      try {
        const success = await this.testTokenLimit(testContent);
        step.responseTime = Date.now() - stepStartTime;
        
        if (success) {
          step.result = 'success';
          result.maxContextTokens = mid;
          low = mid + 1; // 尝试更大的值
        } else {
          step.result = 'failed';
          high = mid - 1; // 尝试更小的值
        }
        
      } catch (error) {
        step.result = 'error';
        step.error = error instanceof Error ? error.message : String(error);
        step.responseTime = Date.now() - stepStartTime;
        high = mid - 1; // 出错时也尝试更小的值
      }
      
      result.testSteps.push(step);
      
      // 如果连续几次都失败，提前退出
      const recentSteps = result.testSteps.slice(-3);
      if (recentSteps.length >= 3 && recentSteps.every(s => s.result !== 'success')) {
        break;
      }
    }
  }
  
  /**
   * 生成指定token数量的测试内容
   */
  private async generateTestContent(targetTokens: number): Promise<string> {
    // 估算：1个token约等于4个字符（英文）或1.5个字符（中文）
    // 这里使用保守估计：1个token = 3个字符
    const targetLength = targetTokens * 3;
    
    // 动态生成指定大小的项目摘要
    const projectSummary = await this.generateProjectSummaryWithSize(targetLength - this.basePrompt.length - 100);
    
    let content = this.basePrompt + projectSummary;
    
    // 如果内容不够长，添加填充内容
    if (content.length < targetLength) {
      const needPadding = targetLength - content.length;
      const paddingContent = this.generatePaddingContent(needPadding);
      content += '\n\n## 额外填充内容\n' + paddingContent;
    }
    
    // 截断到目标长度
    if (content.length > targetLength) {
      content = content.substring(0, targetLength - 50) + '\n\n[内容已截断到目标长度]';
    }
    
    return content;
  }
  
  /**
   * 测试token限制
   */
  private async testTokenLimit(content: string): Promise<boolean> {
    try {
      // 获取GitHub Copilot Chat API
      const copilotApi = await this.getCopilotChatApi();
      
      // 创建测试请求
      const request: CopilotChatRequest = {
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: content
          }
        ],
        max_tokens: 100, // 只需要少量响应来测试
        temperature: 0.1
      };
      
      // 发送请求并设置超时
      const response = await Promise.race([
        copilotApi.sendRequest(request),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('请求超时')), this.config.timeout)
        )
      ]);
      
      return true; // 如果没有抛出异常，说明成功
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      
      // 检查是否是token限制错误
      const tokenLimitErrors = [
        'token limit exceeded',
        'request too large',
        'context length exceeded',
        'maximum context length',
        'too many tokens',
        'input too long',
        'context_length_exceeded',
        'max_tokens_exceeded'
      ];
      
      const isTokenLimitError = tokenLimitErrors.some(errorPattern => 
        errorMessage.includes(errorPattern)
      );
      
      if (isTokenLimitError) {
        return false; // 确认是token限制错误
      }
      
      // 其他错误重新抛出
      throw error;
    }
  }
  
  /**
   * 获取GitHub Copilot Chat API
   */
  private async getCopilotChatApi(): Promise<any> {
    const api = getCopilotChatAPI();
    await api.initialize();
    return api;
  }
  

  
  /**
   * 生成测试报告
   */
  generateReport(result: TokenProbeResult): string {
    let report = `# Token Probe 测试报告\n\n`;
    
    // 基本信息
    report += `## 📊 测试概览\n`;
    report += `- **测试模型**: ${result.model}\n`;
    report += `- **测试状态**: ${result.status === 'success' ? '✅ 成功' : '❌ 失败'}\n`;
    report += `- **最大上下文**: ${result.maxContextTokens.toLocaleString()} tokens\n`;
    report += `- **总测试时间**: ${this.formatDuration(result.totalTestTime)}\n\n`;
    
    // 项目信息
    report += `## 📁 项目信息\n`;
    report += `- **项目路径**: ${result.projectInfo.path}\n`;
    report += `- **文件数量**: ${result.projectInfo.totalFiles}\n`;
    report += `- **摘要长度**: ${result.projectInfo.summaryLength.toLocaleString()} 字符\n`;
    report += `- **Token/字符比**: ${(result.maxContextTokens / result.projectInfo.summaryLength).toFixed(3)}\n\n`;
    
    // 性能统计
    if (result.testSteps.length > 0) {
      const avgResponseTime = result.testSteps.reduce((sum, step) => sum + step.responseTime, 0) / result.testSteps.length;
      const successfulSteps = result.testSteps.filter(s => s.result === 'success').length;
      const successRate = (successfulSteps / result.testSteps.length * 100).toFixed(1);
      
      report += `## 📈 性能统计\n`;
      report += `- **总测试步数**: ${result.testSteps.length}\n`;
      report += `- **成功步数**: ${successfulSteps}\n`;
      report += `- **成功率**: ${successRate}%\n`;
      report += `- **平均响应时间**: ${this.formatDuration(avgResponseTime)}\n`;
      report += `- **测试效率**: ${(result.maxContextTokens / result.totalTestTime * 1000).toFixed(0)} tokens/秒\n\n`;
    }
    
    // 测试步骤详情
    if (result.testSteps.length > 0) {
      report += `## 📋 测试步骤详情\n\n`;
      report += `| 步骤 | Token数 | 内容长度 | 方法 | 结果 | 响应时间 | 错误信息 |\n`;
      report += `|------|---------|----------|------|------|----------|----------|\n`;
      
      result.testSteps.forEach(step => {
        const resultIcon = step.result === 'success' ? '✅' : step.result === 'failed' ? '❌' : '⚠️';
        const error = step.error ? step.error.substring(0, 30) + '...' : '-';
        const tokenRange = this.getTokenRange(step.tokenCount);
        
        report += `| ${step.step} | ${step.tokenCount.toLocaleString()} (${tokenRange}) | ${step.contentLength.toLocaleString()} | ${step.method} | ${resultIcon} | ${this.formatDuration(step.responseTime)} | ${error} |\n`;
      });
      
      report += `\n`;
    }
    
    // 结论和建议
    report += `## 💡 结论和建议\n\n`;
    
    if (result.status === 'success') {
      report += `🎉 **测试成功完成！**\n\n`;
      report += `### 📊 核心发现\n`;
      report += `- **${result.model}** 模型的最大上下文限制为 **${result.maxContextTokens.toLocaleString()} tokens**\n`;
      report += `- 推荐安全使用上下文: **${Math.floor(result.maxContextTokens * 0.8).toLocaleString()} tokens** (80%安全边距)\n`;
      report += `- 保守使用上下文: **${Math.floor(result.maxContextTokens * 0.6).toLocaleString()} tokens** (60%安全边距)\n\n`;
      
      // 使用建议
      report += `### 🎯 使用建议\n`;
      if (result.maxContextTokens > 100000) {
        report += `- ✅ 该模型支持**超长上下文**，非常适合大型项目分析\n`;
        report += `- ✅ 可以一次性处理完整的项目代码库\n`;
        report += `- ⚠️ 注意响应时间可能较长，建议合理分块\n`;
      } else if (result.maxContextTokens > 30000) {
        report += `- ✅ 该模型支持**中等长度上下文**，适合中型项目分析\n`;
        report += `- ⚠️ 大型项目建议按模块分块处理\n`;
      } else {
        report += `- ⚠️ 该模型上下文长度有限，建议**分块处理**大型项目\n`;
        report += `- 💡 可以按文件或功能模块进行分析\n`;
      }
      
      const avgResponseTime = result.testSteps.reduce((sum, step) => sum + step.responseTime, 0) / result.testSteps.length;
      if (avgResponseTime > 10000) {
        report += `- ⚠️ 平均响应时间较长，建议在**非高峰时段**使用\n`;
      }
      
    } else {
      report += `❌ **测试失败**\n\n`;
      if (result.error) {
        report += `### 错误信息\n`;
        report += `\`\`\`\n${result.error}\n\`\`\`\n\n`;
      }
      report += `### 🔧 故障排除建议\n`;
      report += `1. 检查 GitHub Copilot Chat 扩展是否正常工作\n`;
      report += `2. 验证网络连接是否稳定\n`;
      report += `3. 确认项目路径是否正确\n`;
      report += `4. 尝试重新启动 VS Code\n`;
      report += `5. 检查 GitHub Copilot 订阅状态\n\n`;
    }
    
    // 模型对比参考
    report += `## 📊 模型对比参考\n\n`;
    report += `| 模型 | 理论上下文限制 | 实际测试结果 | 推荐用途 |\n`;
    report += `|------|----------------|--------------|----------|\n`;
    report += `| GPT-4.1 | ~128K tokens | ${result.model === 'gpt-4.1' ? result.maxContextTokens.toLocaleString() + ' tokens' : '未测试'} | 大型项目分析 |\n`;
    report += `| GPT-4 | ~8K tokens | ${result.model === 'gpt-4' ? result.maxContextTokens.toLocaleString() + ' tokens' : '未测试'} | 中小型项目 |\n`;
    report += `| GPT-3.5-turbo | ~4K tokens | ${result.model === 'gpt-3.5-turbo' ? result.maxContextTokens.toLocaleString() + ' tokens' : '未测试'} | 快速查询 |\n`;
    report += `| Claude-3-Sonnet | ~200K tokens | ${result.model === 'claude-3-sonnet' ? result.maxContextTokens.toLocaleString() + ' tokens' : '未测试'} | 超大项目分析 |\n`;
    report += `| Claude-3-Haiku | ~200K tokens | ${result.model === 'claude-3-haiku' ? result.maxContextTokens.toLocaleString() + ' tokens' : '未测试'} | 快速长文本处理 |\n\n`;
    
    report += `---\n\n`;
    report += `*📅 报告生成时间: ${new Date().toLocaleString()}*\n`;
    report += `*🔧 测试工具: Token Probe v1.0*\n`;
    
    return report;
  }
  
  /**
   * 格式化持续时间
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.round((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }
  
  /**
   * 获取Token范围描述
   */
  private getTokenRange(tokenCount: number): string {
    if (tokenCount < 1000) {
      return '小规模';
    } else if (tokenCount < 10000) {
      return '中等规模';
    } else if (tokenCount < 50000) {
      return '大规模';
    } else {
      return '超大规模';
    }
  }
}

/**
 * Token Probe 管理器
 */
export class TokenProbeManager {
  private static instance: TokenProbeManager;
  private testHistory: TokenProbeResult[] = [];
  
  static getInstance(): TokenProbeManager {
    if (!TokenProbeManager.instance) {
      TokenProbeManager.instance = new TokenProbeManager();
    }
    return TokenProbeManager.instance;
  }
  
  /**
   * 执行Token Probe测试
   */
  async runProbe(config: Partial<TokenProbeConfig> = {}): Promise<TokenProbeResult> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('请先打开一个工作区');
    }
    
    const probe = new TokenProbe(config);
    const result = await probe.probe(workspaceFolder.uri.fsPath);
    
    // 保存到历史记录
    this.testHistory.push(result);
    
    // 限制历史记录数量
    if (this.testHistory.length > 10) {
      this.testHistory = this.testHistory.slice(-10);
    }
    
    return result;
  }
  
  /**
   * 获取测试历史
   */
  getTestHistory(): TokenProbeResult[] {
    return [...this.testHistory];
  }
  
  /**
   * 清除测试历史
   */
  clearHistory(): void {
    this.testHistory = [];
  }
  
  /**
   * 生成历史对比报告
   */
  generateHistoryReport(): string {
    if (this.testHistory.length === 0) {
      return '暂无测试历史记录。';
    }
    
    let report = `# Token Probe 历史报告\n\n`;
    
    report += `## 测试历史概览\n\n`;
    report += `| 时间 | 模型 | 最大Token | 状态 | 测试时间 |\n`;
    report += `|------|------|-----------|------|----------|\n`;
    
    this.testHistory.forEach((result, index) => {
      const time = new Date(Date.now() - (this.testHistory.length - index - 1) * 60000).toLocaleTimeString();
      const status = result.status === 'success' ? '✅' : '❌';
      
      report += `| ${time} | ${result.model} | ${result.maxContextTokens.toLocaleString()} | ${status} | ${result.totalTestTime}ms |\n`;
    });
    
    report += `\n`;
    
    // 模型性能对比
    const modelStats = new Map<string, { maxTokens: number; avgTime: number; count: number }>();
    
    this.testHistory.filter(r => r.status === 'success').forEach(result => {
      const existing = modelStats.get(result.model) || { maxTokens: 0, avgTime: 0, count: 0 };
      existing.maxTokens = Math.max(existing.maxTokens, result.maxContextTokens);
      existing.avgTime = (existing.avgTime * existing.count + result.totalTestTime) / (existing.count + 1);
      existing.count++;
      modelStats.set(result.model, existing);
    });
    
    if (modelStats.size > 0) {
      report += `## 模型性能对比\n\n`;
      report += `| 模型 | 最大Token | 平均测试时间 | 测试次数 |\n`;
      report += `|------|-----------|--------------|----------|\n`;
      
      Array.from(modelStats.entries()).forEach(([model, stats]) => {
        report += `| ${model} | ${stats.maxTokens.toLocaleString()} | ${Math.round(stats.avgTime)}ms | ${stats.count} |\n`;
      });
      
      report += `\n`;
    }
    
    return report;
  }
}