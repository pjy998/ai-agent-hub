/**
 * 响应模板管理器
 * 提供可配置的响应模板，减少硬编码逻辑
 */

import * as vscode from 'vscode';

/**
 * 响应模板定义
 */
export interface ResponseTemplate {
  /** 模板ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板内容 */
  content: string;
  /** 变量占位符 */
  variables?: string[];
  /** 条件表达式 */
  condition?: string;
  /** 优先级 */
  priority?: number;
  /** 模板分类 */
  category?: string;
}

/**
 * 条件匹配器
 */
export interface ConditionMatcher {
  /** 匹配类型 */
  type: 'contains' | 'regex' | 'exact' | 'startsWith' | 'endsWith' | 'custom';
  /** 匹配值 */
  value: string | RegExp | ((input: string) => boolean);
  /** 是否忽略大小写 */
  ignoreCase?: boolean;
}

/**
 * 响应规则定义
 */
export interface ResponseRule {
  /** 规则ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 匹配条件 */
  conditions: ConditionMatcher[];
  /** 响应模板ID */
  templateId: string;
  /** 优先级 */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 响应模板管理器
 */
export class ResponseTemplateManager {
  private static instance: ResponseTemplateManager;
  private templates: Map<string, ResponseTemplate> = new Map();
  private rules: Map<string, ResponseRule> = new Map();
  private participantTemplates: Map<string, Map<string, ResponseTemplate>> = new Map();

  private constructor() {
    this.initializeDefaultTemplates();
  }

  public static getInstance(): ResponseTemplateManager {
    if (!ResponseTemplateManager.instance) {
      ResponseTemplateManager.instance = new ResponseTemplateManager();
    }
    return ResponseTemplateManager.instance;
  }

  /**
   * 初始化默认模板
   */
  private initializeDefaultTemplates(): void {
    // 通用错误模板
    this.addTemplate({
      id: 'error_workspace_not_found',
      name: '工作区未找到错误',
      content: '❌ **错误**: 请先打开一个工作区才能使用此功能。',
    });

    this.addTemplate({
      id: 'error_generic',
      name: '通用错误',
      content: '❌ **错误**: {{message}}',
      variables: ['message'],
    });

    // 成功模板
    this.addTemplate({
      id: 'success_generic',
      name: '通用成功',
      content: '✅ **成功**: {{message}}',
      variables: ['message'],
    });

    // 帮助模板
    this.addTemplate({
      id: 'help_header',
      name: '帮助头部',
      content:
        '# 🤖 {{participantName}} 使用指南\n\n{{description}}\n\n## 📋 主要功能\n\n{{features}}',
      variables: ['participantName', 'description', 'features'],
    });

    // 进度模板
    this.addTemplate({
      id: 'progress_start',
      name: '开始进度',
      content: '🚀 **{{action}}**\n\n正在{{description}}...',
      variables: ['action', 'description'],
    });

    this.addTemplate({
      id: 'progress_complete',
      name: '完成进度',
      content: '✅ **{{action}}完成！**\n\n{{summary}}',
      variables: ['action', 'summary'],
    });
  }

  /**
   * 添加模板
   */
  public addTemplate(template: ResponseTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * 为特定参与者添加模板
   */
  public addParticipantTemplate(participantId: string, template: ResponseTemplate): void {
    if (!this.participantTemplates.has(participantId)) {
      this.participantTemplates.set(participantId, new Map());
    }
    this.participantTemplates.get(participantId)!.set(template.id, template);
  }

  /**
   * 添加响应规则
   */
  public addRule(rule: ResponseRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * 获取模板
   */
  public getTemplate(templateId: string, participantId?: string): ResponseTemplate | undefined {
    // 优先查找参与者特定模板
    if (participantId && this.participantTemplates.has(participantId)) {
      const participantTemplate = this.participantTemplates.get(participantId)!.get(templateId);
      if (participantTemplate) {
        return participantTemplate;
      }
    }

    // 查找全局模板
    return this.templates.get(templateId);
  }

  /**
   * 渲染模板
   */
  public renderTemplate(
    templateId: string,
    variables?: Record<string, any>,
    participantId?: string
  ): string {
    const template = this.getTemplate(templateId, participantId);
    if (!template) {
      return `模板 ${templateId} 未找到`;
    }

    let content = template.content;
    const allVariables = { ...variables };

    // 替换变量占位符
    Object.entries(allVariables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(placeholder, String(value));
    });

    return content;
  }

  /**
   * 根据输入匹配响应规则
   */
  public matchRule(input: string, participantId?: string): ResponseRule | undefined {
    const enabledRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of enabledRules) {
      if (this.evaluateConditions(input, rule.conditions)) {
        return rule;
      }
    }

    return undefined;
  }

  /**
   * 评估条件
   */
  private evaluateConditions(input: string, conditions: ConditionMatcher[]): boolean {
    return conditions.every(condition => this.evaluateCondition(input, condition));
  }

  /**
   * 评估单个条件
   */
  private evaluateCondition(input: string, condition: ConditionMatcher): boolean {
    const testInput = condition.ignoreCase ? input.toLowerCase() : input;

    switch (condition.type) {
      case 'contains': {
        const containsValue = condition.ignoreCase
          ? String(condition.value).toLowerCase()
          : String(condition.value);
        return testInput.includes(containsValue);
      }

      case 'regex':
        return condition.value instanceof RegExp ? condition.value.test(input) : false;

      case 'exact': {
        const exactValue = condition.ignoreCase
          ? String(condition.value).toLowerCase()
          : String(condition.value);
        return testInput === exactValue;
      }

      case 'startsWith': {
        const startsValue = condition.ignoreCase
          ? String(condition.value).toLowerCase()
          : String(condition.value);
        return testInput.startsWith(startsValue);
      }

      case 'endsWith': {
        const endsValue = condition.ignoreCase
          ? String(condition.value).toLowerCase()
          : String(condition.value);
        return testInput.endsWith(endsValue);
      }

      case 'custom':
        return typeof condition.value === 'function' ? condition.value(input) : false;

      default:
        return false;
    }
  }

  /**
   * 生成智能响应
   */
  public generateResponse(
    input: string,
    participantId?: string,
    variables?: Record<string, any>
  ): string {
    const rule = this.matchRule(input, participantId);
    if (rule) {
      return this.renderTemplate(rule.templateId, variables, participantId);
    }

    // 返回默认响应
    return this.renderTemplate(
      'help_header',
      {
        participantName: participantId || '智能助手',
        description: '我是您的智能助手，可以帮助您完成各种任务。',
        features: '- 智能分析\n- 自动建议\n- 问题解答',
      },
      participantId
    );
  }

  /**
   * 批量加载模板配置
   */
  public loadTemplatesFromConfig(config: {
    templates?: ResponseTemplate[];
    rules?: ResponseRule[];
    participantTemplates?: Record<string, ResponseTemplate[]>;
  }): void {
    // 加载全局模板
    if (config.templates) {
      config.templates.forEach(template => this.addTemplate(template));
    }

    // 加载规则
    if (config.rules) {
      config.rules.forEach(rule => this.addRule(rule));
    }

    // 加载参与者特定模板
    if (config.participantTemplates) {
      Object.entries(config.participantTemplates).forEach(([participantId, templates]) => {
        templates.forEach(template => this.addParticipantTemplate(participantId, template));
      });
    }
  }

  /**
   * 清除所有模板和规则
   */
  public clear(): void {
    this.templates.clear();
    this.rules.clear();
    this.participantTemplates.clear();
    this.initializeDefaultTemplates();
  }
}

// 导出单例实例
export const responseTemplateManager = ResponseTemplateManager.getInstance();
