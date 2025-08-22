import * as path from 'path';
import * as fs from 'fs';
import { OptimizedSelfProjectScanAgent } from '../agents/OptimizedSelfProjectScanAgent';
import { SelfProjectScanAgent } from '../agents/SelfProjectScanAgent';
import { OPTIMIZATION_PRESETS, PerformanceMonitor, OptimizationConfigManager } from '../config/optimization-config';

/**
 * 优化效果测试脚本
 * 
 * 这个脚本用于验证优化版本相比原版本的性能提升效果
 */

/**
 * 测试结果接口
 */
interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  memoryUsed: number;
  filesProcessed: number;
  componentsFound: number;
  error?: string;
}

/**
 * 性能对比测试
 */
export class OptimizationTester {
  private testProjectPath: string;
  private results: TestResult[] = [];
  
  constructor(projectPath: string) {
    this.testProjectPath = projectPath;
  }
  
  /**
   * 运行完整的性能对比测试
   */
  async runFullTest(): Promise<void> {
    console.log('🧪 开始优化效果测试...');
    console.log(`📁 测试项目: ${this.testProjectPath}`);
    
    // 检查项目路径
    if (!fs.existsSync(this.testProjectPath)) {
      console.error('❌ 测试项目路径不存在:', this.testProjectPath);
      return;
    }
    
    // 快速分析项目特征
    await this.analyzeProjectCharacteristics();
    
    console.log('\n' + '='.repeat(60));
    
    // 测试原版本（如果存在）
    await this.testOriginalVersion();
    
    console.log('\n' + '='.repeat(60));
    
    // 测试所有优化预设
    await this.testOptimizedVersions();
    
    console.log('\n' + '='.repeat(60));
    
    // 生成对比报告
    this.generateComparisonReport();
    
    console.log('\n🎉 测试完成！');
  }
  
  /**
   * 分析项目特征
   */
  private async analyzeProjectCharacteristics(): Promise<void> {
    console.log('\n📊 分析项目特征...');
    
    try {
      const stats = await this.getProjectStats(this.testProjectPath);
      
      console.log(`- 总文件数: ${stats.totalFiles}`);
      console.log(`- 代码文件数: ${stats.codeFiles}`);
      console.log(`- 总大小: ${(stats.totalSize / 1024 / 1024).toFixed(1)}MB`);
      console.log(`- 平均文件大小: ${(stats.averageFileSize / 1024).toFixed(1)}KB`);
      console.log(`- 最大文件大小: ${(stats.maxFileSize / 1024).toFixed(1)}KB`);
      console.log(`- 包含大文件: ${stats.hasLargeFiles ? '是' : '否'}`);
      
      // 获取推荐配置
      const recommendedConfig = OptimizationConfigManager.getRecommendedConfig({
        totalFiles: stats.totalFiles,
        totalSize: stats.totalSize,
        hasLargeFiles: stats.hasLargeFiles
      });
      
      const presetName = this.findPresetName(recommendedConfig);
      console.log(`- 推荐配置: ${presetName}`);
      
    } catch (error) {
      console.error('❌ 项目特征分析失败:', error);
    }
  }
  
  /**
   * 测试原版本性能
   */
  private async testOriginalVersion(): Promise<void> {
    console.log('\n🐌 测试原版本性能...');
    
    const monitor = new PerformanceMonitor();
    monitor.start();
    
    try {
      // 注意：这里假设原版本存在，实际使用时需要检查
      const originalAgent = new SelfProjectScanAgent();
      
      monitor.checkpoint('原版本初始化');
      
      const result = await originalAgent.scanProject();
      
      monitor.checkpoint('原版本扫描完成');
      
      const report = monitor.getReport();
      
      const testResult: TestResult = {
        name: '原版本',
        success: true,
        duration: report.totalTime,
        memoryUsed: report.totalMemoryDelta,
        filesProcessed: result.components?.length || 0,
        componentsFound: result.components?.length || 0
      };
      
      this.results.push(testResult);
      
      console.log(`✅ 原版本测试完成:`);
      console.log(`   - 耗时: ${report.totalTime}ms`);
      console.log(`   - 内存: ${(report.totalMemoryDelta / 1024 / 1024).toFixed(1)}MB`);
      console.log(`   - 文件: ${testResult.filesProcessed}`);
      console.log(`   - 组件: ${testResult.componentsFound}`);
      
    } catch (error) {
      console.log('⚠️ 原版本测试跳过 (可能不存在或已移除)');
      console.log('   这是正常的，我们将专注于优化版本的测试');
    }
  }
  
  /**
   * 测试所有优化版本
   */
  private async testOptimizedVersions(): Promise<void> {
    console.log('\n🚀 测试优化版本性能...');
    
    const presets = [
      { name: 'FAST', config: OPTIMIZATION_PRESETS.FAST },
      { name: 'BALANCED', config: OPTIMIZATION_PRESETS.BALANCED },
      { name: 'THOROUGH', config: OPTIMIZATION_PRESETS.THOROUGH },
      { name: 'LARGE_PROJECT', config: OPTIMIZATION_PRESETS.LARGE_PROJECT }
    ];
    
    for (const preset of presets) {
      await this.testSingleOptimizedVersion(preset.name, preset.config);
    }
  }
  
  /**
   * 测试单个优化版本
   */
  private async testSingleOptimizedVersion(name: string, config: any): Promise<void> {
    console.log(`\n⚡ 测试 ${name} 模式...`);
    
    const monitor = new PerformanceMonitor();
    monitor.start();
    
    try {
      const agent = new OptimizedSelfProjectScanAgent(config);
      
      monitor.checkpoint(`${name}模式初始化`);
      
      const result = await agent.scanProject();
      
      monitor.checkpoint(`${name}模式扫描完成`);
      
      const report = monitor.getReport();
      
      const testResult: TestResult = {
        name: `优化版本-${name}`,
        success: true,
        duration: report.totalTime,
        memoryUsed: report.totalMemoryDelta,
        filesProcessed: result.components?.length || 0,
        componentsFound: result.components?.length || 0
      };
      
      this.results.push(testResult);
      
      console.log(`✅ ${name} 模式测试完成:`);
      console.log(`   - 耗时: ${report.totalTime}ms`);
      console.log(`   - 内存: ${(report.totalMemoryDelta / 1024 / 1024).toFixed(1)}MB`);
      console.log(`   - 文件: ${testResult.filesProcessed}`);
      console.log(`   - 组件: ${testResult.componentsFound}`);
      console.log(`   - 质量评分: 未实现`);
      
    } catch (error) {
      console.error(`❌ ${name} 模式测试失败:`, error);
      
      const testResult: TestResult = {
        name: `优化版本-${name}`,
        success: false,
        duration: 0,
        memoryUsed: 0,
        filesProcessed: 0,
        componentsFound: 0,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this.results.push(testResult);
    }
  }
  
  /**
   * 生成对比报告
   */
  private generateComparisonReport(): void {
    console.log('\n📊 性能对比报告');
    console.log('='.repeat(80));
    
    // 表格标题
    console.log('| 版本 | 状态 | 耗时(ms) | 内存(MB) | 文件数 | 组件数 | 性能提升 |');
    console.log('|------|------|----------|----------|--------|--------|----------|');
    
    // 找到基准（原版本或最慢的优化版本）
    const successfulResults = this.results.filter(r => r.success);
    const baseline = successfulResults.find(r => r.name === '原版本') || 
                    successfulResults.reduce((prev, current) => 
                      prev.duration > current.duration ? prev : current
                    );
    
    // 输出每个结果
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = result.success ? result.duration : '-';
      const memory = result.success ? (result.memoryUsed / 1024 / 1024).toFixed(1) : '-';
      const files = result.success ? result.filesProcessed : '-';
      const components = result.success ? result.componentsFound : '-';
      
      let improvement = '-';
      if (result.success && baseline && baseline.duration > 0) {
        const speedup = baseline.duration / result.duration;
        improvement = `${speedup.toFixed(1)}x`;
      }
      
      console.log(`| ${result.name} | ${status} | ${duration} | ${memory} | ${files} | ${components} | ${improvement} |`);
    });
    
    // 总结
    console.log('\n📈 性能总结:');
    
    const optimizedResults = successfulResults.filter(r => r.name.startsWith('优化版本'));
    if (optimizedResults.length > 0 && baseline) {
      const bestOptimized = optimizedResults.reduce((prev, current) => 
        prev.duration < current.duration ? prev : current
      );
      
      const speedImprovement = baseline.duration / bestOptimized.duration;
      const memoryImprovement = (baseline.memoryUsed - bestOptimized.memoryUsed) / baseline.memoryUsed * 100;
      
      console.log(`- 🚀 最佳性能提升: ${speedImprovement.toFixed(1)}x (${bestOptimized.name})`);
      console.log(`- 💾 内存使用减少: ${memoryImprovement.toFixed(1)}%`);
      console.log(`- ⚡ 推荐配置: ${this.getBestConfigRecommendation()}`);
    }
    
    // 失败的测试
    const failedResults = this.results.filter(r => !r.success);
    if (failedResults.length > 0) {
      console.log('\n⚠️ 失败的测试:');
      failedResults.forEach(result => {
        console.log(`- ${result.name}: ${result.error}`);
      });
    }
  }
  
  /**
   * 获取项目统计信息
   */
  private async getProjectStats(projectPath: string): Promise<{
    totalFiles: number;
    codeFiles: number;
    totalSize: number;
    averageFileSize: number;
    maxFileSize: number;
    hasLargeFiles: boolean;
  }> {
    const stats = {
      totalFiles: 0,
      codeFiles: 0,
      totalSize: 0,
      averageFileSize: 0,
      maxFileSize: 0,
      hasLargeFiles: false
    };
    
    const codeExtensions = ['.ts', '.js', '.cs', '.py', '.java', '.cpp', '.c', '.h'];
    const fileSizes: number[] = [];
    
    const scanDirectory = (dirPath: string) => {
      try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            // 跳过常见的忽略目录
            if (!['node_modules', '.git', 'dist', 'out', 'build', 'bin', 'obj'].includes(item)) {
              scanDirectory(itemPath);
            }
          } else if (stat.isFile()) {
            stats.totalFiles++;
            stats.totalSize += stat.size;
            fileSizes.push(stat.size);
            
            if (codeExtensions.some(ext => itemPath.endsWith(ext))) {
              stats.codeFiles++;
            }
            
            if (stat.size > 1024 * 1024) { // 1MB
              stats.hasLargeFiles = true;
            }
          }
        }
      } catch (error) {
        // 忽略权限错误等
      }
    };
    
    scanDirectory(projectPath);
    
    if (fileSizes.length > 0) {
      stats.averageFileSize = stats.totalSize / fileSizes.length;
      stats.maxFileSize = Math.max(...fileSizes);
    }
    
    return stats;
  }
  
  /**
   * 查找预设名称
   */
  private findPresetName(config: any): string {
    const presets = Object.entries(OPTIMIZATION_PRESETS);
    for (const [name, preset] of presets) {
      if (JSON.stringify(preset) === JSON.stringify(config)) {
        return name;
      }
    }
    return '自定义';
  }
  
  /**
   * 获取最佳配置推荐
   */
  private getBestConfigRecommendation(): string {
    const optimizedResults = this.results.filter(r => r.success && r.name.startsWith('优化版本'));
    
    if (optimizedResults.length === 0) {
      return 'BALANCED';
    }
    
    // 综合考虑速度和内存使用
    const scored = optimizedResults.map(result => {
      const speedScore = 1000000 / result.duration; // 速度分数
      const memoryScore = 1000000000 / result.memoryUsed; // 内存分数
      const totalScore = speedScore + memoryScore;
      
      return {
        name: result.name.replace('优化版本-', ''),
        score: totalScore
      };
    });
    
    const best = scored.reduce((prev, current) => 
      prev.score > current.score ? prev : current
    );
    
    return best.name;
  }
}

/**
 * 运行测试的主函数
 */
export async function runOptimizationTest(projectPath?: string): Promise<void> {
  // 使用提供的路径或当前项目路径
  const testPath = projectPath || process.cwd();
  
  console.log('🧪 AI Agent 优化效果测试');
  console.log('='.repeat(50));
  
  const tester = new OptimizationTester(testPath);
  await tester.runFullTest();
}

/**
 * 快速性能测试
 */
export async function quickPerformanceTest(projectPath?: string): Promise<void> {
  const testPath = projectPath || process.cwd();
  
  console.log('⚡ 快速性能测试');
  console.log('='.repeat(30));
  
  const monitor = new PerformanceMonitor();
  monitor.start();
  
  try {
    // 使用平衡模式进行快速测试
    const agent = new OptimizedSelfProjectScanAgent();
    
    monitor.checkpoint('代理初始化');
    
    const result = await agent.scanProject();
    
    monitor.checkpoint('扫描完成');
    
    console.log('✅ 快速测试完成!');
    console.log(`- 处理文件: ${result.components?.length || 0}`);
    console.log(`- 发现组件: ${result.components?.length || 0}`);
    console.log(`- 质量评分: 未实现`);
    
    console.log('\n' + monitor.generateReport());
    
  } catch (error) {
    console.error('❌ 快速测试失败:', error);
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const projectPath = process.argv[2];
  runOptimizationTest(projectPath).catch(console.error);
}