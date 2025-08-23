import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { outputManager } from '../utils/output-manager';
import * as crypto from 'crypto';

export interface ContextItem {
  id: string;
  type: 'file' | 'directory' | 'symbol' | 'dependency';
  path: string;
  content?: string;
  metadata: Record<string, any>;
  relevanceScore: number;
}

interface CacheEntry {
  result: ContextItem;
  timestamp: number;
  fileHash: string;
}

interface OptimizationConfig {
  batchSize: number;
  maxFiles: number;
  maxFileSize: number; // bytes
  maxContentLength: number; // characters
  enableCache: boolean;
  showProgress: boolean;
}

export class OptimizedContextCollector {
  private projectRoot: string;
  private collectedItems: ContextItem[] = [];
  private cache = new Map<string, CacheEntry>();
  private statusBarItem: vscode.StatusBarItem;

  private config: OptimizationConfig = {
    batchSize: 20,
    maxFiles: 200,
    maxFileSize: 1024 * 1024, // 1MB
    maxContentLength: 10000, // 10K characters
    enableCache: true,
    showProgress: true,
  };

  constructor(projectRoot: string, config?: Partial<OptimizationConfig>) {
    this.projectRoot = projectRoot;
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  }

  async collectProjectContext(): Promise<ContextItem[]> {
    this.collectedItems = [];

    const startTime = Date.now();

    try {
      // 收集所有文件路径
      const allFiles = await this.getAllFilesAsync(this.projectRoot);

      // 智能过滤和优先级排序
      const filteredFiles = this.filterAndPrioritizeFiles(allFiles);

      if (this.config.showProgress) {
        this.startProgress(filteredFiles.length);
      }

      // 批量处理文件
      await this.processFilesBatch(filteredFiles);

      // 收集其他上下文
      await this.collectDirectoryContexts();
      await this.collectSymbolContexts();
      await this.collectDependencyContexts();

      const duration = Date.now() - startTime;

      if (this.config.showProgress) {
        this.completeProgress(this.collectedItems.length, duration);
      }
    } catch (error) {
      outputManager.logError('Context collection failed:', error as Error);
      if (this.config.showProgress) {
        this.errorProgress(error as Error);
      }
    }

    return this.collectedItems;
  }

  private async getAllFilesAsync(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const items = await fs.promises.readdir(dir);

      // 并行处理目录项
      const promises = items.map(async item => {
        const fullPath = path.join(dir, item);

        try {
          const stat = await fs.promises.stat(fullPath);

          if (stat.isDirectory() && !this.shouldSkipDirectory(item)) {
            return await this.getAllFilesAsync(fullPath);
          } else if (stat.isFile()) {
            return [fullPath];
          }
        } catch (error) {
          outputManager.logWarning(`Failed to process ${fullPath}: ${error}`);
          return [];
        }

        return [];
      });

      const results = await Promise.all(promises);
      files.push(...results.flat());
    } catch (error) {
      outputManager.logWarning(`Failed to read directory ${dir}: ${error}`);
    }

    return files;
  }

  private filterAndPrioritizeFiles(files: string[]): string[] {
    // 按文件类型和重要性分类
    const categorized = {
      high: [] as string[],
      medium: [] as string[],
      low: [] as string[],
    };

    const highPriorityPatterns = [
      /Controller\.(cs|ts|js)$/i,
      /Service\.(cs|ts|js)$/i,
      /Manager\.(cs|ts|js)$/i,
      /Program\.(cs|ts|js)$/i,
      /Startup\.(cs|ts|js)$/i,
    ];

    const mediumPriorityPatterns = [
      /Model\.(cs|ts|js)$/i,
      /Entity\.(cs|ts|js)$/i,
      /DTO\.(cs|ts|js)$/i,
      /Interface\.(cs|ts|js)$/i,
      /\.(cs|ts|js)$/i,
    ];

    for (const file of files) {
      if (!this.shouldIncludeFile(file)) continue;

      if (highPriorityPatterns.some(pattern => pattern.test(file))) {
        categorized.high.push(file);
      } else if (mediumPriorityPatterns.some(pattern => pattern.test(file))) {
        categorized.medium.push(file);
      } else {
        categorized.low.push(file);
      }
    }

    // 按优先级选择文件
    const selected: string[] = [];

    // 高优先级文件全部包含
    selected.push(...categorized.high);

    // 中优先级文件按需包含
    const remaining = this.config.maxFiles - selected.length;
    if (remaining > 0) {
      selected.push(...categorized.medium.slice(0, remaining));
    }

    // 如果还有空间，包含部分低优先级文件
    const stillRemaining = this.config.maxFiles - selected.length;
    if (stillRemaining > 0) {
      selected.push(...categorized.low.slice(0, stillRemaining));
    }

    return selected;
  }

  private async processFilesBatch(files: string[]): Promise<void> {
    for (let i = 0; i < files.length; i += this.config.batchSize) {
      const batch = files.slice(i, i + this.config.batchSize);

      // 并行处理当前批次，添加错误处理
      const batchResults = await Promise.allSettled(
        batch.map(file => this.processFileWithCache(file))
      );

      // 添加成功处理的结果
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          this.collectedItems.push(result.value);
        } else if (result.status === 'rejected') {
          outputManager.logWarning(`File processing failed: ${result.reason}`);
        }
      }

      // 更新进度
      if (this.config.showProgress) {
        this.updateProgress(i + batch.length, files.length);
      }

      // 内存检查和垃圾回收
      await this.checkMemoryUsage();

      // 让出控制权，避免阻塞UI
      await this.yieldToUI();
    }
  }

  private async processFileWithCache(filePath: string): Promise<ContextItem | null> {
    try {
      // 检查文件大小
      const stat = await fs.promises.stat(filePath);
      if (stat.size > this.config.maxFileSize) {
        return this.createSkippedResult(filePath, '文件过大');
      }

      // 检查缓存
      if (this.config.enableCache) {
        const cached = await this.getCachedResult(filePath, stat.mtime);
        if (cached) {
          return cached;
        }
      }

      // 读取和处理文件
      const content = await this.readFileContentAsync(filePath);
      if (!content) {
        return null;
      }

      const item: ContextItem = {
        id: `file:${filePath}`,
        type: 'file',
        path: filePath,
        content: this.truncateContent(content),
        metadata: {
          size: stat.size,
          extension: path.extname(filePath),
          lastModified: stat.mtime,
          truncated: content.length > this.config.maxContentLength,
        },
        relevanceScore: this.calculateFileRelevance(filePath),
      };

      // 更新缓存
      if (this.config.enableCache) {
        this.updateCache(filePath, item, stat.mtime);
      }

      return item;
    } catch (error) {
      outputManager.logWarning(`Failed to process file ${filePath}: ${error}`);
      return this.createErrorResult(filePath, error as Error);
    }
  }

  private async readFileContentAsync(filePath: string): Promise<string | null> {
    try {
      if (!this.isTextFile(path.extname(filePath))) {
        return null;
      }

      const content = await fs.promises.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      outputManager.logWarning(`Failed to read file: ${filePath} - ${error}`);
      return null;
    }
  }

  private truncateContent(content: string): string {
    if (content.length <= this.config.maxContentLength) {
      return content;
    }

    return (
      content.substring(0, this.config.maxContentLength) +
      '\n\n// ... 内容已截断，共 ' +
      content.length +
      ' 字符 ...'
    );
  }

  private async getCachedResult(filePath: string, mtime: Date): Promise<ContextItem | null> {
    const cached = this.cache.get(filePath);
    if (!cached) return null;

    const fileHash = this.calculateFileHash(filePath, mtime);
    if (cached.fileHash === fileHash) {
      return cached.result;
    }

    // 缓存过期，删除
    this.cache.delete(filePath);
    return null;
  }

  private updateCache(filePath: string, result: ContextItem, mtime: Date): void {
    // LRU缓存清理
    if (this.cache.size >= 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    const fileHash = this.calculateFileHash(filePath, mtime);
    this.cache.set(filePath, {
      result,
      timestamp: Date.now(),
      fileHash,
    });
  }

  private calculateFileHash(filePath: string, mtime: Date): string {
    return crypto
      .createHash('md5')
      .update(filePath + mtime.getTime())
      .digest('hex');
  }

  private async checkMemoryUsage(): Promise<void> {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const rssUsedMB = memUsage.rss / 1024 / 1024;

    if (heapUsedMB > 200 || rssUsedMB > 400) {
      // 200MB heap or 400MB RSS threshold
      outputManager.logWarning(
        `内存使用过高: Heap=${heapUsedMB.toFixed(2)}MB, RSS=${rssUsedMB.toFixed(2)}MB，触发垃圾回收`
      );

      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }

      // 清理部分缓存 - LRU策略
      if (this.cache.size > 500) {
        const sortedEntries = Array.from(this.cache.entries()).sort(
          (a, b) => a[1].timestamp - b[1].timestamp
        );
        const keysToDelete = sortedEntries.slice(0, Math.min(200, this.cache.size / 2));
        keysToDelete.forEach(([key]) => this.cache.delete(key));
      }

      // 清理已收集项目中的大内容
      this.optimizeCollectedItems();
    }
  }

  private async yieldToUI(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  private createSkippedResult(filePath: string, reason: string): ContextItem {
    return {
      id: `file:${filePath}`,
      type: 'file',
      path: filePath,
      content: undefined,
      metadata: {
        skipped: true,
        reason,
      },
      relevanceScore: 0,
    };
  }

  private createErrorResult(filePath: string, error: Error): ContextItem {
    return {
      id: `file:${filePath}`,
      type: 'file',
      path: filePath,
      content: undefined,
      metadata: {
        error: true,
        errorMessage: error.message,
      },
      relevanceScore: 0,
    };
  }

  // Progress tracking methods
  private startProgress(totalFiles: number): void {
    this.statusBarItem.text = `$(sync~spin) 分析中... 0/${totalFiles}`;
    this.statusBarItem.show();

    const channel = outputManager.getProjectScanChannel();
    channel.clear();
    channel.appendLine(`🚀 开始优化分析 ${totalFiles} 个文件...`);
    channel.appendLine(
      `📊 配置: 批次大小=${this.config.batchSize}, 最大文件=${this.config.maxFiles}`
    );
    channel.show(true);
  }

  private updateProgress(processed: number, total: number): void {
    const percentage = Math.round((processed / total) * 100);

    this.statusBarItem.text = `$(sync~spin) 分析中... ${processed}/${total} (${percentage}%)`;

    if (processed % 20 === 0 || processed === total) {
      const channel = outputManager.getProjectScanChannel();
      channel.appendLine(
        `📈 进度: ${processed}/${total} (${percentage}%) - 内存: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB`
      );
    }
  }

  private completeProgress(totalItems: number, duration: number): void {
    this.statusBarItem.text = `$(check) 分析完成 - ${totalItems} 项`;

    setTimeout(() => {
      this.statusBarItem.hide();
    }, 5000);

    const channel = outputManager.getProjectScanChannel();
    channel.appendLine('\n✅ 优化分析完成!');
    channel.appendLine(`📊 总项目数: ${totalItems}`);
    channel.appendLine(`⏱️ 处理时间: ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
    channel.appendLine(`💾 缓存命中: ${this.cache.size} 项`);
    channel.appendLine(
      `🧠 内存使用: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB`
    );
  }

  private errorProgress(error: Error): void {
    this.statusBarItem.text = `$(error) 分析失败`;

    setTimeout(() => {
      this.statusBarItem.hide();
    }, 5000);

    outputManager.logError('分析失败', error);
  }

  // 保持原有接口兼容性
  private async collectDirectoryContexts(): Promise<void> {
    // 简化版目录收集，避免性能问题
    const directories = await this.getTopLevelDirectories(this.projectRoot);

    for (const dirPath of directories.slice(0, 50)) {
      // 限制目录数量
      const item: ContextItem = {
        id: `directory:${dirPath}`,
        type: 'directory',
        path: dirPath,
        metadata: {
          purpose: this.identifyDirectoryPurpose(dirPath),
        },
        relevanceScore: this.calculateDirectoryRelevance(dirPath),
      };

      this.collectedItems.push(item);
    }
  }

  private async getTopLevelDirectories(dir: string): Promise<string[]> {
    try {
      const items = await fs.promises.readdir(dir);
      const directories: string[] = [];

      for (const item of items) {
        const fullPath = path.join(dir, item);
        try {
          const stat = await fs.promises.stat(fullPath);
          if (stat.isDirectory() && !this.shouldSkipDirectory(item)) {
            directories.push(fullPath);
          }
        } catch (error) {
          // 忽略无法访问的目录
        }
      }

      return directories;
    } catch (error) {
      return [];
    }
  }

  private async collectSymbolContexts(): Promise<void> {
    // 从已收集的文件中提取符号，避免重复读取
    const fileItems = this.collectedItems.filter(
      item => item.type === 'file' && item.content && !item.metadata.skipped
    );

    for (const fileItem of fileItems.slice(0, 100)) {
      // 限制符号提取的文件数量
      if (fileItem.content) {
        const symbols = this.extractSymbols(fileItem.content, fileItem.path);
        this.collectedItems.push(...symbols);
      }
    }
  }

  private async collectDependencyContexts(): Promise<void> {
    // 简化版依赖收集
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const csprojFiles = this.collectedItems
      .filter(item => item.path.endsWith('.csproj'))
      .slice(0, 5); // 限制处理的项目文件数量

    // 处理 package.json
    try {
      const packageContent = await fs.promises.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      for (const [name, version] of Object.entries(deps).slice(0, 20)) {
        // 限制依赖数量
        const item: ContextItem = {
          id: `dependency:${name}`,
          type: 'dependency',
          path: packageJsonPath,
          metadata: {
            name,
            version,
            type: 'npm',
          },
          relevanceScore: this.calculateDependencyRelevance(name),
        };

        this.collectedItems.push(item);
      }
    } catch (error) {
      // package.json 不存在或无法解析
    }
  }

  // 保持原有的辅助方法
  private shouldIncludeFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    const excludeExtensions = ['.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.pdb'];
    return !excludeExtensions.includes(ext);
  }

  private shouldSkipDirectory(name: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', 'out', 'build', '.vscode', 'bin', 'obj'];
    return skipDirs.includes(name) || name.startsWith('.');
  }

  private isTextFile(extension: string): boolean {
    const textExtensions = [
      '.ts',
      '.js',
      '.cs',
      '.json',
      '.md',
      '.txt',
      '.yml',
      '.yaml',
      '.xml',
      '.html',
      '.css',
      '.scss',
    ];
    return textExtensions.includes(extension);
  }

  private calculateFileRelevance(filePath: string): number {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath);

    let score = 0.5; // base score

    // 文件类型权重
    if (['.cs', '.ts', '.js'].includes(ext)) score += 0.3;
    if (['.json', '.yml', '.yaml'].includes(ext)) score += 0.2;

    // 文件名模式权重
    if (/Controller|Service|Manager|Program|Startup/i.test(fileName)) score += 0.4;
    if (/Model|Entity|DTO|Interface/i.test(fileName)) score += 0.2;
    if (/Test|Spec/i.test(fileName)) score -= 0.2;

    return Math.min(1.0, Math.max(0.0, score));
  }

  private calculateDirectoryRelevance(dirPath: string): number {
    const dirName = path.basename(dirPath);

    const highValueDirs = ['src', 'lib', 'app', 'controllers', 'services', 'models'];
    const mediumValueDirs = ['utils', 'helpers', 'components', 'views'];
    const lowValueDirs = ['tests', 'docs', 'examples'];

    if (highValueDirs.some(dir => dirName.toLowerCase().includes(dir))) return 0.8;
    if (mediumValueDirs.some(dir => dirName.toLowerCase().includes(dir))) return 0.6;
    if (lowValueDirs.some(dir => dirName.toLowerCase().includes(dir))) return 0.3;

    return 0.5;
  }

  private calculateDependencyRelevance(name: string): number {
    const frameworkLibs = ['express', 'react', 'vue', 'angular', 'dotnet'];
    const utilityLibs = ['lodash', 'axios', 'moment', 'uuid'];

    if (frameworkLibs.some(lib => name.toLowerCase().includes(lib))) return 0.9;
    if (utilityLibs.some(lib => name.toLowerCase().includes(lib))) return 0.7;

    return 0.5;
  }

  private identifyDirectoryPurpose(dirPath: string): string {
    const dirName = path.basename(dirPath).toLowerCase();

    if (dirName.includes('controller')) return 'API Controllers';
    if (dirName.includes('service')) return 'Business Logic';
    if (dirName.includes('model')) return 'Data Models';
    if (dirName.includes('view')) return 'User Interface';
    if (dirName.includes('test')) return 'Testing';
    if (dirName.includes('util') || dirName.includes('helper')) return 'Utilities';

    return 'General';
  }

  private extractSymbols(content: string, filePath: string): ContextItem[] {
    const symbols: ContextItem[] = [];
    const ext = path.extname(filePath);

    // 简化的符号提取，避免复杂的解析
    if (ext === '.cs') {
      // C# 类和方法提取
      const classMatches = content.match(/(?:public|private|protected|internal)?\s*class\s+(\w+)/g);
      const methodMatches = content.match(
        /(?:public|private|protected|internal)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/g
      );

      if (classMatches) {
        classMatches.slice(0, 10).forEach((match, index) => {
          // 限制符号数量
          const className = match.split(/\s+/).pop();
          if (className) {
            symbols.push({
              id: `symbol:${filePath}:class:${className}`,
              type: 'symbol',
              path: filePath,
              metadata: {
                name: className,
                type: 'class',
                language: 'csharp',
              },
              relevanceScore: 0.8,
            });
          }
        });
      }
    }

    return symbols;
  }

  // 公共接口方法
  getCollectedItems(): ContextItem[] {
    return this.collectedItems;
  }

  getItemsByType(type: ContextItem['type']): ContextItem[] {
    return this.collectedItems.filter(item => item.type === type);
  }

  getItemById(id: string): ContextItem | undefined {
    return this.collectedItems.find(item => item.id === id);
  }

  // 清理资源
  dispose(): void {
    this.cache.clear();
    this.statusBarItem.dispose();
    // OutputManager handles disposal
  }

  // 优化已收集的项目，释放内存
  private optimizeCollectedItems(): void {
    for (const item of this.collectedItems) {
      if (item.content && item.content.length > this.config.maxContentLength * 2) {
        // 进一步截断超大内容
        item.content =
          item.content.substring(0, this.config.maxContentLength) + '\n\n// ... 内容已优化截断 ...';
        item.metadata.optimized = true;
      }
    }
  }

  // 内存检查和UI让步的组合方法
  private async checkMemoryAndYield(): Promise<void> {
    await this.checkMemoryUsage();
    await this.yieldToUI();
  }

  // 获取性能统计
  getPerformanceStats(): {
    cacheSize: number;
    memoryUsage: { heap: number; rss: number; external: number };
    itemsCollected: number;
    optimizedItems: number;
  } {
    const memUsage = process.memoryUsage();
    return {
      cacheSize: this.cache.size,
      memoryUsage: {
        heap: memUsage.heapUsed / 1024 / 1024,
        rss: memUsage.rss / 1024 / 1024,
        external: memUsage.external / 1024 / 1024,
      },
      itemsCollected: this.collectedItems.length,
      optimizedItems: this.collectedItems.filter(item => item.metadata.optimized).length,
    };
  }
}
