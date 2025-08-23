/**
 * AI交互数据导出命令
 * 允许用户导出完整的AI交互历史数据
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { intelligentInputAnalyzer } from '../services/intelligent-input-analyzer';
import { outputManager } from '../utils/output-manager';

/**
 * AI交互数据导出命令
 */
export class ExportInteractionDataCommand {
  private static readonly COMMAND_ID = 'ai-agent.exportInteractionData';

  /**
   * 注册命令
   */
  public static register(context: vscode.ExtensionContext): void {
    const command = vscode.commands.registerCommand(ExportInteractionDataCommand.COMMAND_ID, () =>
      ExportInteractionDataCommand.execute()
    );
    context.subscriptions.push(command);
  }

  /**
   * 执行数据导出命令
   */
  private static async execute(): Promise<void> {
    try {
      const interactionHistory = intelligentInputAnalyzer.getInteractionHistory();

      if (interactionHistory.length === 0) {
        vscode.window.showInformationMessage('暂无AI交互数据可导出');
        return;
      }

      // 让用户选择导出格式
      const exportFormat = await vscode.window.showQuickPick(
        [
          {
            label: '$(json) JSON格式',
            description: '完整的结构化数据，适合程序处理',
            detail: 'ai-interaction-data.json',
            format: 'json',
          },
          {
            label: '$(file-text) CSV格式',
            description: '表格数据，适合Excel等工具分析',
            detail: 'ai-interaction-data.csv',
            format: 'csv',
          },
          {
            label: '$(markdown) Markdown格式',
            description: '可读性强的报告格式',
            detail: 'ai-interaction-report.md',
            format: 'markdown',
          },
        ],
        {
          placeHolder: '选择导出格式',
          title: 'AI交互数据导出',
        }
      );

      if (!exportFormat) {
        return;
      }

      // 让用户选择保存位置
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(
          path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', exportFormat.detail)
        ),
        filters: ExportInteractionDataCommand.getFileFilters(exportFormat.format),
      });

      if (!saveUri) {
        return;
      }

      // 生成导出数据
      const exportData = ExportInteractionDataCommand.generateExportData(
        interactionHistory,
        exportFormat.format
      );

      // 写入文件
      await fs.promises.writeFile(saveUri.fsPath, exportData, 'utf8');

      // 显示成功消息
      const openAction = '打开文件';
      const result = await vscode.window.showInformationMessage(
        `AI交互数据已成功导出到: ${path.basename(saveUri.fsPath)}`,
        openAction
      );

      if (result === openAction) {
        await vscode.window.showTextDocument(saveUri);
      }

      outputManager.logInfo(
        `AI交互数据已导出`,
        `格式: ${exportFormat.format}, 文件: ${saveUri.fsPath}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`导出AI交互数据失败: ${errorMessage}`);
      outputManager.logError(
        '导出AI交互数据失败',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 获取文件过滤器
   */
  private static getFileFilters(format: string): Record<string, string[]> {
    switch (format) {
      case 'json':
        return { JSON文件: ['json'] };
      case 'csv':
        return { CSV文件: ['csv'] };
      case 'markdown':
        return { Markdown文件: ['md'] };
      default:
        return { 所有文件: ['*'] };
    }
  }

  /**
   * 生成导出数据
   */
  private static generateExportData(interactionHistory: any[], format: string): string {
    switch (format) {
      case 'json':
        return ExportInteractionDataCommand.generateJsonExport(interactionHistory);
      case 'csv':
        return ExportInteractionDataCommand.generateCsvExport(interactionHistory);
      case 'markdown':
        return ExportInteractionDataCommand.generateMarkdownExport(interactionHistory);
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 生成JSON格式导出
   */
  private static generateJsonExport(interactionHistory: any[]): string {
    const exportData = {
      metadata: {
        exportTime: new Date().toISOString(),
        totalRecords: interactionHistory.length,
        version: '1.0.0',
      },
      interactions: interactionHistory.map(record => ({
        ...record,
        timestamp: new Date(record.timestamp).toISOString(),
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 生成CSV格式导出
   */
  private static generateCsvExport(interactionHistory: any[]): string {
    const headers = [
      'Timestamp',
      'Participant ID',
      'User Input',
      'Selected Flow',
      'Primary Intent',
      'Confidence',
      'Error',
    ];

    const csvRows = [headers.join(',')];

    interactionHistory.forEach(record => {
      let primaryIntent = '';
      let confidence = '';

      try {
        if (record.analysisResponse) {
          const analysis = JSON.parse(record.analysisResponse);
          primaryIntent = analysis.primaryIntent || '';
          confidence = analysis.confidence ? (analysis.confidence * 100).toFixed(1) + '%' : '';
        }
      } catch {
        // 忽略解析错误
      }

      const row = [
        new Date(record.timestamp).toISOString(),
        record.participantId || '',
        `"${(record.userInput || '').replace(/"/g, '""')}"`,
        record.selectedFlow || '',
        primaryIntent,
        confidence,
        record.error ? `"${record.error.replace(/"/g, '""')}"` : '',
      ];

      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * 生成Markdown格式导出
   */
  private static generateMarkdownExport(interactionHistory: any[]): string {
    let markdown = `# AI交互数据导出报告\n\n`;
    markdown += `**导出时间**: ${new Date().toLocaleString()}\n`;
    markdown += `**总记录数**: ${interactionHistory.length}\n\n`;

    markdown += `## 交互记录\n\n`;

    interactionHistory.forEach((record, index) => {
      markdown += `### 记录 ${index + 1}\n\n`;
      markdown += `- **时间**: ${new Date(record.timestamp).toLocaleString()}\n`;
      markdown += `- **参与者**: ${record.participantId}\n`;
      markdown += `- **用户输入**: ${record.userInput}\n`;
      markdown += `- **选择流程**: ${record.selectedFlow}\n`;

      try {
        if (record.analysisResponse) {
          const analysis = JSON.parse(record.analysisResponse);
          if (analysis.primaryIntent) {
            markdown += `- **识别意图**: ${analysis.primaryIntent}\n`;
            markdown += `- **置信度**: ${(analysis.confidence * 100).toFixed(1)}%\n`;
            if (analysis.explanation) {
              markdown += `- **AI解释**: ${analysis.explanation}\n`;
            }
          }
        }
      } catch {
        // 忽略解析错误
      }

      if (record.error) {
        markdown += `- **错误**: ${record.error}\n`;
      }

      markdown += `\n`;
    });

    return markdown;
  }

  /**
   * 获取命令ID
   */
  public static getCommandId(): string {
    return ExportInteractionDataCommand.COMMAND_ID;
  }
}
