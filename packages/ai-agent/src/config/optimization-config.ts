import * as vscode from 'vscode';

/**
 * 优化配置接口
 */
export interface OptimizationConfig {
  /** 批处理大小 - 每批处理的文件数量 */
  batchSize: number;

  /** 最大文件数 - 限制处理的文件总数 */
  maxFiles: number;

  /** 最大文件大小 - 跳过超过此大小的文件 (字节) */
  maxFileSize: number;

  /** 最大内容长度 - 截断超过此长度的文件内容 (字符) */
  maxContentLength: number;

  /** 启用缓存 - 是否使用文件分析缓存 */
  enableCache: boolean;

  /** 显示进度 - 是否显示分析进度 */
  showProgress: boolean;

  /** 启用并行处理 - 是否使用并行文件处理 */
  enableParallelProcessing: boolean;

  /** 内存阈值 - 触发垃圾回收的内存使用量 (字节) */
  memoryThreshold: number;

  /** 文件类型优先级 - 不同文件类型的处理优先级 */
  fileTypePriority: {
    high: string[];
    medium: string[];
    low: string[];
  };

  /** 跳过的目录 - 不处理的目录列表 */
  skipDirectories: string[];

  /** 跳过的文件扩展名 - 不处理的文件类型 */
  skipExtensions: string[];
}

/**
 * 预设配置
 */
export const OPTIMIZATION_PRESETS = {
  /** 快速模式 - 最快的分析速度，较低的准确性 */
  FAST: {
    batchSize: 50,
    maxFiles: 100,
    maxFileSize: 512 * 1024, // 512KB
    maxContentLength: 5000,
    enableCache: true,
    showProgress: true,
    enableParallelProcessing: true,
    memoryThreshold: 150 * 1024 * 1024, // 150MB
    fileTypePriority: {
      high: ['.ts', '.js', '.cs'],
      medium: ['.json', '.yml', '.yaml'],
      low: ['.md', '.txt'],
    },
    skipDirectories: [
      'node_modules',
      '.git',
      'dist',
      'out',
      'build',
      '.vscode',
      'bin',
      'obj',
      'packages',
    ],
    skipExtensions: [
      '.exe',
      '.dll',
      '.so',
      '.dylib',
      '.bin',
      '.obj',
      '.pdb',
      '.png',
      '.jpg',
      '.gif',
    ],
  } as OptimizationConfig,

  /** 平衡模式 - 平衡速度和准确性 */
  BALANCED: {
    batchSize: 25,
    maxFiles: 300,
    maxFileSize: 2 * 1024 * 1024, // 2MB
    maxContentLength: 15000,
    enableCache: true,
    showProgress: true,
    enableParallelProcessing: true,
    memoryThreshold: 250 * 1024 * 1024, // 250MB
    fileTypePriority: {
      high: ['.ts', '.js', '.cs', '.py', '.java'],
      medium: ['.json', '.yml', '.yaml', '.xml', '.html'],
      low: ['.md', '.txt', '.log'],
    },
    skipDirectories: ['node_modules', '.git', 'dist', 'out', 'build', '.vscode', 'bin', 'obj'],
    skipExtensions: ['.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.pdb'],
  } as OptimizationConfig,

  /** 深度模式 - 最全面的分析，较慢的速度 */
  THOROUGH: {
    batchSize: 15,
    maxFiles: 1000,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxContentLength: 50000,
    enableCache: true,
    showProgress: true,
    enableParallelProcessing: true,
    memoryThreshold: 400 * 1024 * 1024, // 400MB
    fileTypePriority: {
      high: ['.ts', '.js', '.cs', '.py', '.java', '.cpp', '.c', '.h'],
      medium: ['.json', '.yml', '.yaml', '.xml', '.html', '.css', '.scss'],
      low: ['.md', '.txt', '.log', '.config'],
    },
    skipDirectories: ['node_modules', '.git', 'dist', 'out', 'build'],
    skipExtensions: ['.exe', '.dll', '.so', '.dylib', '.bin'],
  } as OptimizationConfig,

  /** 大型项目模式 - 专为1000+文件的大型项目优化 */
  LARGE_PROJECT: {
    batchSize: 30,
    maxFiles: 500,
    maxFileSize: 1 * 1024 * 1024, // 1MB
    maxContentLength: 10000,
    enableCache: true,
    showProgress: true,
    enableParallelProcessing: true,
    memoryThreshold: 200 * 1024 * 1024, // 200MB
    fileTypePriority: {
      high: ['.ts', '.js', '.cs'],
      medium: ['.json'],
      low: ['.md', '.txt'],
    },
    skipDirectories: [
      'node_modules',
      '.git',
      'dist',
      'out',
      'build',
      '.vscode',
      'bin',
      'obj',
      'packages',
      'vendor',
    ],
    skipExtensions: [
      '.exe',
      '.dll',
      '.so',
      '.dylib',
      '.bin',
      '.obj',
      '.pdb',
      '.png',
      '.jpg',
      '.gif',
      '.svg',
    ],
  } as OptimizationConfig,
};

/**
 * 配置管理器
 */
export class OptimizationConfigManager {
  private static readonly CONFIG_KEY = 'aiAgent.optimization';

  /**
   * 从VS Code配置中加载优化配置
   */
  static loadFromVSCode(): OptimizationConfig {
    const config = vscode.workspace.getConfiguration('aiAgent.optimization');

    // 获取预设模式
    const preset = config.get<keyof typeof OPTIMIZATION_PRESETS>('preset', 'BALANCED');
    const baseConfig = OPTIMIZATION_PRESETS[preset];

    // 允许用户覆盖特定设置
    return {
      ...baseConfig,
      batchSize: config.get('batchSize', baseConfig.batchSize),
      maxFiles: config.get('maxFiles', baseConfig.maxFiles),
      maxFileSize: config.get('maxFileSize', baseConfig.maxFileSize),
      maxContentLength: config.get('maxContentLength', baseConfig.maxContentLength),
      enableCache: config.get('enableCache', baseConfig.enableCache),
      showProgress: config.get('showProgress', baseConfig.showProgress),
      enableParallelProcessing: config.get(
        'enableParallelProcessing',
        baseConfig.enableParallelProcessing
      ),
      memoryThreshold: config.get('memoryThreshold', baseConfig.memoryThreshold),
    };
  }

  /**
   * 保存配置到VS Code设置
   */
  static async saveToVSCode(config: Partial<OptimizationConfig>): Promise<void> {
    const vsConfig = vscode.workspace.getConfiguration('aiAgent.optimization');

    for (const [key, value] of Object.entries(config)) {
      await vsConfig.update(key, value, vscode.ConfigurationTarget.Workspace);
    }
  }

  /**
   * 获取推荐配置基于项目大小
   */
  static getRecommendedConfig(projectStats: {
    totalFiles: number;
    totalSize: number;
    hasLargeFiles: boolean;
  }): OptimizationConfig {
    const { totalFiles, totalSize, hasLargeFiles } = projectStats;

    // 大型项目 (1000+ 文件)
    if (totalFiles > 1000) {
      return OPTIMIZATION_PRESETS.LARGE_PROJECT;
    }

    // 中型项目 (100-1000 文件)
    if (totalFiles > 100) {
      return hasLargeFiles ? OPTIMIZATION_PRESETS.BALANCED : OPTIMIZATION_PRESETS.THOROUGH;
    }

    // 小型项目 (<100 文件)
    return OPTIMIZATION_PRESETS.FAST;
  }

  /**
   * 验证配置的合理性
   */
  static validateConfig(config: OptimizationConfig): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 检查批处理大小
    if (config.batchSize < 1) {
      errors.push('批处理大小必须大于0');
    } else if (config.batchSize > 100) {
      warnings.push('批处理大小过大可能导致内存问题');
    }

    // 检查最大文件数
    if (config.maxFiles < 1) {
      errors.push('最大文件数必须大于0');
    } else if (config.maxFiles > 2000) {
      warnings.push('最大文件数过大可能导致性能问题');
    }

    // 检查文件大小限制
    if (config.maxFileSize < 1024) {
      warnings.push('最大文件大小过小可能跳过重要文件');
    } else if (config.maxFileSize > 10 * 1024 * 1024) {
      warnings.push('最大文件大小过大可能导致内存问题');
    }

    // 检查内容长度限制
    if (config.maxContentLength < 1000) {
      warnings.push('最大内容长度过小可能影响分析质量');
    } else if (config.maxContentLength > 100000) {
      warnings.push('最大内容长度过大可能导致性能问题');
    }

    // 检查内存阈值
    if (config.memoryThreshold < 50 * 1024 * 1024) {
      warnings.push('内存阈值过小可能导致频繁垃圾回收');
    } else if (config.memoryThreshold > 1024 * 1024 * 1024) {
      warnings.push('内存阈值过大可能导致系统不稳定');
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * 生成配置说明
   */
  static generateConfigDescription(config: OptimizationConfig): string {
    const validation = this.validateConfig(config);

    let description = `## 优化配置说明\n\n`;
    description += `- **批处理大小**: ${config.batchSize} 个文件/批次\n`;
    description += `- **最大文件数**: ${config.maxFiles} 个文件\n`;
    description += `- **最大文件大小**: ${(config.maxFileSize / 1024 / 1024).toFixed(1)} MB\n`;
    description += `- **最大内容长度**: ${config.maxContentLength.toLocaleString()} 字符\n`;
    description += `- **缓存**: ${config.enableCache ? '启用' : '禁用'}\n`;
    description += `- **进度显示**: ${config.showProgress ? '启用' : '禁用'}\n`;
    description += `- **并行处理**: ${config.enableParallelProcessing ? '启用' : '禁用'}\n`;
    description += `- **内存阈值**: ${(config.memoryThreshold / 1024 / 1024).toFixed(0)} MB\n\n`;

    if (validation.warnings.length > 0) {
      description += `### ⚠️ 警告\n`;
      validation.warnings.forEach(warning => {
        description += `- ${warning}\n`;
      });
      description += `\n`;
    }

    if (validation.errors.length > 0) {
      description += `### ❌ 错误\n`;
      validation.errors.forEach(error => {
        description += `- ${error}\n`;
      });
      description += `\n`;
    }

    return description;
  }
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private startTime: number = 0;
  private startMemory: number = 0;
  private checkpoints: Array<{ name: string; time: number; memory: number }> = [];

  start(): void {
    this.startTime = Date.now();
    this.startMemory = process.memoryUsage().heapUsed;
    this.checkpoints = [];
  }

  checkpoint(name: string): void {
    this.checkpoints.push({
      name,
      time: Date.now() - this.startTime,
      memory: process.memoryUsage().heapUsed,
    });
  }

  getReport(): {
    totalTime: number;
    totalMemoryDelta: number;
    checkpoints: Array<{ name: string; time: number; memory: number; memoryDelta: number }>;
  } {
    const totalTime = Date.now() - this.startTime;
    const totalMemoryDelta = process.memoryUsage().heapUsed - this.startMemory;

    const enhancedCheckpoints = this.checkpoints.map((checkpoint, index) => ({
      ...checkpoint,
      memoryDelta:
        checkpoint.memory - (index > 0 ? this.checkpoints[index - 1].memory : this.startMemory),
    }));

    return {
      totalTime,
      totalMemoryDelta,
      checkpoints: enhancedCheckpoints,
    };
  }

  generateReport(): string {
    const report = this.getReport();

    let output = `## 性能监控报告\n\n`;
    output += `- **总耗时**: ${report.totalTime}ms\n`;
    output += `- **内存变化**: ${(report.totalMemoryDelta / 1024 / 1024).toFixed(1)}MB\n\n`;

    if (report.checkpoints.length > 0) {
      output += `### 检查点详情\n\n`;
      output += `| 阶段 | 耗时(ms) | 内存变化(MB) |\n`;
      output += `|------|----------|--------------|\n`;

      report.checkpoints.forEach(checkpoint => {
        output += `| ${checkpoint.name} | ${checkpoint.time} | ${(checkpoint.memoryDelta / 1024 / 1024).toFixed(1)} |\n`;
      });
    }

    return output;
  }
}
