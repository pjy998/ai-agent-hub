import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LanguageTemplates, LanguageTemplate } from '../templates/LanguageTemplates';
import { languageManager, ExtensibleLanguageManager } from '../templates/ExtensibleLanguageManager';

/**
 * 简单的YAML字符串生成器
 * 替代外部yaml库依赖
 */
class SimpleYamlGenerator {
    static stringify(obj: any, options: { indent?: number } = {}): string {
        const indent = options.indent || 2;
        return this.objectToYaml(obj, 0, indent);
    }

    private static objectToYaml(obj: any, depth: number, indent: number): string {
        if (obj === null || obj === undefined) {
            return 'null';
        }
        
        if (typeof obj === 'string') {
            // 处理包含特殊字符的字符串
            if (obj.includes('\n') || obj.includes(':') || obj.includes('#') || obj.includes('"')) {
                return `"${obj.replace(/"/g, '\\"')}"`;
            }
            return obj;
        }
        
        if (typeof obj === 'number' || typeof obj === 'boolean') {
            return String(obj);
        }
        
        if (Array.isArray(obj)) {
            if (obj.length === 0) {
                return '[]';
            }
            return obj.map(item => {
                const spaces = ' '.repeat(depth * indent);
                return `${spaces}- ${this.objectToYaml(item, depth + 1, indent)}`;
            }).join('\n');
        }
        
        if (typeof obj === 'object') {
            const entries = Object.entries(obj);
            if (entries.length === 0) {
                return '{}';
            }
            
            return entries.map(([key, value]) => {
                const spaces = ' '.repeat(depth * indent);
                const yamlValue = this.objectToYaml(value, depth + 1, indent);
                
                // 如果值是多行的，需要特殊处理
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    return `${spaces}${key}:\n${yamlValue}`;
                } else if (Array.isArray(value) && value.length > 0) {
                    return `${spaces}${key}:\n${yamlValue}`;
                } else {
                    return `${spaces}${key}: ${yamlValue}`;
                }
            }).join('\n');
        }
        
        return String(obj);
    }
}

/**
 * 语言特定的分析配置接口
 */
export interface LanguageAnalysisConfig {
    language: string;
    fileExtensions: string[];
    analysisRules: AnalysisRule[];
    codingStandards: CodingStandard[];
    securityChecks: SecurityCheck[];
    performanceChecks: PerformanceCheck[];
}

interface AnalysisRule {
    name: string;
    description: string;
    pattern: string;
    severity: 'error' | 'warning' | 'info';
    category: string;
}

interface CodingStandard {
    name: string;
    description: string;
    examples: {
        good: string;
        bad: string;
    };
}

interface SecurityCheck {
    name: string;
    description: string;
    pattern: string;
    riskLevel: 'high' | 'medium' | 'low';
}

interface PerformanceCheck {
    name: string;
    description: string;
    pattern: string;
    impact: 'high' | 'medium' | 'low';
}

/**
 * 动态YAML配置生成器
 * 通过Copilot Chat集成来动态创建分析配置
 */
export class DynamicConfigGenerator {
    private languageConfigs: Map<string, LanguageAnalysisConfig> = new Map();
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('AI Agent Hub - Config Generator');
        this.initializeLanguageConfigs();
    }

    /**
     * 初始化内置语言配置
     */
    private initializeLanguageConfigs(): void {
        // C# 配置
        this.languageConfigs.set('csharp', {
            language: 'C#',
            fileExtensions: ['.cs'],
            analysisRules: [
                {
                    name: 'PascalCase Classes',
                    description: '类名应使用PascalCase命名',
                    pattern: 'class\\s+[a-z]',
                    severity: 'warning',
                    category: 'naming'
                },
                {
                    name: 'Interface Prefix',
                    description: '接口名应以I开头',
                    pattern: 'interface\\s+(?!I)[A-Z]',
                    severity: 'warning',
                    category: 'naming'
                }
            ],
            codingStandards: [
                {
                    name: 'Method Naming',
                    description: '方法名使用PascalCase',
                    examples: {
                        good: 'public void CalculateTotal() { }',
                        bad: 'public void calculateTotal() { }'
                    }
                }
            ],
            securityChecks: [
                {
                    name: 'SQL Injection',
                    description: '检查SQL注入风险',
                    pattern: 'string.*sql.*\\+',
                    riskLevel: 'high'
                }
            ],
            performanceChecks: [
                {
                    name: 'String Concatenation',
                    description: '检查字符串拼接性能问题',
                    pattern: 'string.*\\+.*\\+',
                    impact: 'medium'
                }
            ]
        });

        // Java 配置
        this.languageConfigs.set('java', {
            language: 'Java',
            fileExtensions: ['.java'],
            analysisRules: [
                {
                    name: 'CamelCase Methods',
                    description: '方法名应使用camelCase',
                    pattern: 'public\\s+\\w+\\s+[A-Z]\\w*\\s*\\(',
                    severity: 'warning',
                    category: 'naming'
                }
            ],
            codingStandards: [
                {
                    name: 'Class Naming',
                    description: '类名使用PascalCase',
                    examples: {
                        good: 'public class UserService { }',
                        bad: 'public class userService { }'
                    }
                }
            ],
            securityChecks: [
                {
                    name: 'Hardcoded Passwords',
                    description: '检查硬编码密码',
                    pattern: 'password\\s*=\\s*"[^"]+"',
                    riskLevel: 'high'
                }
            ],
            performanceChecks: [
                {
                    name: 'ArrayList vs LinkedList',
                    description: '检查集合类型选择',
                    pattern: 'new\\s+LinkedList.*add\\(',
                    impact: 'medium'
                }
            ]
        });

        // Python 配置
        this.languageConfigs.set('python', {
            language: 'Python',
            fileExtensions: ['.py'],
            analysisRules: [
                {
                    name: 'Snake Case Functions',
                    description: '函数名应使用snake_case',
                    pattern: 'def\\s+[A-Z]\\w*\\(',
                    severity: 'warning',
                    category: 'naming'
                }
            ],
            codingStandards: [
                {
                    name: 'Function Naming',
                    description: '函数名使用snake_case',
                    examples: {
                        good: 'def calculate_total(): pass',
                        bad: 'def calculateTotal(): pass'
                    }
                }
            ],
            securityChecks: [
                {
                    name: 'Eval Usage',
                    description: '检查eval函数使用',
                    pattern: 'eval\\(',
                    riskLevel: 'high'
                }
            ],
            performanceChecks: [
                {
                    name: 'List Comprehension',
                    description: '建议使用列表推导式',
                    pattern: 'for\\s+\\w+\\s+in.*append\\(',
                    impact: 'low'
                }
            ]
        });

        // Vue.js 配置
        this.languageConfigs.set('vue', {
            language: 'Vue.js',
            fileExtensions: ['.vue'],
            analysisRules: [
                {
                    name: 'Component Naming',
                    description: '组件名应使用PascalCase',
                    pattern: 'name:\\s*["\'][a-z]',
                    severity: 'warning',
                    category: 'naming'
                }
            ],
            codingStandards: [
                {
                    name: 'Props Definition',
                    description: 'Props应明确定义类型',
                    examples: {
                        good: 'props: { title: { type: String, required: true } }',
                        bad: 'props: ["title"]'
                    }
                }
            ],
            securityChecks: [
                {
                    name: 'XSS Prevention',
                    description: '检查XSS风险',
                    pattern: 'v-html\\s*=',
                    riskLevel: 'medium'
                }
            ],
            performanceChecks: [
                {
                    name: 'V-for Key',
                    description: 'v-for应使用key',
                    pattern: 'v-for(?!.*:key)',
                    impact: 'medium'
                }
            ]
        });
    }

    /**
     * 通过Copilot Chat生成自定义语言配置
     */
    async generateLanguageConfig(language: string, requirements: string): Promise<LanguageAnalysisConfig> {
        const prompt = this.buildConfigGenerationPrompt(language, requirements);
        
        try {
            // 调用Copilot Chat API生成配置
            const response = await this.callCopilotChat(prompt);
            const config = this.parseConfigResponse(response, language);
            
            // 保存生成的配置
            this.languageConfigs.set(language.toLowerCase(), config);
            
            this.outputChannel.appendLine(`✅ 成功生成 ${language} 语言配置`);
            return config;
        } catch (error) {
            this.outputChannel.appendLine(`❌ 生成 ${language} 配置失败: ${error}`);
            throw error;
        }
    }

    /**
     * 构建配置生成提示词
     */
    private buildConfigGenerationPrompt(language: string, requirements: string): string {
        return `
请为 ${language} 编程语言生成代码分析配置。

要求：
${requirements}

请生成包含以下内容的JSON配置：
1. 文件扩展名列表
2. 命名规范检查规则
3. 编码标准示例
4. 安全性检查规则
5. 性能优化建议

输出格式：
\`\`\`json
{
  "language": "${language}",
  "fileExtensions": [".ext"],
  "analysisRules": [
    {
      "name": "规则名称",
      "description": "规则描述",
      "pattern": "正则表达式",
      "severity": "error|warning|info",
      "category": "分类"
    }
  ],
  "codingStandards": [
    {
      "name": "标准名称",
      "description": "标准描述",
      "examples": {
        "good": "正确示例",
        "bad": "错误示例"
      }
    }
  ],
  "securityChecks": [
    {
      "name": "检查名称",
      "description": "检查描述",
      "pattern": "正则表达式",
      "riskLevel": "high|medium|low"
    }
  ],
  "performanceChecks": [
    {
      "name": "检查名称",
      "description": "检查描述",
      "pattern": "正则表达式",
      "impact": "high|medium|low"
    }
  ]
}
\`\`\`
`;
    }

    /**
     * 调用Copilot Chat API
     */
    private async callCopilotChat(prompt: string): Promise<string> {
        try {
            // 获取VS Code Language Model
            const models = await vscode.lm.selectChatModels({
                vendor: 'copilot',
                family: 'gpt-4'
            });
            
            if (models.length === 0) {
                throw new Error('未找到可用的Copilot模型');
            }
            
            const model = models[0];
            
            // 发送请求
            const request = await model.sendRequest([
                vscode.LanguageModelChatMessage.User(prompt)
            ], {}, new vscode.CancellationTokenSource().token);
            
            // 收集响应
            let response = '';
            for await (const fragment of request.text) {
                response += fragment;
            }
            
            return response;
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Copilot Chat API调用失败: ${error}`);
            // 返回模拟响应作为回退
            return `{
  "language": "示例语言",
  "fileExtensions": [".example"],
  "analysisRules": [],
  "codingStandards": [],
  "securityChecks": [],
  "performanceChecks": []
}`;
        }
    }

    /**
     * 解析Copilot Chat响应
     */
    private parseConfigResponse(response: string, language: string): LanguageAnalysisConfig {
        try {
            // 提取JSON代码块
            const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                const configData = JSON.parse(jsonMatch[1]);
                return {
                    language: configData.language || language,
                    fileExtensions: configData.fileExtensions || [],
                    analysisRules: configData.analysisRules || [],
                    codingStandards: configData.codingStandards || [],
                    securityChecks: configData.securityChecks || [],
                    performanceChecks: configData.performanceChecks || []
                };
            }
            throw new Error('未找到有效的JSON配置');
        } catch (error) {
            throw new Error(`解析配置失败: ${error}`);
        }
    }

    /**
     * 生成YAML分析配置文件
     */
    async generateYamlConfig(language: string, outputPath?: string): Promise<string> {
        const config = this.languageConfigs.get(language.toLowerCase());
        if (!config) {
            throw new Error(`未找到 ${language} 语言配置`);
        }

        const yamlConfig = {
            name: `${config.language} Coding Standards Analysis`,
            description: `基于最佳实践分析${config.language}项目的代码质量和规范性`,
            version: '1.0.0',
            author: 'AI Agent Hub - Dynamic Generator',
            
            agents: {
                analyzer: {
                    name: `${config.language} Code Analyzer`,
                    description: `专门分析${config.language}代码规范的代理`,
                    capabilities: [
                        '代码静态分析',
                        '编码规范检查',
                        '最佳实践建议',
                        '重构建议'
                    ]
                },
                reporter: {
                    name: 'Report Generator',
                    description: '生成分析报告的代理',
                    capabilities: [
                        '报告生成',
                        '问题汇总',
                        '改进建议'
                    ]
                }
            },

            steps: [
                {
                    name: 'project_scan',
                    agent: 'analyzer',
                    prompt: `请扫描指定的${config.language}项目目录，识别以下内容：\n1. 项目结构和组织方式\n2. 所有${config.fileExtensions.join('、')}文件的位置\n3. 项目配置文件\n4. 代码文件的基本统计信息\n\n扫描目标：{project_path}`,
                    output: 'project_structure',
                    tools_required: ['list_dir', 'search_by_regex', 'view_files']
                },
                {
                    name: 'coding_standards_check',
                    agent: 'analyzer',
                    prompt: this.generateCodingStandardsPrompt(config),
                    output: 'standards_analysis',
                    tools_required: ['view_files', 'search_by_regex']
                },
                {
                    name: 'security_review',
                    agent: 'analyzer',
                    prompt: this.generateSecurityPrompt(config),
                    output: 'security_review',
                    tools_required: ['search_by_regex', 'view_files']
                },
                {
                    name: 'performance_analysis',
                    agent: 'analyzer',
                    prompt: this.generatePerformancePrompt(config),
                    output: 'performance_analysis',
                    tools_required: ['view_files', 'search_codebase']
                },
                {
                    name: 'generate_report',
                    agent: 'reporter',
                    prompt: `生成完整的${config.language}代码分析报告，包含：\n\n## 执行摘要\n- 项目概况\n- 主要发现\n- 总体评分\n\n## 详细分析\n- 编码规范符合度\n- 安全性评估\n- 性能分析\n\n## 改进建议\n- 按优先级分类的建议列表\n\n分析输入：{performance_analysis}`,
                    output: 'final_report',
                    tools_required: ['write_to_file']
                }
            ],

            output: {
                format: 'markdown',
                sections: [
                    'executive_summary',
                    'detailed_analysis',
                    'issues_list',
                    'improvement_plan'
                ],
                output_directory: './reports/'
            },

            config: {
                analysis_depth: 'comprehensive',
                include_examples: true,
                max_file_size: '1MB',
                timeout: '30m'
            },

            metadata: {
                created: new Date().toISOString().split('T')[0],
                updated: new Date().toISOString().split('T')[0],
                compatible_versions: ['0.1.0+'],
                supported_languages: [config.language]
            }
        };

        const yamlContent = SimpleYamlGenerator.stringify(yamlConfig, { indent: 2 });
        
        // 保存到文件
        const fileName = `${language.toLowerCase()}-coding-standards-analysis.yaml`;
        const filePath = outputPath || path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd(), 'agents', 'presets', fileName);
        
        // 确保目录存在
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, yamlContent, 'utf8');
        
        this.outputChannel.appendLine(`✅ YAML配置已保存到: ${filePath}`);
        return filePath;
    }

    /**
     * 生成编码标准检查提示词
     */
    private generateCodingStandardsPrompt(config: LanguageAnalysisConfig): string {
        const rulesText = config.analysisRules.map(rule => 
            `- ${rule.name}: ${rule.description}`
        ).join('\n');
        
        const standardsText = config.codingStandards.map(standard => 
            `- ${standard.name}: ${standard.description}\n  正确示例: ${standard.examples.good}\n  错误示例: ${standard.examples.bad}`
        ).join('\n\n');

        return `分析${config.language}代码的编码规范符合度，重点检查：\n\n## 检查规则\n${rulesText}\n\n## 编码标准\n${standardsText}\n\n分析输入：{project_structure}`;
    }

    /**
     * 生成安全检查提示词
     */
    private generateSecurityPrompt(config: LanguageAnalysisConfig): string {
        const checksText = config.securityChecks.map(check => 
            `- ${check.name} (${check.riskLevel}风险): ${check.description}`
        ).join('\n');

        return `进行${config.language}代码安全性审查，检查：\n\n## 安全检查项\n${checksText}\n\n分析输入：{standards_analysis}`;
    }

    /**
     * 生成性能分析提示词
     */
    private generatePerformancePrompt(config: LanguageAnalysisConfig): string {
        const checksText = config.performanceChecks.map(check => 
            `- ${check.name} (${check.impact}影响): ${check.description}`
        ).join('\n');

        return `分析${config.language}代码的性能问题，重点关注：\n\n## 性能检查项\n${checksText}\n\n分析输入：{security_review}`;
    }

    /**
     * 获取支持的语言列表
     */
    getSupportedLanguages(): string[] {
        const configLanguages = Array.from(this.languageConfigs.keys());
        const templateLanguages = LanguageTemplates.getSupportedLanguages();
        const extensibleLanguages = languageManager.getSupportedLanguages();
        
        // 合并并去重
        const allLanguages = [...new Set([...configLanguages, ...templateLanguages, ...extensibleLanguages])];
        return allLanguages.sort();
    }

    /**
     * 获取语言配置
     */
    getLanguageConfig(language: string): LanguageAnalysisConfig | undefined {
        const existingConfig = this.languageConfigs.get(language.toLowerCase());
        if (existingConfig) {
            return existingConfig;
        }
        
        // 然后检查可扩展语言管理器
        const extensibleTemplate = languageManager.getTemplate(language);
        if (extensibleTemplate) {
            return this.convertTemplateToConfig(extensibleTemplate);
        }
        
        // 最后尝试从内置模板系统获取
        const template = LanguageTemplates.getTemplate(language);
        if (template) {
            return this.convertTemplateToConfig(template);
        }
        
        return undefined;
    }

    /**
     * 检测项目中的编程语言
     */
    async detectProjectLanguages(workspacePath: string): Promise<string[]> {
        const detectedLanguages: string[] = [];
        
        for (const [language, config] of this.languageConfigs) {
            for (const ext of config.fileExtensions) {
                const files = await vscode.workspace.findFiles(`**/*${ext}`, '**/node_modules/**');
                if (files.length > 0) {
                    detectedLanguages.push(language);
                    break;
                }
            }
        }
        
        return detectedLanguages;
    }

    /**
     * 将语言模板转换为配置格式
     */
    private convertTemplateToConfig(template: LanguageTemplate): LanguageAnalysisConfig {
        return {
            language: template.displayName,
            fileExtensions: template.fileExtensions,
            analysisRules: template.analysisRules.map(rule => ({
                name: rule.name,
                description: rule.description,
                pattern: rule.pattern || '',
                severity: rule.severity,
                category: rule.category
            })),
            codingStandards: template.codingStandards.map(standard => ({
                name: standard.name,
                description: standard.description,
                examples: standard.examples.length > 0 ? {
                    good: standard.examples[0].good,
                    bad: standard.examples[0].bad
                } : {
                    good: '',
                    bad: ''
                }
            })),
            securityChecks: template.securityChecks.map(check => ({
                name: check.name,
                description: check.description,
                pattern: check.patterns?.[0] || '',
                riskLevel: check.riskLevel
            })),
            performanceChecks: template.performanceChecks.map(check => ({
                name: check.name,
                description: check.description,
                pattern: check.patterns?.[0] || '',
                impact: check.impact
            }))
        };
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}