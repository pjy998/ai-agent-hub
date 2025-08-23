/**
 * AI交互透明化报告命令
 * 提供AI分析过程的透明化查看功能
 */

import * as vscode from 'vscode';
import { intelligentInputAnalyzer } from '../services/intelligent-input-analyzer';
import { outputManager } from '../utils/output-manager';

/**
 * AI交互透明化报告命令
 */
export class TransparencyReportCommand {
  private static readonly COMMAND_ID = 'ai-agent.showTransparencyReport';

  /**
   * 注册命令
   */
  public static register(context: vscode.ExtensionContext): void {
    const command = vscode.commands.registerCommand(TransparencyReportCommand.COMMAND_ID, () =>
      TransparencyReportCommand.execute()
    );
    context.subscriptions.push(command);
  }

  /**
   * 执行透明化报告命令
   */
  private static async execute(): Promise<void> {
    try {
      const report = intelligentInputAnalyzer.getTransparencyReport();
      const interactionHistory = intelligentInputAnalyzer.getInteractionHistory();

      if (interactionHistory.length === 0) {
        vscode.window.showInformationMessage('暂无AI交互记录');
        return;
      }

      // 创建并显示透明化报告
      const document = await vscode.workspace.openTextDocument({
        content: TransparencyReportCommand.generateDetailedReport(interactionHistory),
        language: 'markdown',
      });

      await vscode.window.showTextDocument(document, {
        preview: true,
        viewColumn: vscode.ViewColumn.Beside,
      });

      outputManager.logInfo('AI交互透明化报告已生成');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`生成透明化报告失败: ${errorMessage}`);
      outputManager.logError(
        '生成透明化报告失败',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 生成详细的透明化报告
   */
  private static generateDetailedReport(interactionHistory: any[]): string {
    const totalInteractions = interactionHistory.length;
    const successfulAnalyses = interactionHistory.filter(r => !r.error).length;
    const participantStats = TransparencyReportCommand.getParticipantStats(interactionHistory);
    const intentStats = TransparencyReportCommand.getIntentStats(interactionHistory);

    let report = `# AI交互透明化报告\n\n`;
    report += `**生成时间**: ${new Date().toLocaleString()}\n\n`;

    // 总体统计
    report += `## 📊 总体统计\n\n`;
    report += `- **总交互次数**: ${totalInteractions}\n`;
    report += `- **成功分析次数**: ${successfulAnalyses}\n`;
    report += `- **成功率**: ${((successfulAnalyses / totalInteractions) * 100).toFixed(1)}%\n`;
    report += `- **平均置信度**: ${TransparencyReportCommand.calculateAverageConfidence(interactionHistory).toFixed(1)}%\n\n`;

    // 参与者统计
    report += `## 🤖 参与者使用统计\n\n`;
    Object.entries(participantStats).forEach(([participant, count]) => {
      const percentage = (((count as number) / totalInteractions) * 100).toFixed(1);
      report += `- **${participant}**: ${count} 次 (${percentage}%)\n`;
    });
    report += `\n`;

    // 意图分析统计
    report += `## 🎯 意图分析统计\n\n`;
    Object.entries(intentStats).forEach(([intent, count]) => {
      const percentage = (((count as number) / totalInteractions) * 100).toFixed(1);
      report += `- **${intent}**: ${count} 次 (${percentage}%)\n`;
    });
    report += `\n`;

    // 详细交互记录
    report += `## 📝 详细交互记录\n\n`;
    interactionHistory
      .slice(-20)
      .reverse()
      .forEach((record, index) => {
        const recordNumber = interactionHistory.length - index;
        report += `### 交互 #${recordNumber}\n\n`;
        report += `- **时间**: ${new Date(record.timestamp).toLocaleString()}\n`;
        report += `- **参与者**: ${record.participantId}\n`;
        report += `- **用户输入**: \`${record.userInput}\`\n`;
        report += `- **选择流程**: ${record.selectedFlow}\n`;

        if (record.analysisResponse) {
          try {
            const analysis = JSON.parse(record.analysisResponse);
            if (analysis.primaryIntent) {
              report += `- **识别意图**: ${analysis.primaryIntent}\n`;
              report += `- **置信度**: ${(analysis.confidence * 100).toFixed(1)}%\n`;
              if (analysis.explanation) {
                report += `- **AI解释**: ${analysis.explanation}\n`;
              }
            }
          } catch {
            // 如果解析失败，显示原始响应的前100个字符
            const truncatedResponse =
              record.analysisResponse.length > 100
                ? record.analysisResponse.substring(0, 100) + '...'
                : record.analysisResponse;
            report += `- **AI响应**: ${truncatedResponse}\n`;
          }
        }

        if (record.error) {
          report += `- **错误**: ❌ ${record.error}\n`;
        }

        report += `\n---\n\n`;
      });

    // 数据导出信息
    report += `## 📤 数据导出\n\n`;
    report += `如需导出完整的交互数据，请使用以下命令：\n`;
    report += `\`\`\`\n`;
    report += `AI Agent: Export Interaction Data\n`;
    report += `\`\`\`\n\n`;

    report += `> **隐私说明**: 所有AI交互数据仅存储在本地，不会上传到任何外部服务器。\n`;

    return report;
  }

  /**
   * 获取参与者使用统计
   */
  private static getParticipantStats(interactionHistory: any[]): Record<string, number> {
    const stats: Record<string, number> = {};
    interactionHistory.forEach(record => {
      const participant = record.participantId || 'unknown';
      stats[participant] = (stats[participant] || 0) + 1;
    });
    return stats;
  }

  /**
   * 获取意图分析统计
   */
  private static getIntentStats(interactionHistory: any[]): Record<string, number> {
    const stats: Record<string, number> = {};
    interactionHistory.forEach(record => {
      try {
        if (record.analysisResponse) {
          const analysis = JSON.parse(record.analysisResponse);
          const intent = analysis.primaryIntent || 'unknown';
          stats[intent] = (stats[intent] || 0) + 1;
        }
      } catch {
        stats['parse_error'] = (stats['parse_error'] || 0) + 1;
      }
    });
    return stats;
  }

  /**
   * 计算平均置信度
   */
  private static calculateAverageConfidence(interactionHistory: any[]): number {
    let totalConfidence = 0;
    let validRecords = 0;

    interactionHistory.forEach(record => {
      try {
        if (record.analysisResponse) {
          const analysis = JSON.parse(record.analysisResponse);
          if (typeof analysis.confidence === 'number') {
            totalConfidence += analysis.confidence;
            validRecords++;
          }
        }
      } catch {
        // 忽略解析错误
      }
    });

    return validRecords > 0 ? (totalConfidence / validRecords) * 100 : 0;
  }

  /**
   * 获取命令ID
   */
  public static getCommandId(): string {
    return TransparencyReportCommand.COMMAND_ID;
  }
}
