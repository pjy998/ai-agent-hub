#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs';
import { SelfProjectScanAgent } from '../../ai-agent/src/agents/SelfProjectScanAgent';

interface CLIOptions {
  format: 'markdown' | 'json' | 'html';
  output?: string;
  verbose: boolean;
  help: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    format: 'markdown',
    verbose: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--format':
      case '-f':
        const format = args[++i];
        if (['markdown', 'json', 'html'].includes(format)) {
          options.format = format as any;
        } else {
          console.error(`Invalid format: ${format}. Use: markdown, json, html`);
          process.exit(1);
        }
        break;
        
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
        
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
        
      case '--help':
      case '-h':
        options.help = true;
        break;
        
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
AI Agent Hub Self-Analysis Tool

Usage: npx ai-agent-hub analyze-self [options]

Options:
  -f, --format <format>    Output format (markdown, json, html) [default: markdown]
  -o, --output <path>      Output file path [default: auto-generated]
  -v, --verbose           Enable verbose logging
  -h, --help              Show this help message

Examples:
  npx ai-agent-hub analyze-self
  npx ai-agent-hub analyze-self --format json --output analysis.json
  npx ai-agent-hub analyze-self --verbose
  `);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    return;
  }

  try {
    console.log('🚀 AI Agent Hub Self-Analysis Tool');
    console.log('=====================================');
    
    if (options.verbose) {
      console.log(`Format: ${options.format}`);
      console.log(`Output: ${options.output || 'auto-generated'}`);
      console.log(`Working Directory: ${process.cwd()}`);
      console.log('');
    }

    // 创建分析代理
    const agent = new SelfProjectScanAgent(process.cwd());
    
    // 执行项目扫描
    console.log('🔍 Scanning project structure...');
    const analysis = await agent.scanProject();
    
    // 生成报告
    console.log('📄 Generating analysis report...');
    const report = await agent.generateReport(analysis);
    
    // 保存报告
    let outputPath: string;
    if (options.output) {
      outputPath = path.resolve(options.output);
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      let content: string;
      switch (options.format) {
        case 'json':
          content = JSON.stringify(report, null, 2);
          break;
        case 'html':
          content = generateHTMLReport(report);
          break;
        default:
          content = generateMarkdownReport(report);
      }
      
      fs.writeFileSync(outputPath, content, 'utf-8');
    } else {
      outputPath = await agent.saveReport(report, options.format);
    }
    
    // 显示结果摘要
    console.log('\n✅ Analysis Complete!');
    console.log('=====================');
    console.log(`📊 Overall Health Score: ${report.summary.overallHealth}/100`);
    console.log(`🔴 Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`💡 Total Recommendations: ${report.summary.recommendations}`);
    console.log(`📁 Report saved to: ${outputPath}`);
    
    if (options.verbose) {
      console.log('\n📋 Quick Summary:');
      console.log(`- Total Files: ${analysis.structure.totalFiles}`);
      console.log(`- Total Lines: ${analysis.structure.totalLines}`);
      console.log(`- Components Analyzed: ${analysis.components.length}`);
      
      const brokenComponents = analysis.components.filter(c => c.status === 'broken');
      if (brokenComponents.length > 0) {
        console.log(`\n🔴 Broken Components:`);
        brokenComponents.forEach(comp => {
          console.log(`  - ${comp.name}: ${comp.issues.join(', ')}`);
        });
      }
      
      const highPriorityRecs = analysis.recommendations.filter(r => r.priority === 'high');
      if (highPriorityRecs.length > 0) {
        console.log(`\n⚠️ High Priority Recommendations:`);
        highPriorityRecs.slice(0, 5).forEach((rec, index) => {
          console.log(`  ${index + 1}. ${rec.title}`);
        });
      }
    }
    
    // 退出码基于健康分数
    const exitCode = report.summary.overallHealth < 70 ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error: any) {
    console.error('❌ Analysis failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function generateMarkdownReport(report: any): string {
  return `
# AI Agent Hub Self-Analysis Report

${report.sections.projectOverview}

${report.sections.architectureAnalysis}

${report.sections.qualityAssessment}

${report.sections.securityReview}

${report.sections.performanceAnalysis}

${report.sections.improvementRoadmap}

${report.sections.nextSteps}

---
*Report generated: ${report.summary.analysisDate}*
*Overall health: ${report.summary.overallHealth}/100*
  `.trim();
}

function generateHTMLReport(report: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Agent Hub Self-Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #e9ecef; border-radius: 5px; }
        .critical { color: #dc3545; font-weight: bold; }
        .warning { color: #ffc107; font-weight: bold; }
        .success { color: #28a745; font-weight: bold; }
        .health-score { font-size: 2em; font-weight: bold; color: ${report.summary.overallHealth >= 80 ? '#28a745' : report.summary.overallHealth >= 60 ? '#ffc107' : '#dc3545'}; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
        h1, h2, h3 { color: #495057; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 AI Agent Hub Self-Analysis Report</h1>
        <p><strong>Generated:</strong> ${report.summary.analysisDate}</p>
        <p><strong>Overall Health:</strong> <span class="health-score">${report.summary.overallHealth}/100</span></p>
        <p><strong>Critical Issues:</strong> <span class="critical">${report.summary.criticalIssues}</span></p>
        <p><strong>Total Recommendations:</strong> ${report.summary.recommendations}</p>
    </div>
    
    <div class="section">
        <h2>📊 Project Overview</h2>
        <pre>${report.sections.projectOverview}</pre>
    </div>
    
    <div class="section">
        <h2>🏗️ Architecture Analysis</h2>
        <pre>${report.sections.architectureAnalysis}</pre>
    </div>
    
    <div class="section">
        <h2>🎯 Improvement Roadmap</h2>
        <pre>${report.sections.improvementRoadmap}</pre>
    </div>
    
    <div class="section">
        <h2>🚀 Next Steps</h2>
        <pre>${report.sections.nextSteps}</pre>
    </div>
</body>
</html>
  `.trim();
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

export { main as runSelfAnalysis };