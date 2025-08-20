import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ContextItem {
  id: string;
  type: 'file' | 'directory' | 'symbol' | 'dependency';
  path: string;
  content?: string;
  metadata: Record<string, any>;
  relevanceScore: number;
}

export class ContextCollector {
  private projectRoot: string;
  private collectedItems: ContextItem[] = [];

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async collectProjectContext(): Promise<ContextItem[]> {
    this.collectedItems = [];
    
    // Collect file contexts
    await this.collectFileContexts();
    
    // Collect directory contexts
    await this.collectDirectoryContexts();
    
    // Collect symbol contexts
    await this.collectSymbolContexts();
    
    // Collect dependency contexts
    await this.collectDependencyContexts();
    
    return this.collectedItems;
  }

  private async collectFileContexts(): Promise<void> {
    const files = await this.getAllFiles(this.projectRoot);
    
    for (const filePath of files) {
      if (this.shouldIncludeFile(filePath)) {
        const content = await this.readFileContent(filePath);
        const item: ContextItem = {
          id: `file:${filePath}`,
          type: 'file',
          path: filePath,
          content,
          metadata: {
            extension: path.extname(filePath),
            size: content?.length || 0,
            lastModified: fs.statSync(filePath).mtime
          },
          relevanceScore: this.calculateFileRelevance(filePath)
        };
        this.collectedItems.push(item);
      }
    }
  }

  private async collectDirectoryContexts(): Promise<void> {
    const directories = await this.getAllDirectories(this.projectRoot);
    
    for (const dirPath of directories) {
      const item: ContextItem = {
        id: `dir:${dirPath}`,
        type: 'directory',
        path: dirPath,
        metadata: {
          fileCount: fs.readdirSync(dirPath).length,
          purpose: this.identifyDirectoryPurpose(dirPath)
        },
        relevanceScore: this.calculateDirectoryRelevance(dirPath)
      };
      this.collectedItems.push(item);
    }
  }

  private async collectSymbolContexts(): Promise<void> {
    // Collect TypeScript/JavaScript symbols
    const tsFiles = this.collectedItems.filter(item => 
      item.type === 'file' && 
      (item.path.endsWith('.ts') || item.path.endsWith('.js'))
    );
    
    for (const file of tsFiles) {
      if (file.content) {
        const symbols = this.extractSymbols(file.content, file.path);
        this.collectedItems.push(...symbols);
      }
    }
  }

  private async collectDependencyContexts(): Promise<void> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };
      
      for (const [name, version] of Object.entries(dependencies)) {
        const item: ContextItem = {
          id: `dep:${name}`,
          type: 'dependency',
          path: name,
          metadata: {
            version,
            isDev: !!packageJson.devDependencies?.[name]
          },
          relevanceScore: this.calculateDependencyRelevance(name)
        };
        this.collectedItems.push(item);
      }
    }
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !this.shouldSkipDirectory(item)) {
        files.push(...await this.getAllFiles(fullPath));
      } else if (stat.isFile()) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private async getAllDirectories(dir: string): Promise<string[]> {
    const directories: string[] = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !this.shouldSkipDirectory(item)) {
        directories.push(fullPath);
        directories.push(...await this.getAllDirectories(fullPath));
      }
    }
    
    return directories;
  }

  private async readFileContent(filePath: string): Promise<string | undefined> {
    try {
      if (this.isTextFile(path.extname(filePath))) {
        return fs.readFileSync(filePath, 'utf8');
      }
    } catch (error) {
      console.warn(`Failed to read file: ${filePath}`, error);
    }
    return undefined;
  }

  private shouldIncludeFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    const excludeExtensions = ['.exe', '.dll', '.so', '.dylib', '.bin'];
    return !excludeExtensions.includes(ext);
  }

  private shouldSkipDirectory(name: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', 'out', 'build', '.vscode'];
    return skipDirs.includes(name) || name.startsWith('.');
  }

  private isTextFile(extension: string): boolean {
    const textExtensions = ['.ts', '.js', '.json', '.md', '.txt', '.yml', '.yaml', '.xml', '.html', '.css', '.scss'];
    return textExtensions.includes(extension);
  }

  private calculateFileRelevance(filePath: string): number {
    const ext = path.extname(filePath);
    const fileName = path.basename(filePath);
    
    let score = 0.5; // Base score
    
    // Higher relevance for certain file types
    if (['.ts', '.js'].includes(ext)) score += 0.3;
    if (fileName === 'package.json') score += 0.4;
    if (fileName.includes('config')) score += 0.2;
    if (fileName.includes('index')) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  private calculateDirectoryRelevance(dirPath: string): number {
    const dirName = path.basename(dirPath);
    
    let score = 0.3; // Base score
    
    if (['src', 'lib', 'packages'].includes(dirName)) score += 0.4;
    if (['test', 'tests', 'spec'].includes(dirName)) score += 0.2;
    if (['docs', 'documentation'].includes(dirName)) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private calculateDependencyRelevance(name: string): number {
    let score = 0.3; // Base score
    
    // Higher relevance for core dependencies
    if (name.includes('vscode')) score += 0.4;
    if (name.includes('typescript')) score += 0.3;
    if (name.includes('@types')) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  private identifyDirectoryPurpose(dirPath: string): string {
    const dirName = path.basename(dirPath).toLowerCase();
    
    if (dirName === 'src') return 'Source code';
    if (dirName === 'test' || dirName === 'tests') return 'Test files';
    if (dirName === 'docs') return 'Documentation';
    if (dirName === 'lib') return 'Library code';
    if (dirName === 'dist' || dirName === 'build') return 'Build output';
    if (dirName === 'config') return 'Configuration';
    if (dirName === 'assets') return 'Static assets';
    
    return 'General purpose';
  }

  private extractSymbols(content: string, filePath: string): ContextItem[] {
    const symbols: ContextItem[] = [];
    
    // Simple regex-based symbol extraction
    const classRegex = /class\s+(\w+)/g;
    const functionRegex = /(?:function\s+|const\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function))/g;
    const interfaceRegex = /interface\s+(\w+)/g;
    
    let match;
    
    // Extract classes
    while ((match = classRegex.exec(content)) !== null) {
      symbols.push({
        id: `symbol:${filePath}:class:${match[1]}`,
        type: 'symbol',
        path: filePath,
        metadata: {
          symbolType: 'class',
          name: match[1],
          line: content.substring(0, match.index).split('\n').length
        },
        relevanceScore: 0.8
      });
    }
    
    // Extract interfaces
    while ((match = interfaceRegex.exec(content)) !== null) {
      symbols.push({
        id: `symbol:${filePath}:interface:${match[1]}`,
        type: 'symbol',
        path: filePath,
        metadata: {
          symbolType: 'interface',
          name: match[1],
          line: content.substring(0, match.index).split('\n').length
        },
        relevanceScore: 0.7
      });
    }
    
    return symbols;
  }

  getCollectedItems(): ContextItem[] {
    return this.collectedItems;
  }

  getItemsByType(type: ContextItem['type']): ContextItem[] {
    return this.collectedItems.filter(item => item.type === type);
  }

  getItemById(id: string): ContextItem | undefined {
    return this.collectedItems.find(item => item.id === id);
  }
}