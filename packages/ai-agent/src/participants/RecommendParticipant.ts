import * as vscode from 'vscode';
import { SelfProjectScanAgent, Recommendation } from '../agents/SelfProjectScanAgent';
import { OptimizedSelfProjectScanAgent } from '../agents/OptimizedSelfProjectScanAgent';
import {
  EnhancedIntelligentParticipant,
  EnhancedParticipantConfig,
} from './base/enhanced-intelligent-participant';
import { ExecutionFlow } from './base/intelligent-participant';
import { FlowSelectionRule } from '../services/flow-selector';
import { MatchCondition } from '../services/condition-matcher';
import { ResponseTemplate } from '../services/response-template-manager';
import { UserIntentAnalysis } from '../services/intelligent-input-analyzer';
import { outputManager } from '../utils/output-manager';

/**
 * 推荐建议查看Chat参与者
 * 使用GPT-4.1智能分析用户输入，提供项目推荐建议的查看和管理功能
 */
export class RecommendParticipant extends EnhancedIntelligentParticipant {
  private agent: SelfProjectScanAgent;
  private optimizedAgent: OptimizedSelfProjectScanAgent;
  private lastRecommendations: Recommendation[] = [];

  constructor() {
    const config: EnhancedParticipantConfig = {
      id: 'recommend',
      name: '推荐建议查看',
      description:
        '推荐建议查看Chat参与者，使用GPT-4.1智能分析用户输入，提供项目推荐建议的查看和管理功能',
      defaultFlowId: 'list_recommendations',
      enableIntelligentAnalysis: true,
      enableResponseTemplates: true,
      enableConditionMatching: true,
    };

    super(config);
    this.agent = new SelfProjectScanAgent();
    this.optimizedAgent = new OptimizedSelfProjectScanAgent();
    this.initializeFlows();
  }

  /**
   * 初始化执行流程
   */
  protected initializeFlows(): void {
    this.registerFlow({
      name: 'list_recommendations',
      description: '显示所有可用的项目改进推荐建议',
      supportedIntents: ['list', 'show_all', 'view_recommendations'],
      execute: async (
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken,
        analysis: UserIntentAnalysis
      ) => {
        await this.executeListRequest(stream, token);
      },
    });

    this.registerFlow({
      name: 'filter_recommendations',
      description: '根据优先级、类别等条件筛选推荐建议',
      supportedIntents: ['filter', 'search', 'find_specific'],
      execute: async (
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken,
        analysis: UserIntentAnalysis
      ) => {
        await this.executeFilterRequest(request.prompt, stream, token);
      },
    });

    this.registerFlow({
      name: 'detail_recommendation',
      description: '显示特定推荐建议的详细信息和实施步骤',
      supportedIntents: ['detail', 'show_details', 'explain'],
      execute: async (
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken,
        analysis: UserIntentAnalysis
      ) => {
        await this.executeDetailRequest(request.prompt, stream, token);
      },
    });

    this.registerFlow({
      name: 'implement_recommendation',
      description: '提供实施特定推荐建议的指导和代码示例',
      supportedIntents: ['implement', 'apply', 'execute'],
      execute: async (
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken,
        analysis: UserIntentAnalysis
      ) => {
        await this.executeImplementRequest(request.prompt, stream, token);
      },
    });

    this.registerFlow({
      name: 'refresh_recommendations',
      description: '重新扫描项目并更新推荐建议列表',
      supportedIntents: ['refresh', 'update', 'rescan'],
      execute: async (
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken,
        analysis: UserIntentAnalysis
      ) => {
        await this.executeRefreshRequest(stream, token);
      },
    });

    this.registerFlow({
      name: 'help',
      description: '显示推荐参与者的使用帮助',
      supportedIntents: ['help', 'usage', 'guide'],
      execute: async (
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken,
        analysis: UserIntentAnalysis
      ) => {
        await this.executeHelpRequest(stream);
      },
    });

    this.setDefaultFlow('list_recommendations');

    // 注册自定义条件和流程规则
    this.registerDefaultConditions();
    this.registerDefaultFlowRules();
    this.registerDefaultResponseTemplates();
  }

  /**
   * 注册默认条件
   */
  protected registerDefaultConditions(): void {
    super.registerDefaultConditions();

    // 推荐相关的特定条件
    const recommendConditions: MatchCondition[] = [
      {
        id: 'priority_filter',
        name: '优先级筛选',
        type: 'keyword',
        config: {
          keywords: ['高优先级', '中优先级', '低优先级', 'high', 'medium', 'low', 'priority'],
          ignoreCase: true,
          mode: 'any',
        },
      },
      {
        id: 'category_filter',
        name: '类别筛选',
        type: 'keyword',
        config: {
          keywords: [
            '性能',
            '安全',
            '代码质量',
            '依赖',
            'performance',
            'security',
            'quality',
            'dependency',
          ],
          ignoreCase: true,
          mode: 'any',
        },
      },
      {
        id: 'implement_request',
        name: '实施请求',
        type: 'keyword',
        config: {
          keywords: ['实施', '应用', '执行', '运行', 'implement', 'apply', 'execute', 'run'],
          ignoreCase: true,
          mode: 'any',
        },
      },
      {
        id: 'refresh_request',
        name: '刷新请求',
        type: 'keyword',
        config: {
          keywords: ['刷新', '更新', '重新扫描', 'refresh', 'update', 'reload', 'scan'],
          ignoreCase: true,
          mode: 'any',
        },
      },
    ];

    recommendConditions.forEach(condition => {
      this.conditionMatcher.addCondition(condition);
    });
  }

  /**
   * 注册默认流程选择规则
   */
  protected registerDefaultFlowRules(): void {
    const rules: FlowSelectionRule[] = [
      {
        id: 'filter_by_priority',
        name: '按优先级筛选',
        flowId: 'filter_recommendations',
        conditions: ['priority_filter'],
        priority: 95,
        enabled: true,
        description: '当用户提到优先级时筛选推荐',
      },
      {
        id: 'filter_by_category',
        name: '按类别筛选',
        flowId: 'filter_recommendations',
        conditions: ['category_filter'],
        priority: 90,
        enabled: true,
        description: '当用户提到特定类别时筛选推荐',
      },
      {
        id: 'implement_recommendation',
        name: '实施推荐',
        flowId: 'implement_recommendation',
        conditions: ['implement_request'],
        priority: 100,
        enabled: true,
        description: '当用户要求实施推荐时',
      },
      {
        id: 'refresh_recommendations',
        name: '刷新推荐',
        flowId: 'refresh_recommendations',
        conditions: ['refresh_request'],
        priority: 85,
        enabled: true,
        description: '当用户要求刷新推荐时',
      },
    ];

    rules.forEach(rule => {
      this.flowSelector.addRule(rule);
    });
  }

  /**
   * 注册默认响应模板
   */
  protected registerDefaultResponseTemplates(): void {
    const templates: ResponseTemplate[] = [
      {
        id: 'no_recommendations',
        name: '无推荐建议模板',
        content: 'ℹ️ 当前没有推荐建议。请先运行项目分析以生成建议。',
        variables: [],
        category: 'info',
      },
      {
        id: 'recommendations_summary',
        name: '推荐建议摘要模板',
        content: '📋 **项目推荐建议列表** (共 {{count}} 条)\n\n{{summary}}',
        variables: ['count', 'summary'],
        category: 'success',
      },
      {
        id: 'filter_no_results',
        name: '筛选无结果模板',
        content:
          '🔍 没有找到符合条件的推荐建议。\n\n**可用的筛选条件:**\n- 优先级: `高优先级`、`中优先级`、`低优先级`\n- 分类: `critical-fix`、`performance`、`security`、`quality`、`feature`、`documentation`\n- 工作量: `low`、`medium`、`high`',
        variables: [],
        category: 'warning',
      },
      {
        id: 'recommendation_not_found',
        name: '推荐建议未找到模板',
        content: '❌ 未找到指定的推荐建议。\n\n**可用的建议:**\n{{available_recommendations}}',
        variables: ['available_recommendations'],
        category: 'error',
      },
      {
        id: 'refresh_success',
        name: '刷新成功模板',
        content: '✅ **刷新完成！** 发现 {{count}} 条推荐建议\n\n{{stats}}',
        variables: ['count', 'stats'],
        category: 'success',
      },
    ];

    templates.forEach(template => {
      this.responseTemplateManager.addTemplate(template);
    });
  }

  /**
   * 执行列表请求
   */
  private async executeListRequest(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('🔍 **正在获取项目推荐建议...**\n\n');

    try {
      // 获取最新的推荐建议
      await this.refreshRecommendations(token);

      if (this.lastRecommendations.length === 0) {
        const noRecsResponse = this.generateResponse('no_recommendations');
        stream.markdown(noRecsResponse);
        return;
      }

      // 按优先级分组显示
      const groupedRecommendations = this.groupRecommendationsByPriority(this.lastRecommendations);
      const summary = this.generateRecommendationsSummary(groupedRecommendations);

      const listResponse = this.generateResponse('recommendations_summary', {
        count: this.lastRecommendations.length.toString(),
        summary: summary,
      });

      stream.markdown(listResponse);
      stream.markdown('\n💡 **提示**: 使用 `@recommend 详情 [标题]` 查看具体实施步骤\n');
      stream.markdown('🔧 **提示**: 使用 `@recommend 筛选 [条件]` 按条件筛选建议\n');
    } catch (error: any) {
      stream.markdown(`❌ 获取推荐建议失败: ${error.message}`);
    }
  }

  /**
   * 生成推荐建议摘要
   */
  private generateRecommendationsSummary(
    groupedRecommendations: Record<string, Recommendation[]>
  ): string {
    let summary = '';

    for (const [priority, recommendations] of Object.entries(groupedRecommendations)) {
      if (recommendations.length === 0) continue;

      const priorityEmoji = this.getPriorityEmoji(priority as any);
      const priorityName = this.getPriorityName(priority as any);

      summary += `### ${priorityEmoji} ${priorityName} (${recommendations.length} 条)\n\n`;

      recommendations.forEach((rec, index) => {
        const categoryEmoji = this.getCategoryEmoji(rec.category);
        summary += `${index + 1}. ${categoryEmoji} **${rec.title}**\n`;
        summary += `   - 分类: ${rec.category}\n`;
        summary += `   - 影响: ${rec.impact}\n`;
        summary += `   - 工作量: ${rec.effort}\n\n`;
      });
    }

    return summary;
  }

  /**
   * 执行筛选请求
   */
  private async executeFilterRequest(
    prompt: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('🔍 **正在筛选推荐建议...**\n\n');

    try {
      // 确保有推荐建议数据
      if (this.lastRecommendations.length === 0) {
        await this.refreshRecommendations(token);
      }

      if (this.lastRecommendations.length === 0) {
        const noRecsResponse = this.generateResponse('no_recommendations');
        stream.markdown(noRecsResponse);
        return;
      }

      // 使用条件匹配解析筛选条件
      const filteredRecommendations = this.filterRecommendationsWithMatcher(
        prompt,
        this.lastRecommendations
      );

      if (filteredRecommendations.length === 0) {
        const noResultsResponse = this.generateResponse('filter_no_results');
        stream.markdown(noResultsResponse);
        return;
      }

      // 显示筛选结果
      const groupedRecommendations = this.groupRecommendationsByPriority(filteredRecommendations);
      const summary = this.generateRecommendationsSummary(groupedRecommendations);

      stream.markdown(`📋 **筛选结果** (共 ${filteredRecommendations.length} 条)\n\n`);
      stream.markdown(summary);
    } catch (error: any) {
      outputManager.logError(
        '筛选推荐建议失败',
        error instanceof Error ? error : new Error(String(error))
      );
      const errorResponse = this.generateResponse(
        'error',
        {
          error: '筛选推荐建议失败',
          participant: this.config.name,
        },
        `❌ 筛选推荐建议失败: ${error.message}`
      );
      stream.markdown(errorResponse);
    }
  }

  /**
   * 使用条件匹配器筛选推荐建议
   */
  private filterRecommendationsWithMatcher(
    prompt: string,
    recommendations: Recommendation[]
  ): Recommendation[] {
    // 检查优先级条件
    if (this.checkCondition(prompt, 'priority_filter')) {
      const lowerPrompt = prompt.toLowerCase();
      if (lowerPrompt.includes('高') || lowerPrompt.includes('high')) {
        return recommendations.filter(r => r.priority === 'high');
      } else if (lowerPrompt.includes('中') || lowerPrompt.includes('medium')) {
        return recommendations.filter(r => r.priority === 'medium');
      } else if (lowerPrompt.includes('低') || lowerPrompt.includes('low')) {
        return recommendations.filter(r => r.priority === 'low');
      }
    }

    // 检查类别条件
    if (this.checkCondition(prompt, 'category_filter')) {
      return this.filterRecommendations(prompt, recommendations);
    }

    // 如果没有匹配的条件，使用原有的筛选逻辑
    return this.filterRecommendations(prompt, recommendations);
  }

  /**
   * 执行详情请求
   */
  private async executeDetailRequest(
    prompt: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    try {
      // 确保有推荐建议数据
      if (this.lastRecommendations.length === 0) {
        await this.refreshRecommendations(token);
      }

      if (this.lastRecommendations.length === 0) {
        stream.markdown('ℹ️ 当前没有推荐建议。请先运行项目分析以生成建议。');
        return;
      }

      // 提取建议标题或索引
      const targetRecommendation = this.findRecommendationFromPrompt(
        prompt,
        this.lastRecommendations
      );

      if (!targetRecommendation) {
        stream.markdown('❌ 未找到指定的推荐建议。\n\n');
        stream.markdown('**可用的建议:**\n');
        this.lastRecommendations.forEach((rec, index) => {
          stream.markdown(`${index + 1}. ${rec.title}\n`);
        });
        return;
      }

      // 显示详细信息
      const priorityEmoji = this.getPriorityEmoji(targetRecommendation.priority);
      const categoryEmoji = this.getCategoryEmoji(targetRecommendation.category);

      stream.markdown(`# ${priorityEmoji} ${categoryEmoji} ${targetRecommendation.title}\n\n`);

      stream.markdown(`**📝 描述**: ${targetRecommendation.description}\n\n`);
      stream.markdown(`**🎯 影响**: ${targetRecommendation.impact}\n\n`);
      stream.markdown(`**⚡ 工作量**: ${targetRecommendation.effort}\n\n`);
      stream.markdown(`**📂 分类**: ${targetRecommendation.category}\n\n`);
      stream.markdown(`**🔥 优先级**: ${targetRecommendation.priority}\n\n`);

      if (targetRecommendation.files && targetRecommendation.files.length > 0) {
        stream.markdown(`**📁 相关文件**:\n`);
        targetRecommendation.files.forEach(file => {
          stream.markdown(`- \`${file}\`\n`);
        });
        stream.markdown('\n');
      }

      if (targetRecommendation.implementation && targetRecommendation.implementation.length > 0) {
        stream.markdown(`**🔧 实施步骤**:\n`);
        targetRecommendation.implementation.forEach((step, index) => {
          stream.markdown(`${index + 1}. ${step}\n`);
        });
        stream.markdown('\n');
      }

      stream.markdown('💡 **提示**: 使用 `@recommend 实施 [标题]` 获取具体的实施指导\n');
    } catch (error: any) {
      stream.markdown(`❌ 获取建议详情失败: ${error.message}`);
    }
  }

  /**
   * 执行实施请求
   */
  private async executeImplementRequest(
    prompt: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    try {
      // 确保有推荐建议数据
      if (this.lastRecommendations.length === 0) {
        await this.refreshRecommendations(token);
      }

      if (this.lastRecommendations.length === 0) {
        stream.markdown('ℹ️ 当前没有推荐建议。请先运行项目分析以生成建议。');
        return;
      }

      // 提取建议标题或索引
      const targetRecommendation = this.findRecommendationFromPrompt(
        prompt,
        this.lastRecommendations
      );

      if (!targetRecommendation) {
        stream.markdown('❌ 未找到指定的推荐建议。请指定要实施的建议标题或编号。');
        return;
      }

      const priorityEmoji = this.getPriorityEmoji(targetRecommendation.priority);
      const categoryEmoji = this.getCategoryEmoji(targetRecommendation.category);

      stream.markdown(
        `# 🔧 实施指导: ${priorityEmoji} ${categoryEmoji} ${targetRecommendation.title}\n\n`
      );

      stream.markdown(`**📋 实施前准备**:\n`);
      stream.markdown(`- 确保已备份相关文件\n`);
      stream.markdown(`- 预估工作量: ${targetRecommendation.effort}\n`);
      stream.markdown(`- 预期影响: ${targetRecommendation.impact}\n\n`);

      if (targetRecommendation.files && targetRecommendation.files.length > 0) {
        stream.markdown(`**📁 需要修改的文件**:\n`);
        targetRecommendation.files.forEach(file => {
          stream.markdown(`- \`${file}\`\n`);
        });
        stream.markdown('\n');
      }

      if (targetRecommendation.implementation && targetRecommendation.implementation.length > 0) {
        stream.markdown(`**🔧 详细实施步骤**:\n`);
        targetRecommendation.implementation.forEach((step, index) => {
          stream.markdown(`### 步骤 ${index + 1}\n`);
          stream.markdown(`${step}\n\n`);
        });
      } else {
        stream.markdown(`**🔧 实施建议**:\n`);
        stream.markdown(`${targetRecommendation.description}\n\n`);
        stream.markdown(
          `**💡 提示**: 这是一个通用建议，具体实施方法可能需要根据项目情况调整。\n\n`
        );
      }

      stream.markdown(`**✅ 实施后验证**:\n`);
      stream.markdown(`- 运行相关测试确保功能正常\n`);
      stream.markdown(`- 检查是否达到预期效果\n`);
      stream.markdown(`- 考虑是否需要更新文档\n\n`);

      stream.markdown('🔄 **提示**: 使用 `@recommend 刷新` 重新分析项目以查看改进效果\n');
    } catch (error: any) {
      stream.markdown(`❌ 获取实施指导失败: ${error.message}`);
    }
  }

  /**
   * 执行刷新请求
   */
  private async executeRefreshRequest(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('🔄 **正在重新分析项目并刷新推荐建议...**\n\n');

    try {
      // 强制重新分析项目
      await this.refreshRecommendations(token, true);

      if (this.lastRecommendations.length === 0) {
        stream.markdown('✅ 分析完成！当前项目没有发现需要改进的地方。\n\n');
        stream.markdown('🎉 恭喜！您的项目质量很好！');
        return;
      }

      // 显示摘要统计
      const stats = this.getRecommendationStats(this.lastRecommendations);
      const statsText = `**📊 建议统计**:\n- 🔴 高优先级: ${stats.high} 条\n- 🟡 中优先级: ${stats.medium} 条\n- 🟢 低优先级: ${stats.low} 条\n\n**📂 分类分布**:\n${Object.entries(
        stats.categories
      )
        .map(([category, count]) => {
          const emoji = this.getCategoryEmoji(category as any);
          return `- ${emoji} ${category}: ${count} 条`;
        })
        .join('\n')}`;

      const refreshResponse = this.generateResponse('refresh_success', {
        count: this.lastRecommendations.length.toString(),
        stats: statsText,
      });

      stream.markdown(refreshResponse);
      stream.markdown('\n💡 **提示**: 使用 `@recommend 列表` 查看所有建议详情\n');
    } catch (error: any) {
      const errorResponse = this.generateResponse(
        'error',
        {
          error: '刷新推荐建议失败',
          participant: this.config.name,
        },
        `❌ 刷新推荐建议失败: ${error.message}`
      );
      stream.markdown(errorResponse);
    }
  }

  /**
   * 执行帮助请求
   */
  private async executeHelpRequest(stream: vscode.ChatResponseStream): Promise<void> {
    const helpMessage = this.generateHelpMessage();
    stream.markdown(helpMessage);
  }

  /**
   * 生成智能帮助信息
   */
  protected generateHelpMessage(): string {
    return (
      `# 🤖 推荐建议查看助手\n\n` +
      `**📋 基本命令**:\n` +
      `- \`@recommend 列表\` - 查看所有推荐建议\n` +
      `- \`@recommend 筛选 [条件]\` - 按条件筛选建议\n` +
      `- \`@recommend 详情 [标题]\` - 查看建议详细信息\n` +
      `- \`@recommend 实施 [标题]\` - 获取实施指导\n` +
      `- \`@recommend 刷新\` - 重新分析项目\n` +
      `- \`@recommend 帮助\` - 显示此帮助信息\n\n` +
      `**🔍 筛选条件示例**:\n` +
      `- \`@recommend 筛选 高优先级\` - 查看高优先级建议\n` +
      `- \`@recommend 筛选 security\` - 查看安全相关建议\n` +
      `- \`@recommend 筛选 performance\` - 查看性能相关建议\n` +
      `- \`@recommend 筛选 low effort\` - 查看低工作量建议\n\n` +
      `**📂 建议分类**:\n` +
      `- 🚨 \`critical-fix\` - 关键修复\n` +
      `- ⚡ \`performance\` - 性能优化\n` +
      `- 🔒 \`security\` - 安全改进\n` +
      `- 📈 \`quality\` - 代码质量\n` +
      `- ✨ \`feature\` - 功能增强\n` +
      `- 📚 \`documentation\` - 文档改进\n\n` +
      `**🔥 优先级说明**:\n` +
      `- 🔴 \`high\` - 高优先级，建议优先处理\n` +
      `- 🟡 \`medium\` - 中优先级，可以安排处理\n` +
      `- 🟢 \`low\` - 低优先级，有时间时处理\n\n` +
      `**⚡ 工作量评估**:\n` +
      `- \`low\` - 低工作量，通常几分钟到几小时\n` +
      `- \`medium\` - 中等工作量，通常几小时到一天\n` +
      `- \`high\` - 高工作量，通常需要多天\n\n` +
      `**🚀 快速开始**:\n` +
      `1. 使用 \`@recommend 列表\` 查看所有建议\n` +
      `2. 使用 \`@recommend 筛选 高优先级\` 查看重要建议\n` +
      `3. 使用 \`@recommend 详情 [建议标题]\` 了解具体内容\n` +
      `4. 使用 \`@recommend 实施 [建议标题]\` 获取实施指导\n\n` +
      `💡 **提示**: 建议从高优先级和低工作量的建议开始实施，以快速改善项目质量！`
    );
  }

  /**
   * 刷新推荐建议
   */
  private async refreshRecommendations(
    token: vscode.CancellationToken,
    forceRefresh: boolean = false
  ): Promise<void> {
    if (!forceRefresh && this.lastRecommendations.length > 0) {
      return; // 如果已有数据且不强制刷新，直接返回
    }

    try {
      // 使用优化的分析代理
      const analysis = await this.optimizedAgent.scanProject();
      this.lastRecommendations = analysis.recommendations || [];
    } catch (error) {
      // 如果优化代理失败，尝试使用标准代理
      try {
        const analysis = await this.agent.scanProject();
        this.lastRecommendations = analysis.recommendations || [];
      } catch (fallbackError) {
        throw new Error(`无法获取推荐建议: ${fallbackError}`);
      }
    }
  }

  /**
   * 按优先级分组推荐建议
   */
  private groupRecommendationsByPriority(
    recommendations: Recommendation[]
  ): Record<string, Recommendation[]> {
    return {
      high: recommendations.filter(r => r.priority === 'high'),
      medium: recommendations.filter(r => r.priority === 'medium'),
      low: recommendations.filter(r => r.priority === 'low'),
    };
  }

  /**
   * 筛选推荐建议
   */
  private filterRecommendations(
    prompt: string,
    recommendations: Recommendation[]
  ): Recommendation[] {
    const lowerPrompt = prompt.toLowerCase();

    return recommendations.filter(rec => {
      // 优先级筛选
      if (
        lowerPrompt.includes('高优先级') ||
        lowerPrompt.includes('high priority') ||
        lowerPrompt.includes('high')
      ) {
        return rec.priority === 'high';
      }
      if (
        lowerPrompt.includes('中优先级') ||
        lowerPrompt.includes('medium priority') ||
        lowerPrompt.includes('medium')
      ) {
        return rec.priority === 'medium';
      }
      if (
        lowerPrompt.includes('低优先级') ||
        lowerPrompt.includes('low priority') ||
        lowerPrompt.includes('low')
      ) {
        return rec.priority === 'low';
      }

      // 分类筛选
      if (lowerPrompt.includes('critical') || lowerPrompt.includes('关键')) {
        return rec.category === 'critical-fix';
      }
      if (lowerPrompt.includes('performance') || lowerPrompt.includes('性能')) {
        return rec.category === 'performance';
      }
      if (lowerPrompt.includes('security') || lowerPrompt.includes('安全')) {
        return rec.category === 'security';
      }
      if (lowerPrompt.includes('quality') || lowerPrompt.includes('质量')) {
        return rec.category === 'quality';
      }
      if (lowerPrompt.includes('feature') || lowerPrompt.includes('功能')) {
        return rec.category === 'feature';
      }
      if (lowerPrompt.includes('documentation') || lowerPrompt.includes('文档')) {
        return rec.category === 'documentation';
      }

      // 工作量筛选
      if (lowerPrompt.includes('low effort') || lowerPrompt.includes('低工作量')) {
        return rec.effort === 'low';
      }
      if (lowerPrompt.includes('medium effort') || lowerPrompt.includes('中等工作量')) {
        return rec.effort === 'medium';
      }
      if (lowerPrompt.includes('high effort') || lowerPrompt.includes('高工作量')) {
        return rec.effort === 'high';
      }

      return true; // 如果没有匹配的筛选条件，返回所有
    });
  }

  /**
   * 从提示中查找推荐建议
   */
  private findRecommendationFromPrompt(
    prompt: string,
    recommendations: Recommendation[]
  ): Recommendation | null {
    // 尝试通过索引查找
    const indexMatch = prompt.match(/\d+/);
    if (indexMatch) {
      const index = parseInt(indexMatch[0]) - 1;
      if (index >= 0 && index < recommendations.length) {
        return recommendations[index];
      }
    }

    // 尝试通过标题关键词查找
    const lowerPrompt = prompt.toLowerCase();
    return (
      recommendations.find(
        rec =>
          lowerPrompt.includes(rec.title.toLowerCase()) ||
          rec.title
            .toLowerCase()
            .includes(lowerPrompt.replace(/详情|detail|实施|implement|具体|specific/g, '').trim())
      ) || null
    );
  }

  /**
   * 获取推荐建议统计
   */
  private getRecommendationStats(recommendations: Recommendation[]): {
    high: number;
    medium: number;
    low: number;
    categories: Record<string, number>;
  } {
    const stats = {
      high: 0,
      medium: 0,
      low: 0,
      categories: {} as Record<string, number>,
    };

    recommendations.forEach(rec => {
      // 统计优先级
      stats[rec.priority]++;

      // 统计分类
      stats.categories[rec.category] = (stats.categories[rec.category] || 0) + 1;
    });

    return stats;
  }

  /**
   * 获取优先级表情符号
   */
  private getPriorityEmoji(priority: 'high' | 'medium' | 'low'): string {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  }

  /**
   * 获取优先级名称
   */
  private getPriorityName(priority: 'high' | 'medium' | 'low'): string {
    switch (priority) {
      case 'high':
        return '高优先级';
      case 'medium':
        return '中优先级';
      case 'low':
        return '低优先级';
      default:
        return '未知优先级';
    }
  }

  /**
   * 获取分类表情符号
   */
  private getCategoryEmoji(category: string): string {
    switch (category) {
      case 'critical-fix':
        return '🚨';
      case 'performance':
        return '⚡';
      case 'security':
        return '🔒';
      case 'quality':
        return '📈';
      case 'feature':
        return '✨';
      case 'documentation':
        return '📚';
      default:
        return '📋';
    }
  }
}
