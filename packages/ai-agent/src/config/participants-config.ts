/**
 * Chat 参与者配置管理
 * 统一管理所有参与者的ID、名称和描述，避免硬编码
 */

export interface ParticipantConfig {
  id: string;
  name: string;
  description: string;
  displayName: string;
}

/**
 * 参与者配置常量
 */
export const PARTICIPANTS_CONFIG: Record<string, ParticipantConfig> = {
  SMART: {
    id: 'smart',
    name: 'Smart AI Assistant',
    description: 'AI智能助手 - 集成ChatGPT的智能分析',
    displayName: '@smart',
  },
  CODE: {
    id: 'code',
    name: 'Code Analysis',
    description: '代码分析参与者',
    displayName: '@code',
  },
  REPORT: {
    id: 'report',
    name: 'Report Generator',
    description: '报告生成参与者',
    displayName: '@report',
  },
  TOKEN: {
    id: 'token',
    name: 'Token Manager',
    description: 'Token管理参与者',
    displayName: '@token',
  },
  CONFIG: {
    id: 'config',
    name: 'Config Manager',
    description: '配置管理参与者',
    displayName: '@config',
  },
  ANALYZE: {
    id: 'analyze',
    name: 'Project Analyzer',
    description: '项目分析参与者',
    displayName: '@analyze',
  },
  RECOMMEND: {
    id: 'recommend',
    name: 'Recommendation System',
    description: '推荐系统参与者',
    displayName: '@recommend',
  },
};

/**
 * 参与者配置管理器
 */
export class ParticipantsConfigManager {
  /**
   * 获取参与者配置
   */
  static getConfig(participantKey: keyof typeof PARTICIPANTS_CONFIG): ParticipantConfig {
    return PARTICIPANTS_CONFIG[participantKey];
  }

  /**
   * 获取参与者显示名称
   */
  static getDisplayName(participantKey: keyof typeof PARTICIPANTS_CONFIG): string {
    return PARTICIPANTS_CONFIG[participantKey].displayName;
  }

  /**
   * 获取参与者ID
   */
  static getId(participantKey: keyof typeof PARTICIPANTS_CONFIG): string {
    return PARTICIPANTS_CONFIG[participantKey].id;
  }

  /**
   * 获取所有参与者配置
   */
  static getAllConfigs(): ParticipantConfig[] {
    return Object.values(PARTICIPANTS_CONFIG);
  }

  /**
   * 根据ID查找参与者配置
   */
  static findConfigById(id: string): ParticipantConfig | undefined {
    return Object.values(PARTICIPANTS_CONFIG).find(config => config.id === id);
  }

  /**
   * 生成参与者引用文本
   */
  static generateReference(
    participantKey: keyof typeof PARTICIPANTS_CONFIG,
    command: string
  ): string {
    const displayName = this.getDisplayName(participantKey);
    return `${displayName} ${command}`;
  }

  /**
   * 获取参与者配置
   */
  static getParticipant(participantKey: keyof typeof PARTICIPANTS_CONFIG): ParticipantConfig {
    return PARTICIPANTS_CONFIG[participantKey];
  }

  /**
   * 生成命令帮助文本
   * @param participantId 参与者ID
   * @param commands 命令列表
   * @returns 格式化的命令帮助文本数组
   */
  static generateCommandHelp(
    participantId: keyof typeof PARTICIPANTS_CONFIG,
    commands: readonly string[]
  ): string[] {
    const participant = this.getParticipant(participantId);
    if (!participant) {
      return [];
    }

    return commands.map(command => `${participant.displayName} ${command}`);
  }

  /**
   * 获取参与者名称（不带@符号）
   * @param participantId 参与者ID
   * @returns 参与者名称
   */
  static getParticipantName(participantId: keyof typeof PARTICIPANTS_CONFIG): string {
    const participant = this.getParticipant(participantId);
    return participant?.id || '';
  }
}

/**
 * 常用命令配置
 */
export const COMMON_COMMANDS = {
  ANALYZE_PROJECT: ['分析项目', '分析', '扫描'],
  QUALITY_CHECK: ['质量检查', '编码规范', '规范'],
  GENERATE_REPORT: ['生成报告', '报告', '导出'],
  SHOW_ISSUES: ['显示问题', '问题', '建议'],
  SHOW_STATS: ['统计', '数据', '指标'],
  HELP: ['帮助', 'help'],
} as const;
