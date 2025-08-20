import * as vscode from 'vscode';
import * as path from 'path';

/**
 * 文件相关性评分接口
 */
export interface FileRelevance {
    filePath: string;
    score: number;
    reasons: string[];
    content?: string;
    size: number;
    lastModified?: Date;
}

/**
 * 排序配置
 */
export interface RankingConfig {
    maxFiles: number;           // 最大文件数量
    maxTokens: number;          // 最大token数量(估算)
    includePatterns: string[];  // 包含文件模式
    excludePatterns: string[];  // 排除文件模式
    boostPatterns: Map<string, number>; // 文件类型权重加成
}

/**
 * 上下文排序器
 * 
 * 基于以下因素对文件进行相关性评分：
 * 1. 当前选中/打开的文件（最高优先级）
 * 2. 文件扩展名匹配（代码文件优先）
 * 3. 文件最近修改时间
 * 4. 文件名和内容与查询的相关性
 * 5. Git状态（已修改的文件优先）
 * 6. 项目结构位置（src下的文件优先）
 */
export class ContextRanker {
    private workspaceFolder: string;
    private config: RankingConfig;

    constructor(workspaceFolder?: string, config?: Partial<RankingConfig>) {
        this.workspaceFolder = workspaceFolder || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        
        this.config = {
            maxFiles: 10,
            maxTokens: 15000,  // 约60KB内容
            includePatterns: [
                '**/*.ts', '**/*.js', '**/*.jsx', '**/*.tsx',
                '**/*.py', '**/*.java', '**/*.cpp', '**/*.c',
                '**/*.cs', '**/*.go', '**/*.rs', '**/*.php',
                '**/*.rb', '**/*.swift', '**/*.kt',
                '**/*.json', '**/*.yaml', '**/*.yml',
                '**/*.md', '**/*.txt'
            ],
            excludePatterns: [
                '**/node_modules/**',
                '**/dist/**',
                '**/build/**',
                '**/.git/**',
                '**/coverage/**',
                '**/*.min.js',
                '**/*.min.css',
                '**/.next/**',
                '**/out/**'
            ],
            boostPatterns: new Map([
                ['.ts', 1.5],
                ['.tsx', 1.5],
                ['.js', 1.4],
                ['.jsx', 1.4],
                ['.py', 1.3],
                ['.json', 1.2],
                ['.yaml', 1.2],
                ['.yml', 1.2],
                ['.md', 1.1]
            ]),
            ...config
        };
    }

    /**
     * 对工作区文件进行相关性排序
     */
    async rankFiles(query?: string, activeFile?: string): Promise<FileRelevance[]> {
        try {
            // 获取所有候选文件
            const candidateFiles = await this.getCandidateFiles();
            
            // 计算每个文件的相关性得分
            const scoredFiles = await Promise.all(
                candidateFiles.map(file => this.scoreFile(file, query, activeFile))
            );

            // 按得分排序
            scoredFiles.sort((a, b) => b.score - a.score);

            // 应用Top-K选择和token限制
            return this.applyConstraints(scoredFiles);
        } catch (error) {
            console.error('Context ranking failed:', error);
            return [];
        }
    }

    /**
     * 获取候选文件列表
     */
    private async getCandidateFiles(): Promise<string[]> {
        const files: string[] = [];
        
        // 使用VS Code的文件搜索API
        const includePattern = `{${this.config.includePatterns.join(',')}}`;
        const excludePattern = `{${this.config.excludePatterns.join(',')}}`;
        
        const foundFiles = await vscode.workspace.findFiles(
            includePattern,
            excludePattern,
            1000 // 限制最大搜索结果
        );

        return foundFiles.map(uri => uri.fsPath);
    }

    /**
     * 计算单个文件的相关性得分
     */
    private async scoreFile(filePath: string, query?: string, activeFile?: string): Promise<FileRelevance> {
        let score = 0;
        const reasons: string[] = [];
        const ext = path.extname(filePath).toLowerCase();
        let content: string | undefined;
        let size = 0;
        let lastModified: Date | undefined;

        try {
            // 获取文件统计信息
            const uri = vscode.Uri.file(filePath);
            const stat = await vscode.workspace.fs.stat(uri);
            size = stat.size;
            lastModified = new Date(stat.mtime);

            // 基础得分：文件扩展名加成
            const extensionBoost = this.config.boostPatterns.get(ext) || 1.0;
            score += extensionBoost * 10;
            if (extensionBoost > 1.0) {
                reasons.push(`文件类型加成 (${ext}): +${((extensionBoost - 1) * 10).toFixed(1)}`);
            }

            // 当前激活文件得到最高分
            if (activeFile && path.resolve(filePath) === path.resolve(activeFile)) {
                score += 100;
                reasons.push('当前激活文件: +100');
            }

            // 最近修改的文件加成
            if (lastModified) {
                const daysSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
                if (daysSinceModified < 1) {
                    score += 30;
                    reasons.push('今天修改: +30');
                } else if (daysSinceModified < 7) {
                    score += 15;
                    reasons.push('本周修改: +15');
                }
            }

            // 项目结构位置加成
            const relativePath = path.relative(this.workspaceFolder, filePath);
            if (relativePath.includes('src' + path.sep)) {
                score += 20;
                reasons.push('源码目录: +20');
            }
            if (relativePath.includes('test' + path.sep) || relativePath.includes('spec' + path.sep)) {
                score += 10;
                reasons.push('测试目录: +10');
            }

            // 读取文件内容进行内容相关性分析
            if (size < 100 * 1024) { // 只读取小于100KB的文件
                try {
                    const document = await vscode.workspace.openTextDocument(uri);
                    content = document.getText();
                    
                    // 查询关键词匹配加成
                    if (query && content) {
                        const contentScore = this.calculateContentRelevance(content, query, relativePath);
                        score += contentScore;
                        if (contentScore > 0) {
                            reasons.push(`内容相关性: +${contentScore.toFixed(1)}`);
                        }
                    }
                } catch (error) {
                    // 文件读取失败，跳过内容分析
                    console.warn(`Failed to read file ${filePath}:`, error);
                }
            }

            // Git状态加成（模拟，实际需要调用git命令）
            if (await this.isFileModified(filePath)) {
                score += 25;
                reasons.push('Git已修改: +25');
            }

        } catch (error) {
            console.warn(`Failed to analyze file ${filePath}:`, error);
            score = 1; // 给予最低分，避免完全排除
        }

        return {
            filePath,
            score: Math.max(score, 0),
            reasons,
            content,
            size,
            lastModified
        };
    }

    /**
     * 计算内容相关性得分
     */
    private calculateContentRelevance(content: string, query: string, relativePath: string): number {
        let score = 0;
        const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        const contentLower = content.toLowerCase();
        const pathLower = relativePath.toLowerCase();

        for (const word of queryWords) {
            // 文件路径包含查询词
            if (pathLower.includes(word)) {
                score += 15;
            }
            
            // 内容包含查询词（区分类型）
            const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
            if (matches > 0) {
                // 函数名、类名匹配权重更高
                if (content.match(new RegExp(`(class|function|const|let|var)\\s+\\w*${word}\\w*`, 'i'))) {
                    score += 20;
                } else {
                    score += Math.min(matches * 2, 10); // 最多10分
                }
            }
        }

        return score;
    }

    /**
     * 检查文件是否被Git修改（简化版）
     */
    private async isFileModified(filePath: string): Promise<boolean> {
        // 简化实现：检查文件是否在最近24小时内修改
        try {
            const uri = vscode.Uri.file(filePath);
            const stat = await vscode.workspace.fs.stat(uri);
            const daysSinceModified = (Date.now() - stat.mtime) / (1000 * 60 * 60 * 24);
            return daysSinceModified < 1;
        } catch {
            return false;
        }
    }

    /**
     * 应用文件数量和token限制
     */
    private applyConstraints(scoredFiles: FileRelevance[]): FileRelevance[] {
        const result: FileRelevance[] = [];
        let totalTokens = 0;

        for (const file of scoredFiles) {
            // 达到最大文件数量限制
            if (result.length >= this.config.maxFiles) {
                break;
            }

            // 估算文件token数量（1 token ≈ 4 字符）
            const estimatedTokens = file.content ? Math.ceil(file.content.length / 4) : Math.ceil(file.size / 4);
            
            // 检查是否超过token限制
            if (totalTokens + estimatedTokens > this.config.maxTokens) {
                // 如果单个文件就超过限制，截断内容
                if (result.length === 0 && file.content) {
                    const maxContentLength = (this.config.maxTokens - totalTokens) * 4;
                    file.content = file.content.substring(0, maxContentLength) + '\n... (内容已截断)';
                    file.reasons.push('内容截断以满足token限制');
                    result.push(file);
                    break;
                } else {
                    break;
                }
            }

            totalTokens += estimatedTokens;
            result.push(file);
        }

        return result;
    }

    /**
     * 格式化排序结果为可读字符串
     */
    formatResults(rankedFiles: FileRelevance[]): string {
        const summary = rankedFiles.map((file, index) => {
            const relativePath = path.relative(this.workspaceFolder, file.filePath);
            const reasonsStr = file.reasons.length > 0 ? ` (${file.reasons.join(', ')})` : '';
            return `${index + 1}. ${relativePath} [得分: ${file.score.toFixed(1)}]${reasonsStr}`;
        }).join('\n');

        const totalSize = rankedFiles.reduce((sum, file) => sum + (file.content?.length || 0), 0);
        const estimatedTokens = Math.ceil(totalSize / 4);

        return `选中了 ${rankedFiles.length} 个文件，预计 ${estimatedTokens} tokens:\n${summary}`;
    }

    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<RankingConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }
}

/**
 * 创建默认的上下文排序器
 */
export function createContextRanker(workspaceFolder?: string): ContextRanker {
    return new ContextRanker(workspaceFolder);
}
