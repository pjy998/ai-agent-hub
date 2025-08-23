/**
 * 参与者辅助工具类
 * 提供统一的参与者名称和命令引用方法
 */

import { ParticipantsConfigManager, COMMON_COMMANDS } from '../config/participants-config';

/**
 * 参与者辅助工具类
 */
export class ParticipantHelper {
  /**
   * 获取格式化的命令帮助文本
   * @param participantId 参与者ID
   * @param commandType 命令类型
   * @param description 命令描述
   * @returns 格式化的命令帮助文本
   */
  static getCommandHelp(
    participantId: keyof typeof import('../config/participants-config').PARTICIPANTS_CONFIG,
    commandType: keyof typeof COMMON_COMMANDS,
    description: string
  ): string {
    const commands = ParticipantsConfigManager.generateCommandHelp(
      participantId,
      COMMON_COMMANDS[commandType]
    );
    return commands.map(cmd => `- ${cmd} - ${description}`).join('\n');
  }

  /**
   * 获取单个命令引用
   * @param participantId 参与者ID
   * @param commandType 命令类型
   * @returns 第一个命令的完整引用
   */
  static getCommandReference(
    participantId: keyof typeof import('../config/participants-config').PARTICIPANTS_CONFIG,
    commandType: keyof typeof COMMON_COMMANDS
  ): string {
    const commands = ParticipantsConfigManager.generateCommandHelp(
      participantId,
      COMMON_COMMANDS[commandType]
    );
    return commands[0] || '';
  }

  /**
   * 获取参与者显示名称
   * @param participantId 参与者ID
   * @returns 参与者显示名称（如 @code）
   */
  static getDisplayName(
    participantId: keyof typeof import('../config/participants-config').PARTICIPANTS_CONFIG
  ): string {
    return ParticipantsConfigManager.getDisplayName(participantId);
  }

  /**
   * 获取参与者名称（不带@符号）
   * @param participantId 参与者ID
   * @returns 参与者名称
   */
  static getParticipantName(
    participantId: keyof typeof import('../config/participants-config').PARTICIPANTS_CONFIG
  ): string {
    return ParticipantsConfigManager.getParticipantName(participantId);
  }

  /**
   * 生成标准化的帮助文档部分
   * @param participantId 参与者ID
   * @param sections 要生成的部分配置
   * @returns 格式化的帮助文档
   */
  static generateHelpSections(
    participantId: keyof typeof import('../config/participants-config').PARTICIPANTS_CONFIG,
    sections: {
      title: string;
      commandType: keyof typeof COMMON_COMMANDS;
      description: string;
    }[]
  ): string {
    return sections
      .map(section => {
        const commands = ParticipantsConfigManager.generateCommandHelp(
          participantId,
          COMMON_COMMANDS[section.commandType]
        );
        const commandList = commands.map(cmd => `- ${cmd} - ${section.description}`).join('\n');
        return `### ${section.title}\n\n${commandList}\n`;
      })
      .join('\n');
  }

  /**
   * 生成快速操作提示
   * @param participantId 参与者ID
   * @param actions 操作配置
   * @returns 格式化的快速操作提示
   */
  static generateQuickActions(
    participantId: keyof typeof import('../config/participants-config').PARTICIPANTS_CONFIG,
    actions: {
      icon: string;
      label: string;
      commandType: keyof typeof COMMON_COMMANDS;
    }[]
  ): string {
    return actions
      .map(action => {
        const command = this.getCommandReference(participantId, action.commandType);
        return `- ${action.icon} **${action.label}**: ${command}`;
      })
      .join('\n');
  }
}

/**
 * 常用的帮助文档模板
 */
export const HELP_TEMPLATES = {
  /**
   * 标准分析助手帮助模板
   */
  ANALYSIS_ASSISTANT: {
    sections: [
      {
        title: '📋 项目分析',
        commandType: 'ANALYZE_PROJECT' as const,
        description: '项目结构和代码分析',
      },
      {
        title: '🎯 质量检查',
        commandType: 'QUALITY_CHECK' as const,
        description: '代码质量评估',
      },
      {
        title: '📊 报告生成',
        commandType: 'GENERATE_REPORT' as const,
        description: '生成分析报告',
      },
      {
        title: '⚠️ 问题诊断',
        commandType: 'SHOW_ISSUES' as const,
        description: '显示代码问题',
      },
      {
        title: '📈 统计信息',
        commandType: 'SHOW_STATS' as const,
        description: '项目统计信息',
      },
    ],
    quickActions: [
      {
        icon: '🔍',
        label: '分析项目',
        commandType: 'ANALYZE_PROJECT' as const,
      },
      {
        icon: '🎯',
        label: '质量检查',
        commandType: 'QUALITY_CHECK' as const,
      },
      {
        icon: '📊',
        label: '生成报告',
        commandType: 'GENERATE_REPORT' as const,
      },
      {
        icon: '⚠️',
        label: '显示问题',
        commandType: 'SHOW_ISSUES' as const,
      },
      {
        icon: '📈',
        label: '查看统计',
        commandType: 'SHOW_STATS' as const,
      },
    ],
  },
};
