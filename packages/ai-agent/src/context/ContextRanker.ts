import { ContextItem } from './ContextCollector';

export interface RankingCriteria {
  relevanceWeight: number;
  recencyWeight: number;
  importanceWeight: number;
  typeWeight: number;
}

export interface RankedContext {
  item: ContextItem;
  finalScore: number;
  ranking: number;
  reasons: string[];
}

export class ContextRanker {
  private defaultCriteria: RankingCriteria = {
    relevanceWeight: 0.4,
    recencyWeight: 0.2,
    importanceWeight: 0.3,
    typeWeight: 0.1,
  };

  private finalCriteria: RankingCriteria;

  constructor(criteria: Partial<RankingCriteria> = {}) {
    this.finalCriteria = { ...this.defaultCriteria, ...criteria };
  }

  rankContextItems(items: ContextItem[], query?: string): RankedContext[] {
    const scoredItems = items.map(item => this.scoreItem(item, query));

    // Sort by final score (descending)
    scoredItems.sort((a, b) => b.finalScore - a.finalScore);

    // Add ranking numbers
    return scoredItems.map((item, index) => ({
      ...item,
      ranking: index + 1,
    }));
  }

  getTopItems(items: ContextItem[], count: number, query?: string): RankedContext[] {
    const ranked = this.rankContextItems(items, query);
    return ranked.slice(0, count);
  }

  filterByType(items: ContextItem[], types: ContextItem['type'][]): ContextItem[] {
    return items.filter(item => types.includes(item.type));
  }

  filterByScore(rankedItems: RankedContext[], minScore: number): RankedContext[] {
    return rankedItems.filter(item => item.finalScore >= minScore);
  }

  private scoreItem(item: ContextItem, query?: string): RankedContext {
    const reasons: string[] = [];
    let finalScore = 0;

    // Base relevance score from the item
    const relevanceScore = item.relevanceScore;
    finalScore += relevanceScore * this.finalCriteria.relevanceWeight;
    if (relevanceScore > 0.7) {
      reasons.push('High base relevance');
    }

    // Query-based relevance (if query provided)
    if (query) {
      const queryScore = this.calculateQueryRelevance(item, query);
      finalScore += queryScore * this.finalCriteria.relevanceWeight;
      if (queryScore > 0.5) {
        reasons.push('Matches query terms');
      }
    }

    // Recency score
    const recencyScore = this.calculateRecencyScore(item);
    finalScore += recencyScore * this.finalCriteria.recencyWeight;
    if (recencyScore > 0.7) {
      reasons.push('Recently modified');
    }

    // Importance score based on file/symbol characteristics
    const importanceScore = this.calculateImportanceScore(item);
    finalScore += importanceScore * this.finalCriteria.importanceWeight;
    if (importanceScore > 0.7) {
      reasons.push('High importance');
    }

    // Type-based score
    const typeScore = this.calculateTypeScore(item);
    finalScore += typeScore * this.finalCriteria.typeWeight;
    if (typeScore > 0.7) {
      reasons.push('Important file type');
    }

    return {
      item,
      finalScore: Math.min(finalScore, 1.0),
      ranking: 0, // Will be set later
      reasons,
    };
  }

  private calculateQueryRelevance(item: ContextItem, query: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    let score = 0;
    let matches = 0;

    for (const term of queryTerms) {
      // Check path
      if (item.path.toLowerCase().includes(term)) {
        score += 0.3;
        matches++;
      }

      // Check content (if available)
      if (item.content && item.content.toLowerCase().includes(term)) {
        score += 0.4;
        matches++;
      }

      // Check metadata
      const metadataStr = JSON.stringify(item.metadata).toLowerCase();
      if (metadataStr.includes(term)) {
        score += 0.2;
        matches++;
      }
    }

    // Bonus for multiple matches
    if (matches > 1) {
      score += 0.1 * (matches - 1);
    }

    return Math.min(score, 1.0);
  }

  private calculateRecencyScore(item: ContextItem): number {
    if (!item.metadata.lastModified) {
      return 0.5; // Default score if no modification date
    }

    const lastModified = new Date(item.metadata.lastModified);
    const now = new Date();
    const daysSinceModified = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);

    // Score decreases over time
    if (daysSinceModified <= 1) return 1.0;
    if (daysSinceModified <= 7) return 0.8;
    if (daysSinceModified <= 30) return 0.6;
    if (daysSinceModified <= 90) return 0.4;
    return 0.2;
  }

  private calculateImportanceScore(item: ContextItem): number {
    let score = 0.5; // Base score

    switch (item.type) {
      case 'file':
        score += this.calculateFileImportance(item);
        break;
      case 'symbol':
        score += this.calculateSymbolImportance(item);
        break;
      case 'directory':
        score += this.calculateDirectoryImportance(item);
        break;
      case 'dependency':
        score += this.calculateDependencyImportance(item);
        break;
    }

    return Math.min(score, 1.0);
  }

  private calculateFileImportance(item: ContextItem): number {
    let score = 0;
    const fileName = item.path.split(/[\\/]/).pop()?.toLowerCase() || '';
    const extension = item.metadata.extension?.toLowerCase() || '';

    // Important file names
    if (['package.json', 'tsconfig.json', 'webpack.config.js'].includes(fileName)) {
      score += 0.4;
    }
    if (fileName.includes('index')) score += 0.2;
    if (fileName.includes('main')) score += 0.2;
    if (fileName.includes('config')) score += 0.1;

    // Important extensions
    if (['.ts', '.js'].includes(extension)) score += 0.2;
    if (['.json', '.yaml', '.yml'].includes(extension)) score += 0.1;

    // Size considerations (larger files might be more important)
    const size = item.metadata.size || 0;
    if (size > 10000) score += 0.1;
    if (size > 50000) score += 0.1;

    return score;
  }

  private calculateSymbolImportance(item: ContextItem): number {
    let score = 0;
    const symbolType = item.metadata.symbolType;
    const symbolName = item.metadata.name?.toLowerCase() || '';

    // Symbol type importance
    if (symbolType === 'class') score += 0.3;
    if (symbolType === 'interface') score += 0.2;
    if (symbolType === 'function') score += 0.2;

    // Symbol name patterns
    if (symbolName.includes('main') || symbolName.includes('index')) score += 0.2;
    if (symbolName.includes('config') || symbolName.includes('setting')) score += 0.1;
    if (symbolName.includes('manager') || symbolName.includes('controller')) score += 0.1;

    return score;
  }

  private calculateDirectoryImportance(item: ContextItem): number {
    let score = 0;
    const dirName = item.path.split(/[\\/]/).pop()?.toLowerCase() || '';
    const fileCount = item.metadata.fileCount || 0;

    // Important directory names
    if (['src', 'lib', 'packages'].includes(dirName)) score += 0.3;
    if (['test', 'tests', 'spec'].includes(dirName)) score += 0.2;
    if (['config', 'configs'].includes(dirName)) score += 0.2;
    if (['docs', 'documentation'].includes(dirName)) score += 0.1;

    // File count considerations
    if (fileCount > 10) score += 0.1;
    if (fileCount > 50) score += 0.1;

    return score;
  }

  private calculateDependencyImportance(item: ContextItem): number {
    let score = 0;
    const depName = item.path.toLowerCase();

    // Core dependencies
    if (depName.includes('vscode')) score += 0.4;
    if (depName.includes('typescript')) score += 0.3;
    if (depName.includes('@types')) score += 0.2;
    if (depName.includes('react') || depName.includes('vue') || depName.includes('angular'))
      score += 0.2;

    // Development vs production
    if (!item.metadata.isDev) score += 0.1;

    return score;
  }

  private calculateTypeScore(item: ContextItem): number {
    // Type-based scoring
    switch (item.type) {
      case 'file':
        return 0.8;
      case 'symbol':
        return 0.7;
      case 'directory':
        return 0.5;
      case 'dependency':
        return 0.6;
      default:
        return 0.5;
    }
  }

  // Utility methods for advanced ranking
  groupByType(rankedItems: RankedContext[]): Record<string, RankedContext[]> {
    const groups: Record<string, RankedContext[]> = {};

    for (const item of rankedItems) {
      const type = item.item.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(item);
    }

    return groups;
  }

  getScoreDistribution(rankedItems: RankedContext[]): {
    min: number;
    max: number;
    average: number;
    median: number;
  } {
    const scores = rankedItems.map(item => item.finalScore);
    scores.sort((a, b) => a - b);

    return {
      min: scores[0] || 0,
      max: scores[scores.length - 1] || 0,
      average: scores.reduce((sum, score) => sum + score, 0) / scores.length || 0,
      median: scores[Math.floor(scores.length / 2)] || 0,
    };
  }

  updateCriteria(newCriteria: Partial<RankingCriteria>): void {
    this.finalCriteria = { ...this.finalCriteria, ...newCriteria };
  }

  getCriteria(): RankingCriteria {
    return { ...this.finalCriteria };
  }
}
