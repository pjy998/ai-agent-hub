import * as vscode from 'vscode';
import { LLMMonitor } from '../monitoring/llm-monitor';
import { outputManager } from '../utils/output-manager';
import { calculateTokens } from '../utils/token-calculator';

// Configuration interfaces
export interface ImprovedModelConfig {
  name: string;
  maxTokens: number;
  costPer1kTokens?: number;
  provider?: string;
}

export interface ImprovedTokenProbeConfig {
  models: ImprovedModelConfig[];
  includeSystemPrompt?: boolean;
  includeContext?: boolean;
  outputFormat?: 'table' | 'json' | 'detailed';
  showCosts?: boolean;
}

export interface ImprovedTokenProbeResult {
  model: string;
  tokens: number;
  maxTokens: number;
  utilization: number;
  cost?: number;
  status: 'ok' | 'warning' | 'error';
  message?: string;
}

// Main function to create improved token probe
export async function createImprovedTokenProbe(
  config: ImprovedTokenProbeConfig,
  text: string,
  context?: string
): Promise<ImprovedTokenProbeResult[]> {
  const results: ImprovedTokenProbeResult[] = [];

  try {
    // Prepare the full text to analyze
    let fullText = text;
    if (config.includeContext && context) {
      fullText = `${context}\n\n${text}`;
    }

    // Process each model
    for (const model of config.models) {
      try {
        // Calculate tokens for this model
        const tokens = await calculateTokens(fullText, model.name as any);

        // Calculate utilization
        const utilization = (tokens / model.maxTokens) * 100;

        // Calculate cost if pricing is available
        let cost: number | undefined;
        if (config.showCosts && model.costPer1kTokens) {
          cost = (tokens / 1000) * model.costPer1kTokens;
        }

        // Determine status
        let status: 'ok' | 'warning' | 'error' = 'ok';
        let message: string | undefined;

        if (utilization > 90) {
          status = 'error';
          message = 'Token usage exceeds 90% of model limit';
        } else if (utilization > 75) {
          status = 'warning';
          message = 'Token usage exceeds 75% of model limit';
        }

        results.push({
          model: model.name,
          tokens,
          maxTokens: model.maxTokens,
          utilization,
          cost,
          status,
          message,
        });
      } catch (error) {
        // Handle individual model errors
        results.push({
          model: model.name,
          tokens: 0,
          maxTokens: model.maxTokens,
          utilization: 0,
          status: 'error',
          message: `Failed to calculate tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return results;
  } catch (error) {
    outputManager.logError('Error in createImprovedTokenProbe', error as Error);
    throw error;
  }
}

// Helper function to format results
export function formatTokenProbeResults(
  results: ImprovedTokenProbeResult[],
  format: 'table' | 'json' | 'detailed' = 'table'
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(results, null, 2);

    case 'detailed':
      return results
        .map(result => {
          const lines = [
            `Model: ${result.model}`,
            `Tokens: ${result.tokens}/${result.maxTokens} (${result.utilization.toFixed(1)}%)`,
            `Status: ${result.status.toUpperCase()}`,
          ];

          if (result.cost !== undefined) {
            lines.push(`Cost: $${result.cost.toFixed(4)}`);
          }

          if (result.message) {
            lines.push(`Message: ${result.message}`);
          }

          return lines.join('\n');
        })
        .join('\n\n');

    case 'table':
    default:
      const headers = ['Model', 'Tokens', 'Max', 'Usage%', 'Status'];
      const rows = results.map(result => [
        result.model,
        result.tokens.toString(),
        result.maxTokens.toString(),
        `${result.utilization.toFixed(1)}%`,
        result.status,
      ]);

      // Simple table formatting
      const colWidths = headers.map((header, i) =>
        Math.max(header.length, ...rows.map(row => row[i].length))
      );

      const formatRow = (row: string[]) =>
        row.map((cell, i) => cell.padEnd(colWidths[i])).join(' | ');

      const separator = colWidths.map(width => '-'.repeat(width)).join('-|-');

      return [formatRow(headers), separator, ...rows.map(formatRow)].join('\n');
  }
}

// Export default configuration
export const defaultImprovedTokenProbeConfig: ImprovedTokenProbeConfig = {
  models: [
    { name: 'gpt-4', maxTokens: 8192, costPer1kTokens: 0.03, provider: 'openai' },
    { name: 'gpt-3.5-turbo', maxTokens: 4096, costPer1kTokens: 0.002, provider: 'openai' },
    { name: 'claude-3-sonnet', maxTokens: 200000, costPer1kTokens: 0.003, provider: 'anthropic' },
  ],
  includeSystemPrompt: true,
  includeContext: true,
  outputFormat: 'table',
  showCosts: true,
};
