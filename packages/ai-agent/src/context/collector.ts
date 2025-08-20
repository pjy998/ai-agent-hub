import * as vscode from 'vscode';
import * as path from 'path';
import { ContextRanker, FileRelevance, createContextRanker } from './ranker';

/**
 * 增强的代码上下文信息
 */
export interface EnhancedCodeContext {
    // 基础上下文
    activeFile?: string;
    language?: string;
    selection?: string;
    
    // 智能收集的相关文件
    relevantFiles: FileRelevance[];
    
    // 项目信息
    projectStructure?: string;
    gitDiff?: string;
    
    // 元数据
    totalFiles: number;
    estimatedTokens: number;
    collectionTime: number;
}

/**
 * 上下文收集器配置
 */
export interface CollectorConfig {
    includeProjectStructure: boolean;
    includeGitDiff: boolean;
    includeDependencyInfo: boolean;
    maxFileSize: number; // KB
    contextRankerConfig?: any;
}

/**
 * 智能上下文收集器
 * 
 * 负责收集和整理开发上下文，包括：
 * - 当前文件和选择内容
 * - 智能排序的相关文件
 * - 项目结构信息
 * - Git变更信息
 * - 文件依赖关系
 */
export class ContextCollector {
    private ranker: ContextRanker;
    private config: CollectorConfig;
    private workspaceFolder: string;

    constructor(config?: Partial<CollectorConfig>) {
        this.workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.ranker = createContextRanker(this.workspaceFolder);
        
        this.config = {
            includeProjectStructure: true,
            includeGitDiff: true,
            includeDependencyInfo: false,
            maxFileSize: 100, // 100KB
            ...config
        };

        // 配置Context Ranker
        if (config?.contextRankerConfig) {
            this.ranker.updateConfig(config.contextRankerConfig);
        }
    }

    /**
     * 收集完整的开发上下文
     */
    async collectContext(query?: string): Promise<EnhancedCodeContext> {
        const startTime = Date.now();
        
        try {
            // 获取当前活动文件信息
            const activeEditor = vscode.window.activeTextEditor;
            const activeFile = activeEditor?.document.fileName;
            const language = activeEditor?.document.languageId || 'plaintext';
            const selection = activeEditor?.selection.isEmpty 
                ? undefined 
                : activeEditor?.document.getText(activeEditor.selection);

            // 使用智能排序器获取相关文件
            const relevantFiles = await this.ranker.rankFiles(query, activeFile);

            // 收集项目结构信息
            let projectStructure: string | undefined;
            if (this.config.includeProjectStructure) {
                projectStructure = await this.collectProjectStructure();
            }

            // 收集Git差异信息
            let gitDiff: string | undefined;
            if (this.config.includeGitDiff) {
                gitDiff = await this.collectGitDiff();
            }

            // 计算估算的token数量
            const estimatedTokens = this.calculateEstimatedTokens(relevantFiles, projectStructure, gitDiff);

            const collectionTime = Date.now() - startTime;

            return {
                activeFile,
                language,
                selection,
                relevantFiles,
                projectStructure,
                gitDiff,
                totalFiles: relevantFiles.length,
                estimatedTokens,
                collectionTime
            };

        } catch (error) {
            console.error('Context collection failed:', error);
            
            // 返回基础上下文作为fallback
            const activeEditor = vscode.window.activeTextEditor;
            return {
                activeFile: activeEditor?.document.fileName,
                language: activeEditor?.document.languageId || 'plaintext',
                selection: activeEditor?.selection.isEmpty 
                    ? undefined 
                    : activeEditor?.document.getText(activeEditor.selection),
                relevantFiles: [],
                totalFiles: 0,
                estimatedTokens: 0,
                collectionTime: Date.now() - startTime
            };
        }
    }

    /**
     * 收集项目结构信息
     */
    private async collectProjectStructure(): Promise<string> {
        try {
            const structure = await this.buildProjectStructure(this.workspaceFolder, 3); // 最多3层深度
            return `项目结构:\n${structure}`;
        } catch (error) {
            console.warn('Failed to collect project structure:', error);
            return '项目结构收集失败';
        }
    }

    /**
     * 构建项目结构树
     */
    private async buildProjectStructure(dirPath: string, maxDepth: number, currentDepth: number = 0): Promise<string> {
        if (currentDepth >= maxDepth) {
            return '';
        }

        const items: string[] = [];
        
        try {
            const uri = vscode.Uri.file(dirPath);
            const entries = await vscode.workspace.fs.readDirectory(uri);
            
            // 过滤和排序
            const filteredEntries = entries
                .filter(([name]) => !this.shouldExcludeFromStructure(name))
                .sort(([a, aType], [b, bType]) => {
                    // 目录优先，然后按名称排序
                    if (aType !== bType) {
                        return aType === vscode.FileType.Directory ? -1 : 1;
                    }
                    return a.localeCompare(b);
                });

            for (const [name, type] of filteredEntries.slice(0, 20)) { // 限制每层最多20个项目
                const indent = '  '.repeat(currentDepth);
                const icon = type === vscode.FileType.Directory ? '📁' : '📄';
                items.push(`${indent}${icon} ${name}`);

                // 递归处理子目录
                if (type === vscode.FileType.Directory && currentDepth < maxDepth - 1) {
                    const subPath = path.join(dirPath, name);
                    const subStructure = await this.buildProjectStructure(subPath, maxDepth, currentDepth + 1);
                    if (subStructure) {
                        items.push(subStructure);
                    }
                }
            }
        } catch (error) {
            console.warn(`Failed to read directory ${dirPath}:`, error);
        }

        return items.join('\n');
    }

    /**
     * 判断是否应该从项目结构中排除
     */
    private shouldExcludeFromStructure(name: string): boolean {
        const excludePatterns = [
            'node_modules', '.git', 'dist', 'build', 'coverage',
            '.vscode', '.idea', '*.log', '.DS_Store', 'Thumbs.db',
            '.next', 'out', '__pycache__', '*.pyc'
        ];

        return excludePatterns.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp(pattern.replace('*', '.*'));
                return regex.test(name);
            }
            return name === pattern || name.startsWith(pattern);
        });
    }

    /**
     * 收集Git差异信息
     */
    private async collectGitDiff(): Promise<string> {
        try {
            // 简化实现：收集最近修改的文件信息
            // 实际项目中可以使用git扩展API或执行git命令
            const recentFiles = await this.getRecentlyModifiedFiles();
            if (recentFiles.length > 0) {
                return `最近修改的文件:\n${recentFiles.map(f => `- ${path.relative(this.workspaceFolder, f)}`).join('\n')}`;
            } else {
                return '无最近修改的文件';
            }
        } catch (error) {
            console.warn('Failed to collect git diff:', error);
            return 'Git信息收集失败';
        }
    }

    /**
     * 获取最近修改的文件
     */
    private async getRecentlyModifiedFiles(): Promise<string[]> {
        const files: string[] = [];
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24小时前
        
        try {
            const allFiles = await vscode.workspace.findFiles(
                '**/*.{ts,js,tsx,jsx,py,java,cpp,c,cs,go}',
                '**/node_modules/**',
                100
            );

            for (const fileUri of allFiles) {
                try {
                    const stat = await vscode.workspace.fs.stat(fileUri);
                    if (stat.mtime > cutoffTime) {
                        files.push(fileUri.fsPath);
                    }
                } catch {
                    // 忽略无法访问的文件
                }
            }
        } catch (error) {
            console.warn('Failed to find recently modified files:', error);
        }

        return files;
    }

    /**
     * 计算估算的token数量
     */
    private calculateEstimatedTokens(
        relevantFiles: FileRelevance[], 
        projectStructure?: string, 
        gitDiff?: string
    ): number {
        let totalChars = 0;

        // 文件内容
        for (const file of relevantFiles) {
            if (file.content) {
                totalChars += file.content.length;
            } else {
                // 根据文件大小估算
                totalChars += file.size;
            }
        }

        // 项目结构
        if (projectStructure) {
            totalChars += projectStructure.length;
        }

        // Git差异
        if (gitDiff) {
            totalChars += gitDiff.length;
        }

        // 1 token ≈ 4 characters（经验值）
        return Math.ceil(totalChars / 4);
    }

    /**
     * 格式化上下文为prompt
     */
    formatContextForPrompt(context: EnhancedCodeContext, userQuery: string): string {
        const sections: string[] = [];

        // 用户查询
        sections.push(`## 用户需求\n${userQuery}`);

        // 当前文件信息
        if (context.activeFile) {
            const relativePath = path.relative(this.workspaceFolder, context.activeFile);
            sections.push(`## 当前文件\n文件: ${relativePath}\n语言: ${context.language}`);
            
            if (context.selection) {
                sections.push(`\n选中代码:\n\`\`\`${context.language}\n${context.selection}\n\`\`\``);
            }
        }

        // 相关文件
        if (context.relevantFiles.length > 0) {
            sections.push(`## 相关文件 (${context.relevantFiles.length}个)`);
            
            for (const file of context.relevantFiles) {
                const relativePath = path.relative(this.workspaceFolder, file.filePath);
                const ext = path.extname(file.filePath);
                
                sections.push(`### ${relativePath}`);
                if (file.content) {
                    sections.push(`\`\`\`${ext.slice(1) || 'text'}\n${file.content}\n\`\`\``);
                } else {
                    sections.push(`文件大小: ${(file.size / 1024).toFixed(1)}KB`);
                }
            }
        }

        // 项目结构
        if (context.projectStructure) {
            sections.push(`## ${context.projectStructure}`);
        }

        // Git信息
        if (context.gitDiff) {
            sections.push(`## Git状态\n${context.gitDiff}`);
        }

        // 元数据
        sections.push(`## 上下文统计\n- 文件数量: ${context.totalFiles}\n- 估算tokens: ${context.estimatedTokens}\n- 收集耗时: ${context.collectionTime}ms`);

        return sections.join('\n\n');
    }

    /**
     * 获取上下文摘要
     */
    getContextSummary(context: EnhancedCodeContext): string {
        const ranker = this.ranker;
        const fileList = ranker.formatResults(context.relevantFiles);
        
        return `上下文收集完成:\n${fileList}\n\n总计: ${context.totalFiles}个文件, ~${context.estimatedTokens} tokens, 耗时${context.collectionTime}ms`;
    }

    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<CollectorConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        if (newConfig.contextRankerConfig) {
            this.ranker.updateConfig(newConfig.contextRankerConfig);
        }
    }
}

/**
 * 创建默认的上下文收集器
 */
export function createContextCollector(config?: Partial<CollectorConfig>): ContextCollector {
    return new ContextCollector(config);
}
