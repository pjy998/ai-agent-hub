import * as fs from 'fs';
// 移除js-yaml依赖，使用内置解析器
import { LanguageAnalysisConfig } from '../yaml/DynamicConfigGenerator';
import { outputManager } from '../utils/output-manager';

/**
 * 简单的YAML解析器
 * 处理基本的YAML结构，替代js-yaml依赖
 */
class SimpleYamlParser {
  static load(content: string): Record<string, unknown> {
    try {
      // 移除注释
      const lines = content
        .split('\n')
        .map(line => {
          const commentIndex = line.indexOf('#');
          if (commentIndex >= 0) {
            return line.substring(0, commentIndex).trim();
          }
          return line.trim();
        })
        .filter(line => line.length > 0);

      const result: Record<string, unknown> = {};
      let currentObject = result;
      const stack: Record<string, unknown>[] = [result];
      let currentIndent = 0;

      for (const line of lines) {
        const indent = line.length - line.trimLeft().length;
        const trimmedLine = line.trim();

        if (trimmedLine.includes(':')) {
          const [key, ...valueParts] = trimmedLine.split(':');
          const value = valueParts.join(':').trim();

          // 处理缩进变化
          if (indent < currentIndent) {
            // 回退到合适的层级
            while (stack.length > 1 && indent < currentIndent) {
              stack.pop();
              currentIndent -= 2; // 假设每级缩进2个空格
            }
            currentObject = stack[stack.length - 1];
          }

          if (value) {
            // 处理不同类型的值
            if (value === 'true' || value === 'false') {
              currentObject[key.trim()] = value === 'true';
            } else if (!isNaN(Number(value))) {
              currentObject[key.trim()] = Number(value);
            } else if (value.startsWith('"') && value.endsWith('"')) {
              currentObject[key.trim()] = value.slice(1, -1);
            } else if (value.startsWith('[') && value.endsWith(']')) {
              // 简单数组解析
              const arrayContent = value.slice(1, -1);
              currentObject[key.trim()] = arrayContent
                .split(',')
                .map(item => item.trim().replace(/"/g, ''));
            } else {
              currentObject[key.trim()] = value;
            }
          } else {
            // 嵌套对象
            currentObject[key.trim()] = {};
            stack.push(currentObject[key.trim()] as Record<string, unknown>);
            currentObject = currentObject[key.trim()] as Record<string, unknown>;
            currentIndent = indent;
          }
        } else if (trimmedLine.startsWith('-')) {
          // 数组项处理
          const value = trimmedLine.substring(1).trim();
          if (!Array.isArray(currentObject)) {
            // 如果当前对象不是数组，需要特殊处理
            outputManager.logWarning('YAML解析警告：遇到数组项但当前对象不是数组');
          }
          // TODO: 实现数组项的实际处理逻辑
          outputManager.logInfo(`Array item value: ${value}`);
        }
      }

      return result;
    } catch (error) {
      outputManager.logError('YAML解析错误:', error as Error);
      // 如果YAML解析失败，尝试作为JSON解析
      try {
        return JSON.parse(content);
      } catch {
        throw new Error(`YAML和JSON解析都失败: ${error}`);
      }
    }
  }
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  line?: number;
  column?: number;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

/**
 * 测试结果接口
 */
export interface TestResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: TestCase[];
  coverage: {
    rules: number;
    standards: number;
    securityChecks: number;
    performanceChecks: number;
  };
}

export interface TestCase {
  name: string;
  description: string;
  input: string;
  expectedOutput: unknown;
  actualOutput: unknown;
  error?: string;
}

/**
 * 配置验证器
 * 验证YAML配置的正确性和完整性
 */
export class ConfigValidator {
  constructor() {}

  /**
   * 验证配置文件
   */
  async validateConfig(filePath: string): Promise<{
    isValid: boolean;
    config?: Record<string, unknown>;
    errors: Array<{ type: string; message: string; path?: string }>;
    warnings: Array<{ message: string }>;
  }> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const config = SimpleYamlParser.load(content) as Record<string, unknown>;

      const validation = this.validateYamlContent(content);

      return {
        isValid: validation.isValid,
        config: config,
        errors: validation.errors.map(e => ({
          type: e.severity,
          message: e.message,
          path: e.field,
        })),
        warnings: validation.warnings.map(w => ({ message: w.message })),
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            type: 'error',
            message: `无法读取文件: ${error instanceof Error ? error.message : '未知错误'}`,
            path: 'file',
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * 验证YAML配置文件
   */
  async validateYamlFile(filePath: string): Promise<ValidationResult> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return this.validateYamlContent(content);
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            field: 'file',
            message: `无法读取文件: ${error instanceof Error ? error.message : '未知错误'}`,
            severity: 'error',
          },
        ],
        warnings: [],
        suggestions: ['检查文件路径是否正确', '确保文件存在且可读'],
      };
    }
  }

  /**
   * 验证YAML内容
   */
  validateYamlContent(content: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    try {
      // 解析YAML
      const config = SimpleYamlParser.load(content) as Record<string, unknown>;

      // 基本结构验证
      this.validateBasicStructure(config, result);

      // 步骤验证
      this.validateSteps((config.steps as any[]) || [], result);

      // 上下文验证
      this.validateContext(config.context || {}, result);

      // 输出验证
      this.validateOutput(config.output || {}, result);

      // 性能检查
      this.validatePerformance(config, result);
    } catch (error) {
      result.isValid = false;
      result.errors.push({
        field: 'yaml',
        message: `YAML解析错误: ${error instanceof Error ? error.message : '格式错误'}`,
        severity: 'error',
      });
    }

    // 设置整体验证状态
    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * 验证语言配置
   */
  validateLanguageConfig(config: LanguageAnalysisConfig): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // 验证基本信息
    if (!config.language || config.language.trim() === '') {
      result.errors.push({
        field: 'language',
        message: '语言名称不能为空',
        severity: 'error',
      });
    }

    if (!config.fileExtensions || config.fileExtensions.length === 0) {
      result.errors.push({
        field: 'fileExtensions',
        message: '文件扩展名不能为空',
        severity: 'error',
      });
    }

    // 验证分析规则
    this.validateAnalysisRules(config.analysisRules || [], result);

    // 验证编码标准
    this.validateCodingStandards(config.codingStandards || [], result);

    // 验证安全检查
    this.validateSecurityChecks(config.securityChecks || [], result);

    // 验证性能检查
    this.validatePerformanceChecks(config.performanceChecks || [], result);

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * 测试配置文件
   */
  async testConfig(filePath: string): Promise<{
    success: boolean;
    executionTime: number;
    stepResults: Array<{
      stepName: string;
      success: boolean;
      output?: string;
      error?: string;
      executionTime: number;
    }>;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const config = SimpleYamlParser.load(content) as Record<string, unknown>;

      const stepResults = [];
      let overallSuccess = true;

      if (config.steps && Array.isArray(config.steps)) {
        for (const step of config.steps) {
          const stepStartTime = Date.now();

          try {
            // 模拟步骤执行
            const stepSuccess = this.validateStep(step);

            stepResults.push({
              stepName: step.name || '未命名步骤',
              success: stepSuccess,
              output: stepSuccess ? '步骤验证通过' : '步骤验证失败',
              executionTime: Date.now() - stepStartTime,
            });

            if (!stepSuccess) {
              overallSuccess = false;
            }
          } catch (error) {
            stepResults.push({
              stepName: step.name || '未命名步骤',
              success: false,
              error: error instanceof Error ? error.message : '步骤执行错误',
              executionTime: Date.now() - stepStartTime,
            });
            overallSuccess = false;
          }
        }
      }

      return {
        success: overallSuccess,
        executionTime: Date.now() - startTime,
        stepResults,
      };
    } catch (error) {
      return {
        success: false,
        executionTime: Date.now() - startTime,
        stepResults: [],
        error: error instanceof Error ? error.message : '配置测试失败',
      };
    }
  }

  /**
   * 验证单个步骤
   */
  private validateStep(step: Record<string, unknown>): boolean {
    // 基本验证
    if (!step.name || typeof step.name !== 'string') {
      return false;
    }

    if (!step.prompt || typeof step.prompt !== 'string') {
      return false;
    }

    // 检查提示长度
    if (step.prompt.length < 10) {
      return false;
    }

    return true;
  }

  /**
   * 测试配置
   */
  async testConfiguration(
    config: LanguageAnalysisConfig,
    testCases?: TestCase[]
  ): Promise<TestResult> {
    const result: TestResult = {
      passed: false,
      totalTests: 0,
      passedTests: 0,
      failedTests: [],
      coverage: {
        rules: 0,
        standards: 0,
        securityChecks: 0,
        performanceChecks: 0,
      },
    };

    try {
      // 生成默认测试用例
      const defaultTests = this.generateDefaultTestCases(config);
      const allTests = [...defaultTests, ...(testCases || [])];

      result.totalTests = allTests.length;

      // 执行测试
      for (const test of allTests) {
        try {
          const passed = await this.executeTestCase(test, config);
          if (passed) {
            result.passedTests++;
          } else {
            result.failedTests.push(test);
          }
        } catch (error) {
          test.error = error instanceof Error ? error.message : '测试执行错误';
          result.failedTests.push(test);
        }
      }

      // 计算覆盖率
      result.coverage = this.calculateCoverage(config, allTests);

      result.passed = result.failedTests.length === 0;
    } catch (error) {
      outputManager.logError(
        '测试执行错误',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    return result;
  }

  /**
   * 验证基本结构
   */
  private validateBasicStructure(config: Record<string, unknown>, result: ValidationResult): void {
    const requiredFields = ['name', 'description', 'steps'];

    for (const field of requiredFields) {
      if (!config[field]) {
        result.errors.push({
          field,
          message: `缺少必需字段: ${field}`,
          severity: 'error',
        });
      }
    }

    // 检查名称格式
    if (config.name && typeof config.name !== 'string') {
      result.errors.push({
        field: 'name',
        message: '名称必须是字符串',
        severity: 'error',
      });
    }

    // 检查描述长度
    if (
      config.description &&
      typeof config.description === 'string' &&
      config.description.length < 10
    ) {
      result.warnings.push({
        field: 'description',
        message: '描述过短',
        suggestion: '建议提供更详细的描述（至少10个字符）',
      });
    }
  }

  /**
   * 验证步骤
   */
  private validateSteps(steps: any[], result: ValidationResult): void {
    if (steps.length === 0) {
      result.errors.push({
        field: 'steps',
        message: '至少需要一个步骤',
        severity: 'error',
      });
      return;
    }

    steps.forEach((step, index) => {
      const stepField = `steps[${index}]`;

      if (!step.name) {
        result.errors.push({
          field: `${stepField}.name`,
          message: '步骤名称不能为空',
          severity: 'error',
        });
      }

      if (!step.prompt) {
        result.errors.push({
          field: `${stepField}.prompt`,
          message: '步骤提示不能为空',
          severity: 'error',
        });
      }

      // 检查提示长度
      if (step.prompt && typeof step.prompt === 'string' && step.prompt.length < 20) {
        result.warnings.push({
          field: `${stepField}.prompt`,
          message: '提示过短',
          suggestion: '建议提供更详细的提示（至少20个字符）',
        });
      }
    });
  }

  /**
   * 验证上下文
   */
  private validateContext(context: any, result: ValidationResult): void {
    if (context.include_files && !Array.isArray(context.include_files)) {
      result.errors.push({
        field: 'context.include_files',
        message: 'include_files必须是数组',
        severity: 'error',
      });
    }

    if (context.exclude_files && !Array.isArray(context.exclude_files)) {
      result.errors.push({
        field: 'context.exclude_files',
        message: 'exclude_files必须是数组',
        severity: 'error',
      });
    }
  }

  /**
   * 验证输出
   */
  private validateOutput(output: any, result: ValidationResult): void {
    if (
      output.format &&
      typeof output.format === 'string' &&
      !['markdown', 'json', 'html', 'text'].includes(output.format)
    ) {
      result.warnings.push({
        field: 'output.format',
        message: '不支持的输出格式',
        suggestion: '建议使用: markdown, json, html, text',
      });
    }

    if (output.save_to && typeof output.save_to !== 'string') {
      result.errors.push({
        field: 'output.save_to',
        message: 'save_to必须是字符串',
        severity: 'error',
      });
    }
  }

  /**
   * 验证性能
   */
  private validatePerformance(config: Record<string, unknown>, result: ValidationResult): void {
    if (config.steps && Array.isArray(config.steps) && config.steps.length > 10) {
      result.warnings.push({
        field: 'steps',
        message: '步骤过多可能影响性能',
        suggestion: '考虑将复杂流程拆分为多个配置',
      });
    }

    // 检查循环引用
    if (this.hasCircularReference(config)) {
      result.errors.push({
        field: 'structure',
        message: '检测到循环引用',
        severity: 'error',
      });
    }
  }

  /**
   * 验证分析规则
   */
  private validateAnalysisRules(rules: any[], result: ValidationResult): void {
    rules.forEach((rule, index) => {
      const ruleField = `analysisRules[${index}]`;

      if (!rule.name) {
        result.errors.push({
          field: `${ruleField}.name`,
          message: '规则名称不能为空',
          severity: 'error',
        });
      }

      if (!rule.description) {
        result.errors.push({
          field: `${ruleField}.description`,
          message: '规则描述不能为空',
          severity: 'error',
        });
      }

      if (
        rule.severity &&
        typeof rule.severity === 'string' &&
        !['error', 'warning', 'info'].includes(rule.severity)
      ) {
        result.errors.push({
          field: `${ruleField}.severity`,
          message: '无效的严重级别',
          severity: 'error',
        });
      }
    });
  }

  /**
   * 验证编码标准
   */
  private validateCodingStandards(standards: any[], result: ValidationResult): void {
    standards.forEach((standard, index) => {
      const standardField = `codingStandards[${index}]`;

      if (!standard.name) {
        result.errors.push({
          field: `${standardField}.name`,
          message: '标准名称不能为空',
          severity: 'error',
        });
      }

      if (!standard.rules || !Array.isArray(standard.rules) || standard.rules.length === 0) {
        result.warnings.push({
          field: `${standardField}.rules`,
          message: '编码标准应包含具体规则',
          suggestion: '添加具体的编码规则列表',
        });
      }
    });
  }

  /**
   * 验证安全检查
   */
  private validateSecurityChecks(checks: any[], result: ValidationResult): void {
    checks.forEach((check, index) => {
      const checkField = `securityChecks[${index}]`;

      if (!check.name) {
        result.errors.push({
          field: `${checkField}.name`,
          message: '安全检查名称不能为空',
          severity: 'error',
        });
      }

      if (
        check.riskLevel &&
        typeof check.riskLevel === 'string' &&
        !['high', 'medium', 'low'].includes(check.riskLevel)
      ) {
        result.errors.push({
          field: `${checkField}.riskLevel`,
          message: '无效的风险级别',
          severity: 'error',
        });
      }
    });
  }

  /**
   * 验证性能检查
   */
  private validatePerformanceChecks(checks: any[], result: ValidationResult): void {
    checks.forEach((check, index) => {
      const checkField = `performanceChecks[${index}]`;

      if (!check.name) {
        result.errors.push({
          field: `${checkField}.name`,
          message: '性能检查名称不能为空',
          severity: 'error',
        });
      }

      if (
        check.impact &&
        typeof check.impact === 'string' &&
        !['high', 'medium', 'low'].includes(check.impact)
      ) {
        result.errors.push({
          field: `${checkField}.impact`,
          message: '无效的影响级别',
          severity: 'error',
        });
      }
    });
  }

  /**
   * 生成默认测试用例
   */
  private generateDefaultTestCases(config: LanguageAnalysisConfig): TestCase[] {
    const tests: TestCase[] = [];

    // 基本配置测试
    tests.push({
      name: 'basic_config_test',
      description: '基本配置完整性测试',
      input: JSON.stringify(config),
      expectedOutput: { valid: true },
      actualOutput: null,
    });

    // 文件扩展名测试
    if (config.fileExtensions.length > 0) {
      tests.push({
        name: 'file_extension_test',
        description: '文件扩展名格式测试',
        input: config.fileExtensions.join(','),
        expectedOutput: { validExtensions: true },
        actualOutput: null,
      });
    }

    // 分析规则测试
    config.analysisRules.forEach((rule, index: number) => {
      tests.push({
        name: `analysis_rule_${index}_test`,
        description: `分析规则 ${rule.name} 测试`,
        input: JSON.stringify(rule),
        expectedOutput: { ruleValid: true },
        actualOutput: null,
      });
    });

    return tests;
  }

  /**
   * 执行测试用例
   */
  private async executeTestCase(test: TestCase, config: LanguageAnalysisConfig): Promise<boolean> {
    try {
      // 这里可以实现具体的测试逻辑
      // 目前返回基本的验证结果

      if (test.name === 'basic_config_test') {
        const validation = this.validateLanguageConfig(config);
        test.actualOutput = { valid: validation.isValid };
        return validation.isValid;
      }

      if (test.name === 'file_extension_test') {
        const validExtensions = config.fileExtensions.every((ext: string) => ext.startsWith('.'));
        test.actualOutput = { validExtensions };
        return validExtensions;
      }

      if (test.name.startsWith('analysis_rule_')) {
        const ruleIndex = parseInt(test.name.match(/\d+/)?.[0] || '0');
        const rule = config.analysisRules[ruleIndex];
        const ruleValid = rule && rule.name && rule.description;
        test.actualOutput = { ruleValid };
        return !!ruleValid;
      }

      return true;
    } catch (error) {
      test.error = error instanceof Error ? error.message : '测试执行失败';
      return false;
    }
  }

  /**
   * 计算覆盖率
   */
  private calculateCoverage(
    config: LanguageAnalysisConfig,
    tests: TestCase[]
  ): TestResult['coverage'] {
    const totalRules = config.analysisRules.length;
    const totalStandards = config.codingStandards.length;
    const totalSecurityChecks = config.securityChecks.length;
    const totalPerformanceChecks = config.performanceChecks.length;

    const ruleTests = tests.filter(t => t.name.includes('analysis_rule')).length;
    const standardTests = tests.filter(t => t.name.includes('coding_standard')).length;
    const securityTests = tests.filter(t => t.name.includes('security_check')).length;
    const performanceTests = tests.filter(t => t.name.includes('performance_check')).length;

    return {
      rules: totalRules > 0 ? Math.round((ruleTests / totalRules) * 100) : 100,
      standards: totalStandards > 0 ? Math.round((standardTests / totalStandards) * 100) : 100,
      securityChecks:
        totalSecurityChecks > 0 ? Math.round((securityTests / totalSecurityChecks) * 100) : 100,
      performanceChecks:
        totalPerformanceChecks > 0
          ? Math.round((performanceTests / totalPerformanceChecks) * 100)
          : 100,
    };
  }

  /**
   * 检查循环引用
   */
  private hasCircularReference(obj: Record<string, unknown>, visited = new Set()): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    if (visited.has(obj)) {
      return true;
    }

    visited.add(obj);

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
          if (this.hasCircularReference(value as Record<string, unknown>, visited)) {
            return true;
          }
        }
      }
    }

    visited.delete(obj);
    return false;
  }

  /**
   * 生成验证报告
   */
  generateValidationReport(result: ValidationResult): string {
    let report = '# 配置验证报告\n\n';

    report += `## 验证结果: ${result.isValid ? '✅ 通过' : '❌ 失败'}\n\n`;

    if (result.errors.length > 0) {
      report += '## 🚨 错误\n\n';
      result.errors.forEach(error => {
        report += `- **${error.field}**: ${error.message}\n`;
      });
      report += '\n';
    }

    if (result.warnings.length > 0) {
      report += '## ⚠️ 警告\n\n';
      result.warnings.forEach(warning => {
        report += `- **${warning.field}**: ${warning.message}\n`;
        report += `  💡 建议: ${warning.suggestion}\n`;
      });
      report += '\n';
    }

    if (result.suggestions.length > 0) {
      report += '## 💡 建议\n\n';
      result.suggestions.forEach(suggestion => {
        report += `- ${suggestion}\n`;
      });
      report += '\n';
    }

    return report;
  }

  /**
   * 生成测试报告
   */
  generateTestReport(result: TestResult): string {
    let report = '# 配置测试报告\n\n';

    report += `## 测试结果: ${result.passed ? '✅ 通过' : '❌ 失败'}\n\n`;
    report += `- 总测试数: ${result.totalTests}\n`;
    report += `- 通过测试: ${result.passedTests}\n`;
    report += `- 失败测试: ${result.failedTests.length}\n\n`;

    report += '## 📊 覆盖率\n\n';
    report += `- 分析规则: ${result.coverage.rules}%\n`;
    report += `- 编码标准: ${result.coverage.standards}%\n`;
    report += `- 安全检查: ${result.coverage.securityChecks}%\n`;
    report += `- 性能检查: ${result.coverage.performanceChecks}%\n\n`;

    if (result.failedTests.length > 0) {
      report += '## ❌ 失败的测试\n\n';
      result.failedTests.forEach(test => {
        report += `### ${test.name}\n`;
        report += `**描述**: ${test.description}\n`;
        report += `**输入**: \`${test.input}\`\n`;
        report += `**期望输出**: \`${JSON.stringify(test.expectedOutput)}\`\n`;
        report += `**实际输出**: \`${JSON.stringify(test.actualOutput)}\`\n`;
        if (test.error) {
          report += `**错误**: ${test.error}\n`;
        }
        report += '\n';
      });
    }

    return report;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    // OutputManager handles disposal
  }
}
