import * as vscode from 'vscode';
import { SelfProjectScanAgent, Recommendation } from '../agents/SelfProjectScanAgent';
import { OptimizedSelfProjectScanAgent } from '../agents/OptimizedSelfProjectScanAgent';

/**
 * 推荐建议查看Chat参与者
 * 提供项目推荐建议的查看和管理功能
 */
export class RecommendParticipant {
  private agent: SelfProjectScanAgent;
  private optimizedAgent: OptimizedSelfProjectScanAgent;
  private lastRecommendations: Recommendation[] = [];

  constructor() {
    this.agent = new SelfProjectScanAgent();
    this.optimizedAgent = new OptimizedSelfProjectScanAgent();
  }

  async handleRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    try {
      const prompt = request.prompt.trim();

      // 解析用户意图
      if (this.isListRequest(prompt)) {
        await this.handleListRequest(stream, token);
      } else if (this.isFilterRequest(prompt)) {
        await this.handleFilterRequest(prompt, stream, token);
      } else if (this.isDetailRequest(prompt)) {
        await this.handleDetailRequest(prompt, stream, token);
      } else if (this.isImplementRequest(prompt)) {
        await this.handleImplementRequest(prompt, stream, token);
      } else if (this.isRefreshRequest(prompt)) {
        await this.handleRefreshRequest(stream, token);
      } else if (this.isHelpRequest(prompt)) {
        await this.handleHelpRequest(stream);
      } else {
        await this.handleDefaultRequest(prompt, stream, token);
      }
    } catch (error: any) {
      stream.markdown(`❌ **错误**: ${error.message}`);
    }
  }

  /**
   * 判断是否为列表请求
   */
  private isListRequest(prompt: string): boolean {
    const keywords = ['列表', 'list', '全部', 'all', '显示', 'show', '查看', 'view'];
    return keywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * 判断是否为筛选请求
   */
  private isFilterRequest(prompt: string): boolean {
    const keywords = ['筛选', 'filter', '分类', 'category', '优先级', 'priority', '高优先级', 'high', '中优先级', 'medium', '低优先级', 'low'];
    return keywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * 判断是否为详情请求
   */
  private isDetailRequest(prompt: string): boolean {
    const keywords = ['详情', 'detail', '详细', 'detailed', '具体', 'specific'];
    return keywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * 判断是否为实施请求
   */
  private isImplementRequest(prompt: string): boolean {
    const keywords = ['实施', 'implement', '执行', 'execute', '应用', 'apply', '如何', 'how'];
    return keywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * 判断是否为刷新请求
   */
  private isRefreshRequest(prompt: string): boolean {
    const keywords = ['刷新', 'refresh', '更新', 'update', '重新', 'reload'];
    return keywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * 判断是否为帮助请求
   */
  private isHelpRequest(prompt: string): boolean {
    const keywords = ['帮助', 'help', '使用', 'usage', '如何', 'how', '指南', 'guide'];
    return keywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * 处理列表请求
   */
  private async handleListRequest(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('🔍 **正在获取项目推荐建议...**\n\n');

    try {
      // 获取最新的推荐建议
      await this.refreshRecommendations(token);

      if (this.lastRecommendations.length === 0) {
        stream.markdown('ℹ️ 当前没有推荐建议。请先运行项目分析以生成建议。');
        return;
      }

      stream.markdown(`📋 **项目推荐建议列表** (共 ${this.lastRecommendations.length} 条)\n\n`);

      // 按优先级分组显示
      const groupedRecommendations = this.groupRecommendationsByPriority(this.lastRecommendations);

      for (const [priority, recommendations] of Object.entries(groupedRecommendations)) {
        if (recommendations.length === 0) continue;

        const priorityEmoji = this.getPriorityEmoji(priority as any);
        const priorityName = this.getPriorityName(priority as any);
        
        stream.markdown(`### ${priorityEmoji} ${priorityName} (${recommendations.length} 条)\n\n`);

        recommendations.forEach((rec, index) => {
          const categoryEmoji = this.getCategoryEmoji(rec.category);
          stream.markdown(`${index + 1}. ${categoryEmoji} **${rec.title}**\n`);
          stream.markdown(`   - 分类: ${rec.category}\n`);
          stream.markdown(`   - 影响: ${rec.impact}\n`);
          stream.markdown(`   - 工作量: ${rec.effort}\n\n`);
        });
      }

      stream.markdown('💡 **提示**: 使用 `@recommend 详情 [标题]` 查看具体实施步骤\n');
      stream.markdown('🔧 **提示**: 使用 `@recommend 筛选 [条件]` 按条件筛选建议\n');
    } catch (error: any) {
      stream.markdown(`❌ 获取推荐建议失败: ${error.message}`);
    }
  }

  /**
   * 处理筛选请求
   */
  private async handleFilterRequest(
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
        stream.markdown('ℹ️ 当前没有推荐建议。请先运行项目分析以生成建议。');
        return;
      }

      // 解析筛选条件
      const filteredRecommendations = this.filterRecommendations(prompt, this.lastRecommendations);

      if (filteredRecommendations.length === 0) {
        stream.markdown('🔍 没有找到符合条件的推荐建议。\n\n');
        stream.markdown('**可用的筛选条件:**\n');
        stream.markdown('- 优先级: `高优先级`、`中优先级`、`低优先级`\n');
        stream.markdown('- 分类: `critical-fix`、`performance`、`security`、`quality`、`feature`、`documentation`\n');
        stream.markdown('- 工作量: `low`、`medium`、`high`\n');
        return;
      }

      stream.markdown(`📋 **筛选结果** (共 ${filteredRecommendations.length} 条)\n\n`);

      filteredRecommendations.forEach((rec, index) => {
        const priorityEmoji = this.getPriorityEmoji(rec.priority);
        const categoryEmoji = this.getCategoryEmoji(rec.category);
        
        stream.markdown(`${index + 1}. ${priorityEmoji} ${categoryEmoji} **${rec.title}**\n`);
        stream.markdown(`   - 分类: ${rec.category} | 优先级: ${rec.priority} | 工作量: ${rec.effort}\n`);
        stream.markdown(`   - 描述: ${rec.description}\n`);
        stream.markdown(`   - 影响: ${rec.impact}\n\n`);
      });
    } catch (error: any) {
      stream.markdown(`❌ 筛选推荐建议失败: ${error.message}`);
    }
  }

  /**
   * 处理详情请求
   */
  private async handleDetailRequest(
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
      const targetRecommendation = this.findRecommendationFromPrompt(prompt, this.lastRecommendations);

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
   * 处理实施请求
   */
  private async handleImplementRequest(
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
      const targetRecommendation = this.findRecommendationFromPrompt(prompt, this.lastRecommendations);

      if (!targetRecommendation) {
        stream.markdown('❌ 未找到指定的推荐建议。请指定要实施的建议标题或编号。');
        return;
      }

      const priorityEmoji = this.getPriorityEmoji(targetRecommendation.priority);
      const categoryEmoji = this.getCategoryEmoji(targetRecommendation.category);
      
      stream.markdown(`# 🔧 实施指导: ${priorityEmoji} ${categoryEmoji} ${targetRecommendation.title}\n\n`);
      
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
        stream.markdown(`**💡 提示**: 这是一个通用建议，具体实施方法可能需要根据项目情况调整。\n\n`);
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
   * 处理刷新请求
   */
  private async handleRefreshRequest(
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

      stream.markdown(`✅ **刷新完成！** 发现 ${this.lastRecommendations.length} 条推荐建议\n\n`);

      // 显示摘要统计
      const stats = this.getRecommendationStats(this.lastRecommendations);
      stream.markdown(`**📊 建议统计**:\n`);
      stream.markdown(`- 🔴 高优先级: ${stats.high} 条\n`);
      stream.markdown(`- 🟡 中优先级: ${stats.medium} 条\n`);
      stream.markdown(`- 🟢 低优先级: ${stats.low} 条\n\n`);

      stream.markdown(`**📂 分类分布**:\n`);
      Object.entries(stats.categories).forEach(([category, count]) => {
        const emoji = this.getCategoryEmoji(category as any);
        stream.markdown(`- ${emoji} ${category}: ${count} 条\n`);
      });
      stream.markdown('\n');

      stream.markdown('💡 **提示**: 使用 `@recommend 列表` 查看所有建议详情\n');
    } catch (error: any) {
      stream.markdown(`❌ 刷新推荐建议失败: ${error.message}`);
    }
  }

  /**
   * 处理帮助请求
   */
  private async handleHelpRequest(stream: vscode.ChatResponseStream): Promise<void> {
    stream.markdown(`# 🤖 推荐建议查看助手\n\n`);
    
    stream.markdown(`**📋 基本命令**:\n`);
    stream.markdown(`- \`@recommend 列表\` - 查看所有推荐建议\n`);
    stream.markdown(`- \`@recommend 筛选 [条件]\` - 按条件筛选建议\n`);
    stream.markdown(`- \`@recommend 详情 [标题]\` - 查看建议详细信息\n`);
    stream.markdown(`- \`@recommend 实施 [标题]\` - 获取实施指导\n`);
    stream.markdown(`- \`@recommend 刷新\` - 重新分析项目\n`);
    stream.markdown(`- \`@recommend 帮助\` - 显示此帮助信息\n\n`);
    
    stream.markdown(`**🔍 筛选条件示例**:\n`);
    stream.markdown(`- \`@recommend 筛选 高优先级\` - 查看高优先级建议\n`);
    stream.markdown(`- \`@recommend 筛选 security\` - 查看安全相关建议\n`);
    stream.markdown(`- \`@recommend 筛选 performance\` - 查看性能相关建议\n`);
    stream.markdown(`- \`@recommend 筛选 low effort\` - 查看低工作量建议\n\n`);
    
    stream.markdown(`**📂 建议分类**:\n`);
    stream.markdown(`- 🚨 \`critical-fix\` - 关键修复\n`);
    stream.markdown(`- ⚡ \`performance\` - 性能优化\n`);
    stream.markdown(`- 🔒 \`security\` - 安全改进\n`);
    stream.markdown(`- 📈 \`quality\` - 代码质量\n`);
    stream.markdown(`- ✨ \`feature\` - 功能增强\n`);
    stream.markdown(`- 📚 \`documentation\` - 文档改进\n\n`);
    
    stream.markdown(`**🔥 优先级说明**:\n`);
    stream.markdown(`- 🔴 \`high\` - 高优先级，建议优先处理\n`);
    stream.markdown(`- 🟡 \`medium\` - 中优先级，可以安排处理\n`);
    stream.markdown(`- 🟢 \`low\` - 低优先级，有时间时处理\n\n`);
    
    stream.markdown(`**⚡ 工作量评估**:\n`);
    stream.markdown(`- \`low\` - 低工作量，通常几分钟到几小时\n`);
    stream.markdown(`- \`medium\` - 中等工作量，通常几小时到一天\n`);
    stream.markdown(`- \`high\` - 高工作量，通常需要多天\n\n`);
    
    stream.markdown(`**🚀 快速开始**:\n`);
    stream.markdown(`1. 使用 \`@recommend 列表\` 查看所有建议\n`);
    stream.markdown(`2. 使用 \`@recommend 筛选 高优先级\` 查看重要建议\n`);
    stream.markdown(`3. 使用 \`@recommend 详情 [建议标题]\` 了解具体内容\n`);
    stream.markdown(`4. 使用 \`@recommend 实施 [建议标题]\` 获取实施指导\n\n`);
    
    stream.markdown(`💡 **提示**: 建议从高优先级和低工作量的建议开始实施，以快速改善项目质量！`);
  }

  /**
   * 处理默认请求
   */
  private async handleDefaultRequest(
    prompt: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('🤖 **推荐建议查看助手**\n\n');
    stream.markdown('我可以帮您查看和管理项目的推荐建议。\n\n');
    
    // 尝试智能解析用户意图
    if (prompt.includes('建议') || prompt.includes('推荐') || prompt.includes('recommendation')) {
      await this.handleListRequest(stream, token);
    } else {
      stream.markdown('**常用命令**:\n');
      stream.markdown('- `@recommend 列表` - 查看所有推荐建议\n');
      stream.markdown('- `@recommend 筛选 高优先级` - 查看高优先级建议\n');
      stream.markdown('- `@recommend 帮助` - 查看详细帮助\n\n');
      
      stream.markdown('💡 **提示**: 输入 `@recommend 帮助` 查看完整的使用指南！');
    }
  }

  /**
   * 刷新推荐建议
   */
  private async refreshRecommendations(token: vscode.CancellationToken, forceRefresh: boolean = false): Promise<void> {
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
  private groupRecommendationsByPriority(recommendations: Recommendation[]): Record<string, Recommendation[]> {
    return {
      high: recommendations.filter(r => r.priority === 'high'),
      medium: recommendations.filter(r => r.priority === 'medium'),
      low: recommendations.filter(r => r.priority === 'low')
    };
  }

  /**
   * 筛选推荐建议
   */
  private filterRecommendations(prompt: string, recommendations: Recommendation[]): Recommendation[] {
    const lowerPrompt = prompt.toLowerCase();
    
    return recommendations.filter(rec => {
      // 优先级筛选
      if (lowerPrompt.includes('高优先级') || lowerPrompt.includes('high priority') || lowerPrompt.includes('high')) {
        return rec.priority === 'high';
      }
      if (lowerPrompt.includes('中优先级') || lowerPrompt.includes('medium priority') || lowerPrompt.includes('medium')) {
        return rec.priority === 'medium';
      }
      if (lowerPrompt.includes('低优先级') || lowerPrompt.includes('low priority') || lowerPrompt.includes('low')) {
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
  private findRecommendationFromPrompt(prompt: string, recommendations: Recommendation[]): Recommendation | null {
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
    return recommendations.find(rec => 
      lowerPrompt.includes(rec.title.toLowerCase()) ||
      rec.title.toLowerCase().includes(lowerPrompt.replace(/详情|detail|实施|implement|具体|specific/g, '').trim())
    ) || null;
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
      categories: {} as Record<string, number>
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
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  /**
   * 获取优先级名称
   */
  private getPriorityName(priority: 'high' | 'medium' | 'low'): string {
    switch (priority) {
      case 'high': return '高优先级';
      case 'medium': return '中优先级';
      case 'low': return '低优先级';
      default: return '未知优先级';
    }
  }

  /**
   * 获取分类表情符号
   */
  private getCategoryEmoji(category: string): string {
    switch (category) {
      case 'critical-fix': return '🚨';
      case 'performance': return '⚡';
      case 'security': return '🔒';
      case 'quality': return '📈';
      case 'feature': return '✨';
      case 'documentation': return '📚';
      default: return '📋';
    }
  }
}