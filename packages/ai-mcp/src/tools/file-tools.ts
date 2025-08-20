/**
 * 文件操作工具 - 提供安全的文件读写和搜索功能
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseTool, ToolResult, ToolParams, ToolContext } from './base';

/**
 * 写文件工具
 */
export class WriteFileTool extends BaseTool {
    constructor(workspaceRoot: string) {
        super(workspaceRoot, 'write_file', 'Write content to a file with directory creation support');
    }

    getSchema(): any {
        return {
            type: 'object',
            properties: {
                file_path: {
                    type: 'string',
                    description: 'Path to the file to write (relative to workspace root)'
                },
                content: {
                    type: 'string',
                    description: 'Content to write to the file'
                },
                create_directories: {
                    type: 'boolean',
                    description: 'Whether to create parent directories if they do not exist',
                    default: true
                },
                encoding: {
                    type: 'string',
                    description: 'File encoding',
                    default: 'utf8'
                }
            },
            required: ['file_path', 'content']
        };
    }

    async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
        const safeContext = this.createContext(context);
        
        try {
            // 验证参数
            if (!this.validateParams(params)) {
                return { success: false, error: 'Invalid parameters' };
            }

            const { file_path, content, create_directories = true, encoding = 'utf8' } = params;

            if (!file_path || typeof file_path !== 'string') {
                return { success: false, error: 'file_path is required and must be a string' };
            }

            if (content === undefined || content === null) {
                return { success: false, error: 'content is required' };
            }

            // 验证文件路径安全性
            if (!this.validateFilePath(file_path)) {
                return { success: false, error: 'Invalid or unsafe file path' };
            }

            const absolutePath = path.resolve(this.workspaceRoot, file_path);
            const directory = path.dirname(absolutePath);

            // 创建目录（如果需要）
            if (create_directories && !fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
            }

            // 写入文件
            fs.writeFileSync(absolutePath, String(content), encoding as BufferEncoding);

            const result: ToolResult = {
                success: true,
                data: {
                    file_path: file_path,
                    bytes_written: Buffer.byteLength(String(content), encoding as BufferEncoding),
                    absolute_path: absolutePath
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    encoding
                }
            };

            this.logExecution(params, result, safeContext);
            return result;

        } catch (error) {
            const result: ToolResult = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown file write error'
            };
            
            this.logExecution(params, result, safeContext);
            return result;
        }
    }
}

/**
 * 读文件工具
 */
export class ReadFileTool extends BaseTool {
    constructor(workspaceRoot: string) {
        super(workspaceRoot, 'read_file', 'Read content from a file with size limits');
    }

    getSchema(): any {
        return {
            type: 'object',
            properties: {
                file_path: {
                    type: 'string',
                    description: 'Path to the file to read (relative to workspace root)'
                },
                encoding: {
                    type: 'string',
                    description: 'File encoding',
                    default: 'utf8'
                },
                max_size_mb: {
                    type: 'number',
                    description: 'Maximum file size to read in MB',
                    default: 10
                }
            },
            required: ['file_path']
        };
    }

    async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
        const safeContext = this.createContext(context);
        
        try {
            // 验证参数
            if (!this.validateParams(params)) {
                return { success: false, error: 'Invalid parameters' };
            }

            const { file_path, encoding = 'utf8', max_size_mb = 10 } = params;

            if (!file_path || typeof file_path !== 'string') {
                return { success: false, error: 'file_path is required and must be a string' };
            }

            // 验证文件路径安全性
            if (!this.validateFilePath(file_path)) {
                return { success: false, error: 'Invalid or unsafe file path' };
            }

            const absolutePath = path.resolve(this.workspaceRoot, file_path);

            // 检查文件是否存在
            if (!fs.existsSync(absolutePath)) {
                return { success: false, error: `File not found: ${file_path}` };
            }

            // 检查文件大小
            const stats = fs.statSync(absolutePath);
            const maxSizeBytes = max_size_mb * 1024 * 1024;
            
            if (stats.size > maxSizeBytes) {
                return {
                    success: false,
                    error: `File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB > ${max_size_mb}MB`
                };
            }

            // 检查是否为文件（不是目录）
            if (!stats.isFile()) {
                return { success: false, error: `Path is not a file: ${file_path}` };
            }

            // 读取文件
            const content = fs.readFileSync(absolutePath, encoding as BufferEncoding);

            const result: ToolResult = {
                success: true,
                data: {
                    file_path: file_path,
                    content: content,
                    size_bytes: stats.size,
                    absolute_path: absolutePath,
                    modified_time: stats.mtime.toISOString()
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    encoding
                }
            };

            this.logExecution(params, result, safeContext);
            return result;

        } catch (error) {
            const result: ToolResult = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown file read error'
            };
            
            this.logExecution(params, result, safeContext);
            return result;
        }
    }
}

/**
 * 搜索文件工具
 */
export class SearchFilesTool extends BaseTool {
    constructor(workspaceRoot: string) {
        super(workspaceRoot, 'search_files', 'Search for files and content with regex support');
    }

    getSchema(): any {
        return {
            type: 'object',
            properties: {
                pattern: {
                    type: 'string',
                    description: 'Search pattern (regex supported)'
                },
                search_type: {
                    type: 'string',
                    enum: ['filename', 'content', 'both'],
                    description: 'Type of search to perform',
                    default: 'both'
                },
                file_extensions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'File extensions to include (e.g., [".js", ".ts"])',
                    default: []
                },
                max_results: {
                    type: 'number',
                    description: 'Maximum number of results to return',
                    default: 100
                },
                include_content: {
                    type: 'boolean',
                    description: 'Whether to include matching content snippets',
                    default: false
                }
            },
            required: ['pattern']
        };
    }

    async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
        const safeContext = this.createContext(context);
        
        try {
            // 验证参数
            if (!this.validateParams(params)) {
                return { success: false, error: 'Invalid parameters' };
            }

            const {
                pattern,
                search_type = 'both',
                file_extensions = [],
                max_results = 100,
                include_content = false
            } = params;

            if (!pattern || typeof pattern !== 'string') {
                return { success: false, error: 'pattern is required and must be a string' };
            }

            // 创建正则表达式
            let regex: RegExp;
            try {
                regex = new RegExp(pattern, 'gi');
            } catch (error) {
                return { success: false, error: `Invalid regex pattern: ${pattern}` };
            }

            const results: any[] = [];
            const searchResults = this.searchDirectory(
                this.workspaceRoot,
                regex,
                search_type,
                file_extensions,
                include_content,
                max_results
            );

            const result: ToolResult = {
                success: true,
                data: {
                    pattern: pattern,
                    search_type: search_type,
                    results: searchResults,
                    total_found: searchResults.length,
                    truncated: searchResults.length >= max_results
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    workspace_root: this.workspaceRoot
                }
            };

            this.logExecution(params, result, safeContext);
            return result;

        } catch (error) {
            const result: ToolResult = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown search error'
            };
            
            this.logExecution(params, result, safeContext);
            return result;
        }
    }

    private searchDirectory(
        dirPath: string,
        regex: RegExp,
        searchType: string,
        fileExtensions: string[],
        includeContent: boolean,
        maxResults: number
    ): any[] {
        const results: any[] = [];
        
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                if (results.length >= maxResults) break;
                
                const itemPath = path.join(dirPath, item);
                const relativePath = path.relative(this.workspaceRoot, itemPath);
                
                // 跳过隐藏文件和目录
                if (item.startsWith('.')) continue;
                
                // 跳过node_modules等目录
                if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'build') {
                    continue;
                }
                
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    // 递归搜索子目录
                    const subResults = this.searchDirectory(
                        itemPath,
                        regex,
                        searchType,
                        fileExtensions,
                        includeContent,
                        maxResults - results.length
                    );
                    results.push(...subResults);
                } else if (stats.isFile()) {
                    // 检查文件扩展名
                    if (fileExtensions.length > 0) {
                        const ext = path.extname(item).toLowerCase();
                        if (!fileExtensions.includes(ext)) continue;
                    }
                    
                    let matched = false;
                    const matchInfo: any = {
                        file_path: relativePath,
                        absolute_path: itemPath,
                        size_bytes: stats.size,
                        modified_time: stats.mtime.toISOString()
                    };
                    
                    // 搜索文件名
                    if (searchType === 'filename' || searchType === 'both') {
                        if (regex.test(item)) {
                            matched = true;
                            matchInfo.match_type = 'filename';
                        }
                    }
                    
                    // 搜索文件内容
                    if ((searchType === 'content' || searchType === 'both') && !matched) {
                        try {
                            // 只搜索文本文件（小于1MB）
                            if (stats.size < 1024 * 1024) {
                                const content = fs.readFileSync(itemPath, 'utf8');
                                const contentMatches = content.match(regex);
                                
                                if (contentMatches) {
                                    matched = true;
                                    matchInfo.match_type = 'content';
                                    matchInfo.match_count = contentMatches.length;
                                    
                                    if (includeContent) {
                                        // 提取匹配的行
                                        const lines = content.split('\n');
                                        const matchingLines: any[] = [];
                                        
                                        lines.forEach((line, index) => {
                                            if (regex.test(line) && matchingLines.length < 5) {
                                                matchingLines.push({
                                                    line_number: index + 1,
                                                    content: line.trim()
                                                });
                                            }
                                        });
                                        
                                        matchInfo.matching_lines = matchingLines;
                                    }
                                }
                            }
                        } catch (error) {
                            // 忽略二进制文件或读取错误
                        }
                    }
                    
                    if (matched) {
                        results.push(matchInfo);
                    }
                }
            }
        } catch (error) {
            // 忽略无法访问的目录
        }
        
        return results;
    }
}