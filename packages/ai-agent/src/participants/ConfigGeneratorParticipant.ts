import * as vscode from 'vscode';
import { DynamicConfigGenerator } from '../yaml/DynamicConfigGenerator';
import { ConfigValidator, ValidationResult, TestResult } from '../validation/ConfigValidator';
import { languageManager, LanguagePlugin } from '../templates/ExtensibleLanguageManager';

/**
 * 配置生成器Chat参与者
 * 通过Copilot Chat交互动态生成YAML分析配置
 */
export class ConfigGeneratorParticipant {
    private configGenerator: DynamicConfigGenerator;
    private outputChannel: vscode.OutputChannel;
    private configValidator: ConfigValidator;

    constructor() {
        this.configGenerator = new DynamicConfigGenerator();
        this.outputChannel = vscode.window.createOutputChannel('AI Agent Hub - Config Generator');
        this.configValidator = new ConfigValidator();
    }

    /**
     * 处理Chat请求
     */
    async handleRequest(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        const prompt = request.prompt.trim();
        
        try {
            // 解析用户意图
            const intent = this.parseUserIntent(prompt);
            
            switch (intent.action) {
                case 'generate':
                    await this.handleGenerateConfig(intent, stream, token);
                    break;
                case 'list':
                    await this.handleListLanguages(stream);
                    break;
                case 'detect':
                    await this.handleDetectLanguages(stream);
                    break;
                case 'validate':
                    await this.handleValidateConfig(intent, stream, token);
                    break;
                case 'test':
                    await this.handleTestConfig(intent, stream, token);
                    break;
                case 'plugins':
                    await this.handlePlugins(stream);
                    break;
                case 'stats':
                    await this.handleStats(stream);
                    break;
                case 'reload':
                    await this.handleReload(stream);
                    break;
                case 'help':
                    await this.handleHelp(stream);
                    break;
                default:
                    await this.handleUnknownIntent(prompt, stream);
                    break;
            }
        } catch (error) {
            stream.markdown(`❌ **错误**: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 解析用户意图
     */
    private parseUserIntent(prompt: string): {
        action: 'generate' | 'list' | 'detect' | 'validate' | 'test' | 'plugins' | 'stats' | 'reload' | 'help' | 'unknown';
        language?: string;
        requirements?: string;
        filePath?: string;
    } {
        const lowerPrompt = prompt.toLowerCase();
        
        // 生成配置
        if (lowerPrompt.includes('生成') || lowerPrompt.includes('创建') || lowerPrompt.includes('generate') || lowerPrompt.includes('create')) {
            const language = this.extractLanguage(prompt);
            const requirements = this.extractRequirements(prompt);
            return { action: 'generate', language, requirements };
        }
        
        // 列出支持的语言
        if (lowerPrompt.includes('支持') || lowerPrompt.includes('语言') || lowerPrompt.includes('list') || lowerPrompt.includes('languages')) {
            return { action: 'list' };
        }
        
        // 检测项目语言
        if (lowerPrompt.includes('检测') || lowerPrompt.includes('识别') || lowerPrompt.includes('detect')) {
            return { action: 'detect' };
        }
        
        // 验证配置
        if (lowerPrompt.includes('验证') || lowerPrompt.includes('validate')) {
            const filePath = this.extractFilePath(prompt);
            return { action: 'validate', filePath };
        }
        
        // 测试配置
        if (lowerPrompt.includes('测试') || lowerPrompt.includes('test')) {
            const filePath = this.extractFilePath(prompt);
            return { action: 'test', filePath };
        }
        
        // 插件管理
        if (lowerPrompt.includes('插件') || lowerPrompt.includes('plugin')) {
            return { action: 'plugins' };
        }
        
        // 统计信息
        if (lowerPrompt.includes('统计') || lowerPrompt.includes('stats')) {
            return { action: 'stats' };
        }
        
        // 重新加载
        if (lowerPrompt.includes('重新加载') || lowerPrompt.includes('reload')) {
            return { action: 'reload' };
        }
        
        // 帮助信息
        if (lowerPrompt.includes('帮助') || lowerPrompt.includes('help') || lowerPrompt.includes('使用') || lowerPrompt.includes('怎么')) {
            return { action: 'help' };
        }
        
        return { action: 'unknown' };
    }

    /**
     * 从提示中提取编程语言
     */
    private extractLanguage(prompt: string): string | undefined {
        const languages = ['java', 'python', 'javascript', 'typescript', 'csharp', 'c#', 'vue', 'react', 'angular', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin'];
        
        for (const lang of languages) {
            if (prompt.toLowerCase().includes(lang)) {
                return lang === 'c#' ? 'csharp' : lang;
            }
        }
        
        return undefined;
    }

    /**
     * 从提示中提取需求描述
     */
    private extractRequirements(prompt: string): string {
        // 提取"要求"、"需要"、"包含"等关键词后的内容
        const patterns = [
            /要求[：:](.*)/,
            /需要[：:](.*)/,
            /包含[：:](.*)/,
            /requirements?[：:]\s*(.*)/i,
            /需求[：:](.*)/
        ];
        
        for (const pattern of patterns) {
            const match = prompt.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        
        return '标准的代码质量分析，包括命名规范、编码标准、安全检查和性能优化建议';
    }

    /**
     * 处理生成配置请求
     */
    private async handleGenerateConfig(
        intent: { language?: string; requirements?: string },
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        if (!intent.language) {
            stream.markdown('🤔 **请指定编程语言**\n\n请告诉我您想为哪种编程语言生成分析配置？\n\n例如："为Java生成代码分析配置"');
            return;
        }

        stream.markdown(`🚀 **开始为 ${intent.language.toUpperCase()} 生成分析配置**\n\n`);
        
        // 检查是否已有内置配置
        const existingConfig = this.configGenerator.getLanguageConfig(intent.language);
        if (existingConfig) {
            stream.markdown(`✅ 发现已有的 ${intent.language.toUpperCase()} 配置，正在生成YAML文件...\n\n`);
            
            try {
                const yamlPath = await this.configGenerator.generateYamlConfig(intent.language);
                stream.markdown(`🎉 **配置生成成功！**\n\n📄 YAML文件已保存到: \`${yamlPath}\`\n\n`);
                
                // 显示配置摘要
                await this.showConfigSummary(existingConfig, stream);
                
                // 询问是否要打开文件
                const openFile = await vscode.window.showInformationMessage(
                    `${intent.language.toUpperCase()} 分析配置已生成`,
                    '打开配置文件',
                    '在Chat中查看'
                );
                
                if (openFile === '打开配置文件') {
                    const doc = await vscode.workspace.openTextDocument(yamlPath);
                    await vscode.window.showTextDocument(doc);
                }
            } catch (error) {
                stream.markdown(`❌ **生成YAML文件失败**: ${error instanceof Error ? error.message : '未知错误'}`);
            }
        } else {
            // 需要通过AI生成新配置
            stream.markdown(`🤖 **正在通过AI生成 ${intent.language.toUpperCase()} 配置...**\n\n`);
            stream.markdown(`📋 **分析要求**: ${intent.requirements}\n\n`);
            
            try {
                // 显示进度
                stream.markdown('⏳ 正在调用Copilot Chat生成配置...\n\n');
                
                const newConfig = await this.configGenerator.generateLanguageConfig(intent.language, intent.requirements || '');
                
                stream.markdown('✅ AI配置生成完成，正在创建YAML文件...\n\n');
                
                const yamlPath = await this.configGenerator.generateYamlConfig(intent.language);
                
                stream.markdown(`🎉 **配置生成成功！**\n\n📄 YAML文件已保存到: \`${yamlPath}\`\n\n`);
                
                // 显示新生成的配置摘要
                await this.showConfigSummary(newConfig, stream);
                
            } catch (error) {
                stream.markdown(`❌ **AI配置生成失败**: ${error instanceof Error ? error.message : '未知错误'}\n\n`);
                stream.markdown('💡 **建议**: 请检查网络连接或稍后重试');
            }
        }
    }

    /**
     * 显示配置摘要
     */
    private async showConfigSummary(config: any, stream: vscode.ChatResponseStream): Promise<void> {
        stream.markdown(`## 📊 配置摘要\n\n`);
        stream.markdown(`**语言**: ${config.language}\n`);
        stream.markdown(`**文件扩展名**: ${config.fileExtensions.join(', ')}\n`);
        stream.markdown(`**分析规则**: ${config.analysisRules.length} 条\n`);
        stream.markdown(`**编码标准**: ${config.codingStandards.length} 项\n`);
        stream.markdown(`**安全检查**: ${config.securityChecks.length} 项\n`);
        stream.markdown(`**性能检查**: ${config.performanceChecks.length} 项\n\n`);
        
        if (config.analysisRules.length > 0) {
            stream.markdown(`### 🔍 主要分析规则\n\n`);
            config.analysisRules.slice(0, 3).forEach((rule: any) => {
                stream.markdown(`- **${rule.name}**: ${rule.description}\n`);
            });
            if (config.analysisRules.length > 3) {
                stream.markdown(`- ... 还有 ${config.analysisRules.length - 3} 条规则\n`);
            }
            stream.markdown('\n');
        }
        
        stream.markdown(`### 🚀 使用方法\n\n`);
        stream.markdown(`1. 在Copilot Chat中输入: \`@analyze ${config.language.toLowerCase()}\`\n`);
        stream.markdown(`2. 或使用命令面板: \`AI Agent Hub: Analyze Self\`\n`);
        stream.markdown(`3. 系统将自动使用生成的配置进行分析\n\n`);
    }

    /**
     * 处理列出支持语言的请求
     */
    private async handleListLanguages(stream: vscode.ChatResponseStream): Promise<void> {
        const supportedLanguages = this.configGenerator.getSupportedLanguages();
        
        stream.markdown(`## 🌐 支持的编程语言\n\n`);
        
        if (supportedLanguages.length > 0) {
            stream.markdown(`### ✅ 内置支持 (${supportedLanguages.length}种)\n\n`);
            supportedLanguages.forEach(lang => {
                const config = this.configGenerator.getLanguageConfig(lang);
                if (config) {
                    stream.markdown(`- **${config.language}** (${config.fileExtensions.join(', ')})\n`);
                }
            });
        }
        
        stream.markdown(`\n### 🤖 AI动态生成\n\n`);
        stream.markdown(`除了内置支持的语言，您还可以通过AI动态生成任何编程语言的分析配置：\n\n`);
        stream.markdown(`- Go\n- Rust\n- PHP\n- Ruby\n- Swift\n- Kotlin\n- Scala\n- 以及更多...\n\n`);
        
        stream.markdown(`### 💡 使用示例\n\n`);
        stream.markdown(`\`\`\`\n`);
        stream.markdown(`为Java生成代码分析配置\n`);
        stream.markdown(`为Python创建配置，要求：包含PEP8规范检查\n`);
        stream.markdown(`生成Go语言配置\n`);
        stream.markdown(`\`\`\`\n`);
    }

    /**
     * 处理检测项目语言的请求
     */
    private async handleDetectLanguages(stream: vscode.ChatResponseStream): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            stream.markdown('❌ **未找到工作区**\n\n请先打开一个项目文件夹');
            return;
        }

        stream.markdown('🔍 **正在检测项目中的编程语言...**\n\n');
        
        try {
            const detectedLanguages = await this.configGenerator.detectProjectLanguages(workspaceFolder.uri.fsPath);
            
            if (detectedLanguages.length > 0) {
                stream.markdown(`✅ **检测到 ${detectedLanguages.length} 种编程语言**\n\n`);
                
                for (const lang of detectedLanguages) {
                    const config = this.configGenerator.getLanguageConfig(lang);
                    if (config) {
                        stream.markdown(`- **${config.language}** ${config.fileExtensions.join(', ')}\n`);
                    }
                }
                
                stream.markdown(`\n### 🚀 快速开始\n\n`);
                stream.markdown(`您可以为检测到的语言生成分析配置：\n\n`);
                
                detectedLanguages.forEach(lang => {
                    stream.markdown(`- 输入: \`为${lang}生成配置\`\n`);
                });
                
            } else {
                stream.markdown('🤔 **未检测到支持的编程语言**\n\n');
                stream.markdown('可能的原因：\n');
                stream.markdown('- 项目中没有代码文件\n');
                stream.markdown('- 使用的语言暂未内置支持\n\n');
                stream.markdown('💡 **建议**: 您可以通过AI动态生成任何语言的配置');
            }
            
        } catch (error) {
            stream.markdown(`❌ **检测失败**: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 处理帮助请求
     */
    private async handleHelp(stream: vscode.ChatResponseStream): Promise<void> {
        stream.markdown(`# 🤖 AI Agent Hub 配置生成器\n\n`);
        stream.markdown(`通过Copilot Chat动态生成代码分析配置，支持多种编程语言。\n\n`);
        
        stream.markdown(`## 🚀 主要功能\n\n`);
        stream.markdown(`- **动态配置生成**: 通过AI为任何编程语言生成分析配置\n`);
        stream.markdown(`- **内置语言支持**: 预置了C#、Java、Python、Vue等常用语言\n`);
        stream.markdown(`- **智能检测**: 自动识别项目中使用的编程语言\n`);
        stream.markdown(`- **YAML输出**: 生成标准的YAML分析配置文件\n\n`);
        
        stream.markdown(`## 💬 使用方法\n\n`);
        stream.markdown(`### 生成配置\n`);
        stream.markdown(`\`\`\`\n`);
        stream.markdown(`为Java生成代码分析配置\n`);
        stream.markdown(`为Python创建配置，要求：包含PEP8规范检查\n`);
        stream.markdown(`生成C#配置\n`);
        stream.markdown(`\`\`\`\n\n`);
        
        stream.markdown(`### 查看支持的语言\n`);
        stream.markdown(`\`\`\`\n`);
        stream.markdown(`支持哪些编程语言？\n`);
        stream.markdown(`列出所有语言\n`);
        stream.markdown(`\`\`\`\n\n`);
        
        stream.markdown(`### 检测项目语言\n`);
        stream.markdown(`\`\`\`\n`);
        stream.markdown(`检测项目中的编程语言\n`);
        stream.markdown(`识别当前项目语言\n`);
        stream.markdown(`\`\`\`\n\n`);
        
        stream.markdown(`## 🎯 配置内容\n\n`);
        stream.markdown(`生成的配置包含：\n`);
        stream.markdown(`- **命名规范检查**: 类名、方法名、变量名等\n`);
        stream.markdown(`- **编码标准**: 代码格式、最佳实践\n`);
        stream.markdown(`- **安全检查**: SQL注入、XSS等安全风险\n`);
        stream.markdown(`- **性能分析**: 性能瓶颈和优化建议\n\n`);
        
        stream.markdown(`## 📝 示例输出\n\n`);
        stream.markdown(`生成的YAML配置可直接用于代码分析：\n`);
        stream.markdown(`\`\`\`yaml\n`);
        stream.markdown(`name: "Java Coding Standards Analysis"\n`);
        stream.markdown(`description: "基于最佳实践分析Java项目"\n`);
        stream.markdown(`steps:\n`);
        stream.markdown(`  - name: "coding_standards_check"\n`);
        stream.markdown(`    prompt: "检查Java命名规范..."\n`);
        stream.markdown(`\`\`\`\n\n`);
        
        stream.markdown(`💡 **提示**: 生成配置后，可在Copilot Chat中使用 \`@analyze [语言]\` 进行分析`);
    }

    /**
     * 处理插件管理请求
     */
    private async handlePlugins(stream: vscode.ChatResponseStream): Promise<void> {
        stream.markdown(`## 🔌 语言插件管理\n\n`);
        
        const plugins = languageManager.getLoadedPlugins();
        
        if (plugins.length > 0) {
            stream.markdown(`### ✅ 已加载插件 (${plugins.length}个)\n\n`);
            plugins.forEach((plugin: LanguagePlugin) => {
                 stream.markdown(`- **${plugin.name}** v${plugin.version}\n`);
                 stream.markdown(`  作者: ${plugin.author}\n`);
                 stream.markdown(`  支持语言: ${plugin.supportedLanguages.join(', ')}\n\n`);
            });
        } else {
            stream.markdown(`📦 **暂无已加载的插件**\n\n`);
        }
        
        stream.markdown(`### 🚀 插件操作\n\n`);
        stream.markdown(`- 输入: \`重新加载插件\` 重新扫描并加载插件\n`);
        stream.markdown(`- 输入: \`统计信息\` 查看语言支持统计\n`);
        stream.markdown(`- 插件目录: \`~/.vscode/extensions/ai-agent-hub/plugins/\`\n\n`);
        
        stream.markdown(`### 📝 插件开发\n\n`);
        stream.markdown(`创建自定义语言插件，支持新的编程语言和分析规则。\n`);
        stream.markdown(`详细文档请参考: [插件开发指南](https://github.com/your-repo/plugin-guide)`);
    }

    /**
     * 处理统计信息请求
     */
    private async handleStats(stream: vscode.ChatResponseStream): Promise<void> {
        stream.markdown(`## 📊 语言支持统计\n\n`);
        
        const builtinLanguages = this.configGenerator.getSupportedLanguages();
        const plugins = languageManager.getLoadedPlugins();
        const pluginLanguages = plugins.flatMap((p: LanguagePlugin) => p.supportedLanguages);
        
        stream.markdown(`### 📈 总体统计\n\n`);
        stream.markdown(`- **内置语言**: ${builtinLanguages.length} 种\n`);
        stream.markdown(`- **插件语言**: ${pluginLanguages.length} 种\n`);
        stream.markdown(`- **已加载插件**: ${plugins.length} 个\n`);
        stream.markdown(`- **总支持语言**: ${builtinLanguages.length + pluginLanguages.length} 种\n\n`);
        
        if (builtinLanguages.length > 0) {
            stream.markdown(`### 🏗️ 内置语言\n\n`);
            builtinLanguages.forEach(lang => {
                const config = this.configGenerator.getLanguageConfig(lang);
                if (config) {
                    stream.markdown(`- **${config.language}** (${config.fileExtensions.join(', ')})\n`);
                }
            });
            stream.markdown(`\n`);
        }
        
        if (pluginLanguages.length > 0) {
            stream.markdown(`### 🔌 插件语言\n\n`);
            plugins.forEach((plugin: LanguagePlugin) => {
                 stream.markdown(`**${plugin.name}**:\n`);
                 plugin.supportedLanguages.forEach((lang: string) => {
                     stream.markdown(`- ${lang}\n`);
                 });
                stream.markdown(`\n`);
            });
        }
        
        stream.markdown(`### 🎯 使用建议\n\n`);
        stream.markdown(`- 对于内置语言，可直接生成配置\n`);
        stream.markdown(`- 对于插件语言，确保相应插件已正确加载\n`);
        stream.markdown(`- 如需支持新语言，可通过AI动态生成或开发插件\n`);
    }

    /**
     * 处理重新加载请求
     */
    private async handleReload(stream: vscode.ChatResponseStream): Promise<void> {
        stream.markdown(`🔄 **正在重新加载语言模板和插件...**\n\n`);
        
        try {
            // 重新加载语言管理器
            await languageManager.reload();
            
            // 重新初始化配置生成器
            this.configGenerator = new DynamicConfigGenerator();
            
            const plugins = languageManager.getLoadedPlugins();
            const builtinLanguages = this.configGenerator.getSupportedLanguages();
            
            stream.markdown(`✅ **重新加载完成**\n\n`);
            stream.markdown(`📊 **加载结果**:\n`);
            stream.markdown(`- 内置语言: ${builtinLanguages.length} 种\n`);
            stream.markdown(`- 加载插件: ${plugins.length} 个\n`);
            stream.markdown(`- 插件语言: ${plugins.flatMap((p: LanguagePlugin) => p.supportedLanguages).length} 种\n\n`);
            
            if (plugins.length > 0) {
                 stream.markdown(`🔌 **已加载插件**:\n`);
                 plugins.forEach((plugin: LanguagePlugin) => {
                     stream.markdown(`- ${plugin.name} v${plugin.version}\n`);
                 });
                stream.markdown(`\n`);
            }
            
            stream.markdown(`🚀 **现在可以使用最新的语言支持进行配置生成**`);
            
        } catch (error) {
            stream.markdown(`❌ **重新加载失败**: ${error instanceof Error ? error.message : '未知错误'}\n\n`);
            stream.markdown(`💡 **建议**: 请检查插件目录和权限设置`);
        }
    }

    /**
     * 处理未知意图
     */
    private async handleUnknownIntent(prompt: string, stream: vscode.ChatResponseStream): Promise<void> {
        stream.markdown(`🤔 **我不太理解您的请求**\n\n`);
        stream.markdown(`您说的是: "${prompt}"\n\n`);
        stream.markdown(`我可以帮您：\n`);
        stream.markdown(`- 🔧 **生成配置**: "为Java生成代码分析配置"\n`);
        stream.markdown(`- 📋 **查看语言**: "支持哪些编程语言？"\n`);
        stream.markdown(`- 🔍 **检测语言**: "检测项目中的编程语言"\n`);
        stream.markdown(`- ✅ **验证配置**: "验证配置文件"\n`);
        stream.markdown(`- 🧪 **测试配置**: "测试配置文件"\n`);
        stream.markdown(`- 🔌 **插件管理**: "管理语言插件"\n`);
        stream.markdown(`- 📊 **统计信息**: "显示语言支持统计"\n`);
        stream.markdown(`- 🔄 **重新加载**: "重新加载插件"\n`);
        stream.markdown(`- ❓ **获取帮助**: "使用帮助"\n\n`);
        stream.markdown(`请尝试重新描述您的需求，或输入"帮助"查看详细使用说明。`);
    }

    /**
     * 从提示中提取文件路径
     */
    private extractFilePath(prompt: string): string | undefined {
        // 提取文件路径的正则表达式
        const patterns = [
            /文件[：:]\s*([^\s]+)/,
            /路径[：:]\s*([^\s]+)/,
            /file[：:]\s*([^\s]+)/i,
            /path[：:]\s*([^\s]+)/i,
            /([^\s]+\.ya?ml)/i
        ];
        
        for (const pattern of patterns) {
            const match = prompt.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        
        return undefined;
    }

    /**
     * 处理验证配置请求
     */
    private async handleValidateConfig(
        intent: { filePath?: string },
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        let filePath = intent.filePath;
        
        if (!filePath) {
            // 尝试查找工作区中的YAML配置文件
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                const yamlFiles = await vscode.workspace.findFiles('**/*.{yml,yaml}', '**/node_modules/**', 10);
                if (yamlFiles.length > 0) {
                    filePath = yamlFiles[0].fsPath;
                    stream.markdown(`🔍 **自动发现配置文件**: \`${filePath}\`\n\n`);
                } else {
                    stream.markdown('❌ **未找到配置文件**\n\n请指定要验证的YAML文件路径');
                    return;
                }
            } else {
                stream.markdown('❌ **未找到工作区**\n\n请先打开一个项目文件夹');
                return;
            }
        }

        stream.markdown(`🔍 **正在验证配置文件**: \`${filePath}\`\n\n`);
        
        try {
            const result = await this.configValidator.validateConfig(filePath);
            
            if (result.isValid) {
                stream.markdown(`✅ **配置验证通过**\n\n`);
                stream.markdown(`📊 **验证结果**:\n`);
                stream.markdown(`- 配置名称: ${result.config?.name || 'N/A'}\n`);
                stream.markdown(`- 步骤数量: ${result.config?.steps?.length || 0}\n`);
                stream.markdown(`- 文件格式: 有效\n\n`);
            } else {
                stream.markdown(`❌ **配置验证失败**\n\n`);
                stream.markdown(`🐛 **发现的问题**:\n\n`);
                
                result.errors.forEach((error, index) => {
                    stream.markdown(`${index + 1}. **${error.type}**: ${error.message}\n`);
                    if (error.path) {
                        stream.markdown(`   路径: \`${error.path}\`\n`);
                    }
                    stream.markdown(`\n`);
                });
                
                if (result.warnings.length > 0) {
                    stream.markdown(`⚠️ **警告信息**:\n\n`);
                    result.warnings.forEach((warning, index) => {
                        stream.markdown(`${index + 1}. ${warning.message}\n`);
                    });
                }
            }
            
        } catch (error) {
            stream.markdown(`❌ **验证过程出错**: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 处理测试配置请求
     */
    private async handleTestConfig(
        intent: { filePath?: string },
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        let filePath = intent.filePath;
        
        if (!filePath) {
            // 尝试查找工作区中的YAML配置文件
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                const yamlFiles = await vscode.workspace.findFiles('**/*.{yml,yaml}', '**/node_modules/**', 10);
                if (yamlFiles.length > 0) {
                    filePath = yamlFiles[0].fsPath;
                    stream.markdown(`🔍 **自动发现配置文件**: \`${filePath}\`\n\n`);
                } else {
                    stream.markdown('❌ **未找到配置文件**\n\n请指定要测试的YAML文件路径');
                    return;
                }
            } else {
                stream.markdown('❌ **未找到工作区**\n\n请先打开一个项目文件夹');
                return;
            }
        }

        stream.markdown(`🧪 **正在测试配置文件**: \`${filePath}\`\n\n`);
        
        try {
            const result = await this.configValidator.testConfig(filePath);
            
            stream.markdown(`📊 **测试结果**\n\n`);
            stream.markdown(`- **总体状态**: ${result.success ? '✅ 通过' : '❌ 失败'}\n`);
            stream.markdown(`- **执行时间**: ${result.executionTime}ms\n`);
            stream.markdown(`- **测试步骤**: ${result.stepResults.length}\n\n`);
            
            if (result.stepResults.length > 0) {
                stream.markdown(`### 📋 步骤详情\n\n`);
                
                result.stepResults.forEach((stepResult, index) => {
                    const status = stepResult.success ? '✅' : '❌';
                    stream.markdown(`${index + 1}. ${status} **${stepResult.stepName}**\n`);
                    
                    if (stepResult.output) {
                        stream.markdown(`   输出: ${stepResult.output.substring(0, 100)}${stepResult.output.length > 100 ? '...' : ''}\n`);
                    }
                    
                    if (stepResult.error) {
                        stream.markdown(`   错误: ${stepResult.error}\n`);
                    }
                    
                    stream.markdown(`   耗时: ${stepResult.executionTime}ms\n\n`);
                });
            }
            
            if (!result.success && result.error) {
                stream.markdown(`🐛 **错误详情**: ${result.error}\n\n`);
            }
            
            // 提供改进建议
            if (!result.success) {
                stream.markdown(`💡 **改进建议**:\n`);
                stream.markdown(`- 检查配置文件语法是否正确\n`);
                stream.markdown(`- 确认所有必需的字段都已填写\n`);
                stream.markdown(`- 验证提示词是否清晰明确\n`);
                stream.markdown(`- 检查文件路径和权限设置\n`);
            }
            
        } catch (error) {
            stream.markdown(`❌ **测试过程出错**: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.configGenerator.dispose();
        this.outputChannel.dispose();
        this.configValidator.dispose();
    }
}