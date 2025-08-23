/**
 * 可扩展的语言模板管理系统
 * 支持动态加载、插件式注册和外部配置文件
 */

import * as fs from 'fs';
import * as path from 'path';
import { outputManager } from '../utils/output-manager';
// 移除js-yaml依赖，使用内置解析器

/**
 * 简单的YAML解析器和生成器
 * 处理基本的YAML结构，替代js-yaml依赖
 */
class SimpleYamlProcessor {
  static load(content: string): Record<string, unknown> {
    try {
      // 移除注释
      const lines = content
        .split('\n')
        .map(line => {
          const commentIndex = line.indexOf('#');
          if (commentIndex >= 0) {
            return line.substring(0, commentIndex).trim();
          }
          return line.trim();
        })
        .filter(line => line.length > 0);

      const result: Record<string, unknown> = {};
      let currentObject = result;
      const stack: Record<string, unknown>[] = [result];
      let currentIndent = 0;

      for (const line of lines) {
        const indent = line.length - line.trimLeft().length;
        const trimmedLine = line.trim();

        if (trimmedLine.includes(':')) {
          const [key, ...valueParts] = trimmedLine.split(':');
          const value = valueParts.join(':').trim();

          // 处理缩进变化
          if (indent < currentIndent) {
            // 回退到合适的层级
            while (stack.length > 1 && indent < currentIndent) {
              stack.pop();
              currentIndent -= 2;
            }
            currentObject = stack[stack.length - 1];
          }

          if (value) {
            // 处理不同类型的值
            if (value === 'true' || value === 'false') {
              currentObject[key.trim()] = value === 'true';
            } else if (!isNaN(Number(value))) {
              currentObject[key.trim()] = Number(value);
            } else if (value.startsWith('"') && value.endsWith('"')) {
              currentObject[key.trim()] = value.slice(1, -1);
            } else if (value.startsWith('[') && value.endsWith(']')) {
              const arrayContent = value.slice(1, -1);
              currentObject[key.trim()] = arrayContent
                .split(',')
                .map(item => item.trim().replace(/"/g, ''));
            } else {
              currentObject[key.trim()] = value;
            }
          } else {
            // 嵌套对象
            currentObject[key.trim()] = {};
            stack.push(currentObject[key.trim()] as Record<string, unknown>);
            currentObject = currentObject[key.trim()] as Record<string, unknown>;
            currentIndent = indent;
          }
        }
      }

      return result;
    } catch (error) {
      outputManager.logError('YAML解析错误:', error as Error);
      try {
        return JSON.parse(content);
      } catch (_jsonError) {
        throw new Error(`YAML和JSON解析都失败: ${error}`);
      }
    }
  }

  static dump(obj: Record<string, unknown>, options?: { indent?: number }): string {
    const indent = options?.indent || 2;
    return SimpleYamlProcessor.objectToYaml(obj, 0, indent);
  }

  private static objectToYaml(obj: unknown, currentIndent: number, indentSize: number): string {
    if (obj === null || obj === undefined) {
      return 'null';
    }

    if (typeof obj === 'string') {
      // 检查是否需要引号
      if (obj.includes(':') || obj.includes('#') || obj.includes('\n') || obj.trim() !== obj) {
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
      return obj
        .map(item => {
          const spaces = ' '.repeat(currentIndent);
          return `${spaces}- ${SimpleYamlProcessor.objectToYaml(item, currentIndent + indentSize, indentSize)}`;
        })
        .join('\n');
    }

    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) {
        return '{}';
      }

      return entries
        .map(([key, value]) => {
          const spaces = ' '.repeat(currentIndent);
          const valueStr = SimpleYamlProcessor.objectToYaml(
            value,
            currentIndent + indentSize,
            indentSize
          );

          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return `${spaces}${key}:\n${valueStr}`;
          } else {
            return `${spaces}${key}: ${valueStr}`;
          }
        })
        .join('\n');
    }

    return String(obj);
  }
}
import {
  LanguageTemplate,
  // AnalysisRule,
  // CodingStandard,
  // SecurityCheck,
  // PerformanceCheck,
} from './LanguageTemplates';

export interface LanguagePlugin {
  name: string;
  version: string;
  author?: string;
  description?: string;
  supportedLanguages: string[];
  template: LanguageTemplate;
  dependencies?: string[];
  initialize?: () => Promise<void>;
  cleanup?: () => Promise<void>;
  getTemplate?: (language: string) => LanguageTemplate | null;
}

export interface LanguageRegistry {
  languages: {
    [languageId: string]: {
      displayName: string;
      fileExtensions: string[];
      templatePath?: string;
      pluginPath?: string;
      enabled: boolean;
      priority: number;
    };
  };
  plugins: {
    [pluginId: string]: {
      path: string;
      enabled: boolean;
      version: string;
    };
  };
}

export class ExtensibleLanguageManager {
  private static instance: ExtensibleLanguageManager;
  private templates: Map<string, LanguageTemplate> = new Map();
  private plugins: Map<string, LanguagePlugin> = new Map();
  private registry: LanguageRegistry;
  private templateDirectories: string[] = [];
  private pluginDirectories: string[] = [];

  private constructor() {
    this.registry = {
      languages: {},
      plugins: {},
    };
    this.initializeDefaultDirectories();
  }

  static getInstance(): ExtensibleLanguageManager {
    if (!ExtensibleLanguageManager.instance) {
      ExtensibleLanguageManager.instance = new ExtensibleLanguageManager();
    }
    return ExtensibleLanguageManager.instance;
  }

  /**
   * 初始化默认目录
   */
  private initializeDefaultDirectories(): void {
    const baseDir = path.join(__dirname, '..');
    this.templateDirectories = [
      path.join(baseDir, 'templates', 'languages'),
      path.join(baseDir, 'templates', 'custom'),
      path.join(process.cwd(), 'language-templates'),
      path.join(process.env.HOME || process.env.USERPROFILE || '', '.ai-agent-hub', 'templates'),
    ];

    this.pluginDirectories = [
      path.join(baseDir, 'plugins', 'languages'),
      path.join(process.cwd(), 'language-plugins'),
      path.join(process.env.HOME || process.env.USERPROFILE || '', '.ai-agent-hub', 'plugins'),
    ];
  }

  /**
   * 添加模板目录
   */
  addTemplateDirectory(directory: string): void {
    if (!this.templateDirectories.includes(directory)) {
      this.templateDirectories.push(directory);
    }
  }

  /**
   * 添加插件目录
   */
  addPluginDirectory(directory: string): void {
    if (!this.pluginDirectories.includes(directory)) {
      this.pluginDirectories.push(directory);
    }
  }

  /**
   * 加载所有语言模板和插件
   */
  async loadAll(): Promise<void> {
    await this.loadRegistry();
    await this.loadTemplatesFromDirectories();
    await this.loadPluginsFromDirectories();
    this.validateDependencies();
  }

  /**
   * 加载注册表
   */
  private async loadRegistry(): Promise<void> {
    const registryPaths = [
      path.join(__dirname, '..', 'templates', 'registry.yaml'),
      path.join(process.cwd(), 'language-registry.yaml'),
      path.join(
        process.env.HOME || process.env.USERPROFILE || '',
        '.ai-agent-hub',
        'registry.yaml'
      ),
    ];

    for (const registryPath of registryPaths) {
      if (fs.existsSync(registryPath)) {
        try {
          const content = fs.readFileSync(registryPath, 'utf8');
          const registry = SimpleYamlProcessor.load(content) as unknown as LanguageRegistry;
          this.mergeRegistry(registry);
        } catch (error) {
          outputManager.logWarning(`Failed to load registry from ${registryPath}: ${error}`);
        }
      }
    }
  }

  /**
   * 合并注册表
   */
  private mergeRegistry(newRegistry: LanguageRegistry): void {
    Object.assign(this.registry.languages, newRegistry.languages);
    Object.assign(this.registry.plugins, newRegistry.plugins);
  }

  /**
   * 从目录加载模板
   */
  private async loadTemplatesFromDirectories(): Promise<void> {
    for (const directory of this.templateDirectories) {
      if (fs.existsSync(directory)) {
        await this.loadTemplatesFromDirectory(directory);
      }
    }
  }

  /**
   * 从单个目录加载模板
   */
  private async loadTemplatesFromDirectory(directory: string): Promise<void> {
    try {
      const files = fs.readdirSync(directory);
      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          await this.loadTemplateFromFile(path.join(directory, file));
        }
      }
    } catch (error) {
      outputManager.logWarning(`Failed to load templates from directory ${directory}: ${error}`);
    }
  }

  /**
   * 从文件加载模板
   */
  private async loadTemplateFromFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const template = SimpleYamlProcessor.load(content) as unknown as LanguageTemplate;

      if (this.validateTemplate(template)) {
        this.registerTemplate(template);
      }
    } catch (error) {
      outputManager.logWarning(
        `Failed to load template from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 从目录加载插件
   */
  private async loadPluginsFromDirectories(): Promise<void> {
    for (const directory of this.pluginDirectories) {
      if (fs.existsSync(directory)) {
        await this.loadPluginsFromDirectory(directory);
      }
    }
  }

  /**
   * 从单个目录加载插件
   */
  private async loadPluginsFromDirectory(directory: string): Promise<void> {
    try {
      const files = fs.readdirSync(directory);
      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          await this.loadPluginFromFile(path.join(directory, file));
        }
      }
    } catch (error) {
      outputManager.logWarning(
        `Failed to load plugins from directory ${directory}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 从文件加载插件
   */
  private async loadPluginFromFile(filePath: string): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const plugin = require(filePath) as LanguagePlugin;

      if (this.validatePlugin(plugin)) {
        this.registerPlugin(plugin);
      }
    } catch (error) {
      outputManager.logWarning(
        `Failed to load plugin from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 验证模板
   */
  private validateTemplate(template: unknown): template is LanguageTemplate {
    if (!template || typeof template !== 'object') {
      return false;
    }

    const t = template as Record<string, unknown>;
    return (
      typeof t.language === 'string' &&
      typeof t.displayName === 'string' &&
      Array.isArray(t.fileExtensions) &&
      Array.isArray(t.analysisRules) &&
      Array.isArray(t.codingStandards) &&
      Array.isArray(t.securityChecks) &&
      Array.isArray(t.performanceChecks)
    );
  }

  /**
   * 验证插件
   */
  private validatePlugin(plugin: unknown): plugin is LanguagePlugin {
    if (!plugin || typeof plugin !== 'object') {
      return false;
    }

    const p = plugin as Record<string, unknown>;

    // 检查基本属性
    if (typeof p.name !== 'string' || typeof p.version !== 'string') {
      return false;
    }

    // 检查模板
    if (!p.template) {
      return false;
    }

    // 验证模板
    const isValidTemplate = this.validateTemplate(p.template);
    return isValidTemplate;
  }

  /**
   * 验证依赖关系
   */
  private validateDependencies(): void {
    for (const [pluginId, plugin] of this.plugins) {
      if (plugin.dependencies) {
        for (const dependency of plugin.dependencies) {
          if (!this.plugins.has(dependency) && !this.templates.has(dependency)) {
            outputManager.logWarning(`Plugin ${pluginId} has unmet dependency: ${dependency}`);
          }
        }
      }
    }
  }

  /**
   * 注册模板
   */
  registerTemplate(template: LanguageTemplate): void {
    this.templates.set(template.language.toLowerCase(), template);

    // 更新注册表
    this.registry.languages[template.language.toLowerCase()] = {
      displayName: template.displayName,
      fileExtensions: template.fileExtensions,
      enabled: true,
      priority: 100,
    };
  }

  /**
   * 注册插件
   */
  registerPlugin(plugin: LanguagePlugin): void {
    this.plugins.set(plugin.name, plugin);
    this.registerTemplate(plugin.template);

    // 更新注册表
    this.registry.plugins[plugin.name] = {
      path: '',
      enabled: true,
      version: plugin.version,
    };
  }

  /**
   * 获取模板
   */
  getTemplate(language: string): LanguageTemplate | undefined {
    return this.templates.get(language.toLowerCase());
  }

  /**
   * 获取所有支持的语言
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.templates.keys()).filter(lang => {
      const config = this.registry.languages[lang];
      return !config || config.enabled;
    });
  }

  /**
   * 获取已加载的插件列表
   */
  getLoadedPlugins(): LanguagePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 重新加载所有语言模板和插件
   */
  async reload(): Promise<void> {
    // 清空现有注册表
    this.templates.clear();
    this.plugins.clear();
    this.registry = {
      languages: {},
      plugins: {},
    };

    // 重新加载
    await this.loadAll();
  }

  /**
   * 获取语言详细信息
   */
  getLanguageInfo(
    language: string
  ): { template: LanguageTemplate; config: Record<string, unknown> } | undefined {
    const template = this.getTemplate(language);
    const config = this.registry.languages[language.toLowerCase()];

    if (template) {
      return { template, config };
    }
    return undefined;
  }

  /**
   * 启用/禁用语言
   */
  setLanguageEnabled(language: string, enabled: boolean): void {
    const config = this.registry.languages[language.toLowerCase()];
    if (config) {
      config.enabled = enabled;
    }
  }

  /**
   * 创建新的语言模板
   */
  createLanguageTemplate(config: {
    language: string;
    displayName: string;
    fileExtensions: string[];
    baseTemplate?: string;
  }): LanguageTemplate {
    let baseTemplate: LanguageTemplate | undefined;

    if (config.baseTemplate) {
      baseTemplate = this.getTemplate(config.baseTemplate);
    }

    const template: LanguageTemplate = {
      language: config.language,
      displayName: config.displayName,
      fileExtensions: config.fileExtensions,
      analysisRules: baseTemplate?.analysisRules || [],
      codingStandards: baseTemplate?.codingStandards || [],
      securityChecks: baseTemplate?.securityChecks || [],
      performanceChecks: baseTemplate?.performanceChecks || [],
    };

    return template;
  }

  /**
   * 保存模板到文件
   */
  async saveTemplate(template: LanguageTemplate, directory?: string): Promise<string> {
    const targetDir = directory || this.templateDirectories[1]; // 使用custom目录

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, `${template.language}.yaml`);
    const content = SimpleYamlProcessor.dump(template as unknown as Record<string, unknown>, {
      indent: 2,
    });

    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * 保存注册表
   */
  async saveRegistry(directory?: string): Promise<string> {
    const targetDir = directory || path.join(__dirname, '..', 'templates');

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, 'registry.yaml');
    const content = SimpleYamlProcessor.dump(this.registry as unknown as Record<string, unknown>, {
      indent: 2,
    });

    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    totalLanguages: number;
    enabledLanguages: number;
    totalPlugins: number;
    enabledPlugins: number;
    templateDirectories: string[];
    pluginDirectories: string[];
  } {
    const enabledLanguages = this.getSupportedLanguages().length;
    const enabledPlugins = Array.from(this.plugins.values()).filter(
      plugin => this.registry.plugins[plugin.name]?.enabled !== false
    ).length;

    return {
      totalLanguages: this.templates.size,
      enabledLanguages,
      totalPlugins: this.plugins.size,
      enabledPlugins,
      templateDirectories: this.templateDirectories,
      pluginDirectories: this.pluginDirectories,
    };
  }
}

// 导出单例实例
export const languageManager = ExtensibleLanguageManager.getInstance();
