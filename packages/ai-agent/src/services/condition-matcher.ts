/**
 * 条件匹配器服务
 * 提供灵活的条件匹配功能，替代硬编码的字符串匹配逻辑
 */

/**
 * 匹配条件定义
 */
export interface MatchCondition {
  /** 条件ID */
  id: string;
  /** 条件名称 */
  name: string;
  /** 匹配类型 */
  type: 'keyword' | 'regex' | 'semantic' | 'composite';
  /** 匹配配置 */
  config: KeywordConfig | RegexConfig | SemanticConfig | CompositeConfig;
  /** 权重 */
  weight?: number;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 关键词匹配配置
 */
export interface KeywordConfig {
  /** 关键词列表 */
  keywords: string[];
  /** 是否忽略大小写 */
  ignoreCase?: boolean;
  /** 匹配模式 */
  mode: 'any' | 'all' | 'exact';
  /** 同义词映射 */
  synonyms?: Record<string, string[]>;
}

/**
 * 正则表达式匹配配置
 */
export interface RegexConfig {
  /** 正则表达式模式 */
  pattern: string;
  /** 正则表达式标志 */
  flags?: string;
}

/**
 * 语义匹配配置
 */
export interface SemanticConfig {
  /** 语义类别 */
  category: string;
  /** 相关概念 */
  concepts: string[];
  /** 最小相似度阈值 */
  threshold?: number;
}

/**
 * 复合条件配置
 */
export interface CompositeConfig {
  /** 子条件 */
  conditions: MatchCondition[];
  /** 逻辑操作符 */
  operator: 'and' | 'or' | 'not';
}

/**
 * 匹配结果
 */
export interface MatchResult {
  /** 是否匹配 */
  matched: boolean;
  /** 匹配得分 */
  score: number;
  /** 匹配的条件 */
  condition?: MatchCondition;
  /** 匹配详情 */
  details?: MatchDetails;
}

/**
 * 匹配详情
 */
export interface MatchDetails {
  /** 匹配的关键词 */
  matchedKeywords?: string[];
  /** 匹配的位置 */
  positions?: number[];
  /** 匹配的文本片段 */
  fragments?: string[];
  /** 额外信息 */
  metadata?: Record<string, any>;
}

/**
 * 条件匹配器
 */
export class ConditionMatcher {
  private static instance: ConditionMatcher;
  private conditions: Map<string, MatchCondition> = new Map();
  private categoryConditions: Map<string, MatchCondition[]> = new Map();

  private constructor() {
    this.initializeDefaultConditions();
  }

  public static getInstance(): ConditionMatcher {
    if (!ConditionMatcher.instance) {
      ConditionMatcher.instance = new ConditionMatcher();
    }
    return ConditionMatcher.instance;
  }

  /**
   * 初始化默认条件
   */
  private initializeDefaultConditions(): void {
    // 帮助相关条件
    this.addCondition({
      id: 'help_request',
      name: '帮助请求',
      type: 'keyword',
      config: {
        keywords: ['帮助', 'help', '使用', 'usage', '如何', 'how', '指南', 'guide', '怎么'],
        ignoreCase: true,
        mode: 'any',
      },
      weight: 1.0,
    });

    // 生成相关条件
    this.addCondition({
      id: 'generate_request',
      name: '生成请求',
      type: 'keyword',
      config: {
        keywords: ['生成', '创建', 'generate', 'create', '制作', 'make'],
        ignoreCase: true,
        mode: 'any',
      },
      weight: 1.0,
    });

    // 分析相关条件
    this.addCondition({
      id: 'analysis_request',
      name: '分析请求',
      type: 'keyword',
      config: {
        keywords: ['分析', 'analyze', '检查', 'check', '审查', 'review', '扫描', 'scan'],
        ignoreCase: true,
        mode: 'any',
      },
      weight: 1.0,
    });

    // 列表相关条件
    this.addCondition({
      id: 'list_request',
      name: '列表请求',
      type: 'keyword',
      config: {
        keywords: ['列表', 'list', '显示', 'show', '查看', 'view', '所有', 'all'],
        ignoreCase: true,
        mode: 'any',
      },
      weight: 1.0,
    });

    // 优先级相关条件
    this.addCondition({
      id: 'high_priority',
      name: '高优先级',
      type: 'keyword',
      config: {
        keywords: ['高优先级', 'high priority', 'high', '紧急', 'urgent', '重要', 'important'],
        ignoreCase: true,
        mode: 'any',
      },
      weight: 1.0,
    });

    this.addCondition({
      id: 'medium_priority',
      name: '中优先级',
      type: 'keyword',
      config: {
        keywords: ['中优先级', 'medium priority', 'medium', '普通', 'normal'],
        ignoreCase: true,
        mode: 'any',
      },
      weight: 1.0,
    });

    this.addCondition({
      id: 'low_priority',
      name: '低优先级',
      type: 'keyword',
      config: {
        keywords: ['低优先级', 'low priority', 'low', '次要', 'minor'],
        ignoreCase: true,
        mode: 'any',
      },
      weight: 1.0,
    });

    // 测试模式条件
    this.addCondition({
      id: 'quick_test',
      name: '快速测试',
      type: 'keyword',
      config: {
        keywords: ['快速', 'quick', '简单', 'simple', '基本', 'basic'],
        ignoreCase: true,
        mode: 'any',
      },
      weight: 1.0,
    });

    this.addCondition({
      id: 'deep_test',
      name: '深度测试',
      type: 'keyword',
      config: {
        keywords: ['深度', 'deep', '详细', 'detailed', '完整', 'complete', '全面', 'comprehensive'],
        ignoreCase: true,
        mode: 'any',
      },
      weight: 1.0,
    });
  }

  /**
   * 添加条件
   */
  public addCondition(condition: MatchCondition): void {
    this.conditions.set(condition.id, condition);

    // 按类别分组
    const category = this.extractCategory(condition);
    if (!this.categoryConditions.has(category)) {
      this.categoryConditions.set(category, []);
    }
    this.categoryConditions.get(category)!.push(condition);
  }

  /**
   * 提取条件类别
   */
  private extractCategory(condition: MatchCondition): string {
    if (condition.id.includes('help')) return 'help';
    if (condition.id.includes('generate')) return 'generate';
    if (condition.id.includes('analysis')) return 'analysis';
    if (condition.id.includes('list')) return 'list';
    if (condition.id.includes('priority')) return 'priority';
    if (condition.id.includes('test')) return 'test';
    return 'general';
  }

  /**
   * 匹配单个条件
   */
  public matchCondition(input: string, condition: MatchCondition): MatchResult {
    if (!condition.enabled && condition.enabled !== undefined) {
      return { matched: false, score: 0 };
    }

    switch (condition.type) {
      case 'keyword':
        return this.matchKeyword(input, condition);
      case 'regex':
        return this.matchRegex(input, condition);
      case 'semantic':
        return this.matchSemantic(input, condition);
      case 'composite':
        return this.matchComposite(input, condition);
      default:
        return { matched: false, score: 0 };
    }
  }

  /**
   * 关键词匹配
   */
  private matchKeyword(input: string, condition: MatchCondition): MatchResult {
    const config = condition.config as KeywordConfig;
    const testInput = config.ignoreCase ? input.toLowerCase() : input;
    const keywords = config.keywords.map(k => (config.ignoreCase ? k.toLowerCase() : k));

    const matchedKeywords: string[] = [];
    const positions: number[] = [];

    for (const keyword of keywords) {
      const index = testInput.indexOf(keyword);
      if (index !== -1) {
        matchedKeywords.push(keyword);
        positions.push(index);
      }
    }

    let matched = false;
    let score = 0;

    switch (config.mode) {
      case 'any':
        matched = matchedKeywords.length > 0;
        score = matchedKeywords.length / keywords.length;
        break;
      case 'all':
        matched = matchedKeywords.length === keywords.length;
        score = matched ? 1.0 : matchedKeywords.length / keywords.length;
        break;
      case 'exact':
        matched = keywords.some(k => testInput === k);
        score = matched ? 1.0 : 0;
        break;
    }

    return {
      matched,
      score: score * (condition.weight || 1.0),
      condition,
      details: {
        matchedKeywords,
        positions,
      },
    };
  }

  /**
   * 正则表达式匹配
   */
  private matchRegex(input: string, condition: MatchCondition): MatchResult {
    const config = condition.config as RegexConfig;
    const regex = new RegExp(config.pattern, config.flags || '');
    const match = regex.exec(input);

    return {
      matched: match !== null,
      score: match ? condition.weight || 1.0 : 0,
      condition,
      details: {
        fragments: match ? [match[0]] : [],
        positions: match ? [match.index] : [],
      },
    };
  }

  /**
   * 语义匹配（简化版本）
   */
  private matchSemantic(input: string, condition: MatchCondition): MatchResult {
    const config = condition.config as SemanticConfig;
    const lowerInput = input.toLowerCase();

    // 简单的语义匹配：检查概念词汇的出现
    const matchedConcepts = config.concepts.filter(concept =>
      lowerInput.includes(concept.toLowerCase())
    );

    const score = matchedConcepts.length / config.concepts.length;
    const threshold = config.threshold || 0.3;

    return {
      matched: score >= threshold,
      score: score * (condition.weight || 1.0),
      condition,
      details: {
        matchedKeywords: matchedConcepts,
        metadata: { category: config.category },
      },
    };
  }

  /**
   * 复合条件匹配
   */
  private matchComposite(input: string, condition: MatchCondition): MatchResult {
    const config = condition.config as CompositeConfig;
    const results = config.conditions.map(c => this.matchCondition(input, c));

    let matched = false;
    let score = 0;

    switch (config.operator) {
      case 'and':
        matched = results.every(r => r.matched);
        score = matched ? results.reduce((sum, r) => sum + r.score, 0) / results.length : 0;
        break;
      case 'or':
        matched = results.some(r => r.matched);
        score = Math.max(...results.map(r => r.score));
        break;
      case 'not':
        matched = !results.some(r => r.matched);
        score = matched ? 1.0 : 0;
        break;
    }

    return {
      matched,
      score: score * (condition.weight || 1.0),
      condition,
    };
  }

  /**
   * 匹配多个条件
   */
  public matchConditions(input: string, conditionIds?: string[]): MatchResult[] {
    const targetConditions = conditionIds
      ? (conditionIds.map(id => this.conditions.get(id)).filter(Boolean) as MatchCondition[])
      : Array.from(this.conditions.values());

    return targetConditions
      .map(condition => this.matchCondition(input, condition))
      .filter(result => result.matched)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * 获取最佳匹配
   */
  public getBestMatch(input: string, category?: string): MatchResult | undefined {
    const conditions = category
      ? this.categoryConditions.get(category) || []
      : Array.from(this.conditions.values());

    const results = conditions
      .map(condition => this.matchCondition(input, condition))
      .filter(result => result.matched)
      .sort((a, b) => b.score - a.score);

    return results[0];
  }

  /**
   * 批量加载条件配置
   */
  public loadConditionsFromConfig(conditions: MatchCondition[]): void {
    conditions.forEach(condition => this.addCondition(condition));
  }

  /**
   * 清除所有条件
   */
  public clear(): void {
    this.conditions.clear();
    this.categoryConditions.clear();
    this.initializeDefaultConditions();
  }

  /**
   * 获取所有条件
   */
  public getAllConditions(): MatchCondition[] {
    return Array.from(this.conditions.values());
  }

  /**
   * 获取指定类别的条件
   */
  public getConditionsByCategory(category: string): MatchCondition[] {
    return this.categoryConditions.get(category) || [];
  }
}

// 导出单例实例
export const conditionMatcher = ConditionMatcher.getInstance();
