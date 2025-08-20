/**
 * 文件操作工具
 * 
 * 提供安全的文件读写功能
 */

import { BaseTool, ToolConfig, ToolExecutionResult } from './base.js';
import * as fs from 'fs';
import * as path from 'path';

export class WriteFileTool extends BaseTool {
    constructor(workspaceRoot: string) {
        const config: ToolConfig = {
            name: 'writeFile',
            description: '将内容写入文件，如果文件不存在则创建，如果存在则覆盖',
            version: '1.0.0',
            author: 'AI Agent Hub',
            parameters: {
                type: 'object',
                properties: {
                    filePath: {
                        type: 'string',
                        description: '要写入的文件路径（相对于工作区根目录）'
                    },
                    content: {
                        type: 'string',
                        description: '要写入的文件内容'
                    },
                    encoding: {
                        type: 'string',
                        description: '文件编码格式',
                        default: 'utf8',
                        enum: ['utf8', 'utf16le', 'latin1', 'base64', 'hex']
                    }
                },
                required: ['filePath', 'content']
            },
            security: {
                forbiddenExtensions: ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.dll', '.so'],
                forbiddenDirectories: ['.git', 'node_modules', '.vscode/settings.json'],
                maxFileSize: 10 * 1024 * 1024, // 10MB
                allowShellExecution: false
            }
        };

        super(workspaceRoot, config);
    }

    async execute(params: any): Promise<ToolExecutionResult> {
        try {
            this.validateParameters(params);

            const { filePath, content, encoding = 'utf8' } = params;
            
            this.validateFilePath(filePath);
            
            // 检查内容大小
            const contentSize = Buffer.byteLength(content, encoding as BufferEncoding);
            if (this.config.security?.maxFileSize && contentSize > this.config.security.maxFileSize) {
                throw new Error(`File content too large: ${contentSize} bytes. Maximum allowed: ${this.config.security.maxFileSize} bytes`);
            }

            const fullPath = path.resolve(this.workspaceRoot, filePath);
            
            // 确保目录存在
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // 写入文件
            fs.writeFileSync(fullPath, content, { encoding: encoding as BufferEncoding });

            const stats = fs.statSync(fullPath);
            
            return {
                success: true,
                result: `File written successfully: ${filePath}`,
                metadata: {
                    filePath,
                    size: stats.size,
                    encoding,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
}

export class ReadFileTool extends BaseTool {
    constructor(workspaceRoot: string) {
        const config: ToolConfig = {
            name: 'readFile',
            description: '读取文件内容',
            version: '1.0.0',
            author: 'AI Agent Hub',
            parameters: {
                type: 'object',
                properties: {
                    filePath: {
                        type: 'string',
                        description: '要读取的文件路径（相对于工作区根目录）'
                    },
                    encoding: {
                        type: 'string',
                        description: '文件编码格式',
                        default: 'utf8',
                        enum: ['utf8', 'utf16le', 'latin1', 'base64', 'hex']
                    },
                    maxSize: {
                        type: 'number',
                        description: '最大读取字节数（防止读取过大文件）',
                        default: 1024 * 1024 // 1MB
                    }
                },
                required: ['filePath']
            },
            security: {
                forbiddenExtensions: ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.dll', '.so'],
                forbiddenDirectories: ['.git/objects', '.env'],
                maxFileSize: 10 * 1024 * 1024, // 10MB
                allowShellExecution: false
            }
        };

        super(workspaceRoot, config);
    }

    async execute(params: any): Promise<ToolExecutionResult> {
        try {
            this.validateParameters(params);

            const { filePath, encoding = 'utf8', maxSize = 1024 * 1024 } = params;
            
            this.validateFilePath(filePath);

            const fullPath = path.resolve(this.workspaceRoot, filePath);
            
            // 检查文件是否存在
            if (!fs.existsSync(fullPath)) {
                throw new Error(`File not found: ${filePath}`);
            }

            const stats = fs.statSync(fullPath);
            
            // 检查文件大小
            if (stats.size > maxSize) {
                throw new Error(`File too large: ${stats.size} bytes. Maximum allowed: ${maxSize} bytes`);
            }

            if (!stats.isFile()) {
                throw new Error(`Path is not a file: ${filePath}`);
            }

            // 读取文件
            const content = fs.readFileSync(fullPath, { encoding: encoding as BufferEncoding });

            return {
                success: true,
                result: content,
                metadata: {
                    filePath,
                    size: stats.size,
                    encoding,
                    lastModified: stats.mtime.toISOString(),
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
}

export class SearchFilesTool extends BaseTool {
    constructor(workspaceRoot: string) {
        const config: ToolConfig = {
            name: 'searchFiles',
            description: '在指定目录中搜索匹配模式的文件',
            version: '1.0.0',
            author: 'AI Agent Hub',
            parameters: {
                type: 'object',
                properties: {
                    pattern: {
                        type: 'string',
                        description: '文件名匹配模式（支持glob语法，如 *.ts, **/*.js）'
                    },
                    directory: {
                        type: 'string',
                        description: '搜索目录（相对于工作区根目录）',
                        default: '.'
                    },
                    maxResults: {
                        type: 'number',
                        description: '最大返回结果数',
                        default: 100
                    },
                    includeContent: {
                        type: 'boolean',
                        description: '是否包含文件内容预览',
                        default: false
                    }
                },
                required: ['pattern']
            },
            security: {
                forbiddenDirectories: ['.git', 'node_modules'],
                allowShellExecution: false
            }
        };

        super(workspaceRoot, config);
    }

    async execute(params: any): Promise<ToolExecutionResult> {
        try {
            this.validateParameters(params);

            const { pattern, directory = '.', maxResults = 100, includeContent = false } = params;
            
            const searchDir = path.resolve(this.workspaceRoot, directory);
            
            // 简单的文件搜索实现（生产环境可以使用更高效的实现）
            const results = this.searchFiles(searchDir, pattern, maxResults, includeContent);

            return {
                success: true,
                result: `Found ${results.length} files matching pattern: ${pattern}`,
                metadata: {
                    pattern,
                    directory,
                    results,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    private searchFiles(dir: string, pattern: string, maxResults: number, includeContent: boolean): any[] {
        const results: any[] = [];
        const glob = require('glob');
        
        try {
            const matches = glob.sync(pattern, { cwd: dir, nodir: true }).slice(0, maxResults);
            
            for (const match of matches) {
                const fullPath = path.resolve(dir, match);
                const relativePath = path.relative(this.workspaceRoot, fullPath);
                const stats = fs.statSync(fullPath);
                
                const fileInfo: any = {
                    path: relativePath,
                    size: stats.size,
                    lastModified: stats.mtime.toISOString()
                };

                if (includeContent && stats.size < 10 * 1024) { // Only preview files < 10KB
                    try {
                        fileInfo.preview = fs.readFileSync(fullPath, 'utf8').substring(0, 500);
                    } catch (err) {
                        fileInfo.preview = '[Binary file or read error]';
                    }
                }

                results.push(fileInfo);
            }
        } catch (error) {
            throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return results;
    }
}
