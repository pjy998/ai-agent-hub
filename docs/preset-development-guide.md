# AI Agent Hub 预设系统开发指南

## 📋 概述

预设系统是 AI Agent Hub 的核心功能之一，允许用户定义和执行复杂的 AI 工作流。本指南详细说明了如何开发、配置和部署自定义预设。

## 🏗️ 预设系统架构

### 系统组件

```
预设系统架构
├── 预设定义层 (YAML/JSON)
│   ├── 基础预设 (agents/presets/)
│   ├── 用户预设 (user-presets/)
│   └── 社区预设 (community-presets/)
├── 预设解析器 (Preset Parser)
│   ├── YAML 解析
│   ├── 配置验证
│   └── 依赖检查
├── 工作流引擎 (Workflow Engine)
│   ├── 步骤执行器
│   ├── 上下文管理
│   └── 错误处理
└── 工具集成层 (Tools Integration)
    ├── 内置工具
    ├── 自定义工具
    └── 安全控制
```

### 预设生命周期

1. **定义阶段**: 编写 YAML/JSON 配置文件
2. **验证阶段**: 语法和依赖检查
3. **加载阶段**: 解析并注册到系统
4. **执行阶段**: 运行工作流步骤
5. **监控阶段**: 跟踪执行状态和结果

## 📝 预设结构规范

### 基础预设结构

```yaml
# 预设元信息
name: "preset-name"                    # 预设名称（必需）
description: "预设功能描述"             # 功能描述（必需）
version: "1.0.0"                      # 版本号（推荐）
author: "作者名称"                     # 作者信息（可选）
tags: ["tag1", "tag2"]               # 标签分类（可选）

# 代理配置
agents:                               # 使用的代理列表（必需）
  - requirements                      # 需求分析代理
  - coder                            # 编码代理
  - tester                           # 测试代理

# 工作流步骤
steps:                               # 执行步骤（必需）
  - name: "step-name"                # 步骤名称
    agent: "agent-name"              # 执行代理
    prompt: |                        # 提示模板
      执行指令和上下文
    output: "output-variable"         # 输出变量名
    condition: "{{variable}}"         # 执行条件（可选）
    timeout: 30000                   # 超时时间（可选）
    retry: 3                         # 重试次数（可选）

# 配置选项
configuration:                       # 配置参数（可选）
  max_context_size: 10000           # 最大上下文大小
  enable_caching: true               # 启用缓存
  security_level: "standard"         # 安全级别

# 输出配置
output:                              # 输出设置（可选）
  format: "markdown"                 # 输出格式
  save_to_file: true                 # 保存到文件
  file_pattern: "result-{timestamp}" # 文件命名模式
```

### 高级预设结构

```yaml
# 高级工作流配置
workflow:                            # 复杂工作流定义
  - step: "step-id"
    description: "步骤描述"
    action: "analyze|synthesize|execute" # 动作类型
    parameters:                      # 参数配置
      target: "analysis_target"
      options:
        depth: "deep"
        include_patterns: ["**/*.ts"]
        exclude_patterns: ["node_modules/**"]
    tools:                           # 使用的工具
      - "readFile"
      - "searchFile"
      - "runShell"
    dependencies:                    # 步骤依赖
      - "previous-step-id"
    parallel: false                  # 是否并行执行
    error_handling:                  # 错误处理
      strategy: "continue|stop|retry"
      max_retries: 3
      fallback_step: "fallback-step-id"

# 条件执行
conditionals:                        # 条件分支
  - condition: "{{analysis_result.priority}} == 'high'"
    steps: ["urgent-fix-step"]
  - condition: "{{file_type}} == 'typescript'"
    steps: ["ts-specific-step"]

# 并行执行
parallel_groups:                     # 并行执行组
  - name: "analysis-group"
    steps: ["code-analysis", "security-scan"]
    wait_for_all: true
  - name: "generation-group"
    steps: ["code-gen", "test-gen"]
    wait_for_all: false

# 输出配置
output:
  formats: ["markdown", "json", "html"] # 多种输出格式
  report_sections:                   # 报告章节
    - "executive_summary"
    - "detailed_analysis"
    - "recommendations"
  file_naming:
    pattern: "{name}-{timestamp}"
    timestamp_format: "YYYY-MM-DD-HHmm"
    output_directory: "reports/"

# 元数据
metadata:
  created_date: "2025-01-15"
  last_updated: "2025-01-15"
  compatible_versions: ["0.1.0+"]
  required_tools: ["readFile", "writeFile"]
  estimated_runtime: "2-5 minutes"
  category: "development"
  difficulty: "intermediate"
```

## 🛠️ 开发流程

### 1. 需求分析

在开发预设之前，明确以下问题：

- **目标用户**: 谁会使用这个预设？
- **使用场景**: 在什么情况下使用？
- **输入数据**: 需要什么样的输入？
- **期望输出**: 用户期望得到什么结果？
- **性能要求**: 执行时间和资源消耗限制

### 2. 设计工作流

#### 步骤分解

```yaml
# 示例：代码审查预设设计
name: "code-review"
description: "全面的代码审查工作流"

# 工作流设计
steps:
  # 第一步：代码分析
  - name: "analyze-code"
    agent: "coder"
    prompt: |
      分析以下代码的质量和潜在问题：
      文件：{{file}}
      代码：{{selection}}
      
      检查项目：
      1. 代码规范和风格
      2. 潜在的 bug 和错误
      3. 性能问题
      4. 安全漏洞
      5. 可维护性问题
    output: "analysis_result"
    
  # 第二步：生成建议
  - name: "generate-suggestions"
    agent: "requirements"
    prompt: |
      基于代码分析结果：{{analysis_result}}
      
      生成具体的改进建议：
      1. 优先级排序
      2. 具体修改方案
      3. 最佳实践建议
      4. 相关文档链接
    output: "suggestions"
    
  # 第三步：生成修复代码
  - name: "generate-fixes"
    agent: "coder"
    prompt: |
      根据分析结果和建议：
      分析：{{analysis_result}}
      建议：{{suggestions}}
      
      生成修复后的代码，确保：
      1. 解决识别的问题
      2. 保持原有功能
      3. 提高代码质量
      4. 添加必要的注释
    output: "fixed_code"
    condition: "{{analysis_result.has_issues}}"
```

#### 上下文变量设计

```yaml
# 上下文变量规划
variables:
  # 输入变量
  - name: "file"           # 当前文件路径
    type: "string"
    required: true
  - name: "selection"      # 选中的代码
    type: "string"
    required: false
  - name: "language"       # 编程语言
    type: "string"
    default: "typescript"
    
  # 中间变量
  - name: "analysis_result" # 分析结果
    type: "object"
    schema:
      has_issues: "boolean"
      severity: "string"
      issues: "array"
      
  # 输出变量
  - name: "final_report"   # 最终报告
    type: "string"
    format: "markdown"
```

### 3. 实现和测试

#### 开发环境设置

```bash
# 1. 创建预设目录
mkdir -p agents/presets/custom

# 2. 创建预设文件
touch agents/presets/custom/my-preset.yaml

# 3. 配置开发环境
npm run dev
```

#### 预设验证

```typescript
// 预设验证脚本示例
import { PresetValidator } from '../src/preset/validator';

const validator = new PresetValidator();
const preset = await validator.loadPreset('my-preset.yaml');

// 语法验证
const syntaxResult = await validator.validateSyntax(preset);
if (!syntaxResult.valid) {
  console.error('语法错误:', syntaxResult.errors);
}

// 依赖验证
const depsResult = await validator.validateDependencies(preset);
if (!depsResult.valid) {
  console.error('依赖错误:', depsResult.missing);
}

// 安全验证
const securityResult = await validator.validateSecurity(preset);
if (!securityResult.safe) {
  console.error('安全问题:', securityResult.issues);
}
```

#### 单元测试

```typescript
// 预设测试示例
describe('MyPreset', () => {
  let preset: Preset;
  let mockContext: ExecutionContext;
  
  beforeEach(() => {
    preset = new Preset('my-preset.yaml');
    mockContext = createMockContext({
      file: 'test.ts',
      selection: 'function test() { return true; }'
    });
  });
  
  it('should execute successfully', async () => {
    const result = await preset.execute(mockContext);
    expect(result.success).toBe(true);
    expect(result.outputs).toBeDefined();
  });
  
  it('should handle errors gracefully', async () => {
    mockContext.file = 'non-existent.ts';
    const result = await preset.execute(mockContext);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

## 🎯 预设类型和模板

### 1. 代码分析类预设

```yaml
name: "code-analyzer"
description: "代码质量分析预设模板"
template_type: "analysis"

steps:
  - name: "scan"
    agent: "coder"
    prompt: |
      扫描代码文件：{{file}}
      分析范围：{{scope | default('full')}}
      
      执行以下分析：
      1. 语法检查
      2. 代码复杂度
      3. 潜在问题识别
      4. 性能瓶颈分析
    output: "scan_result"
    
  - name: "report"
    agent: "requirements"
    prompt: |
      生成分析报告：{{scan_result}}
      
      报告格式：
      - 执行摘要
      - 详细发现
      - 改进建议
      - 优先级排序
    output: "analysis_report"
```

### 2. 代码生成类预设

```yaml
name: "code-generator"
description: "代码生成预设模板"
template_type: "generation"

steps:
  - name: "analyze-requirements"
    agent: "requirements"
    prompt: |
      分析需求：{{requirements}}
      目标语言：{{language}}
      
      确定：
      1. 功能规格
      2. 接口设计
      3. 实现策略
      4. 测试需求
    output: "spec"
    
  - name: "generate-code"
    agent: "coder"
    prompt: |
      根据规格生成代码：{{spec}}
      
      要求：
      1. 遵循最佳实践
      2. 包含错误处理
      3. 添加文档注释
      4. 确保类型安全
    output: "generated_code"
    
  - name: "generate-tests"
    agent: "tester"
    prompt: |
      为生成的代码创建测试：{{generated_code}}
      
      测试覆盖：
      1. 单元测试
      2. 集成测试
      3. 边界条件
      4. 错误场景
    output: "test_code"
```

### 3. 重构类预设

```yaml
name: "refactoring-assistant"
description: "代码重构助手预设模板"
template_type: "refactoring"

steps:
  - name: "identify-issues"
    agent: "coder"
    prompt: |
      识别重构机会：{{selection}}
      
      检查：
      1. 代码异味
      2. 重复代码
      3. 复杂度过高
      4. 设计模式机会
    output: "refactor_opportunities"
    
  - name: "plan-refactoring"
    agent: "requirements"
    prompt: |
      制定重构计划：{{refactor_opportunities}}
      
      计划包含：
      1. 重构步骤
      2. 风险评估
      3. 测试策略
      4. 回滚方案
    output: "refactor_plan"
    
  - name: "execute-refactoring"
    agent: "coder"
    prompt: |
      执行重构：{{refactor_plan}}
      原代码：{{selection}}
      
      确保：
      1. 功能等价性
      2. 性能不降低
      3. 可读性提升
      4. 维护性改善
    output: "refactored_code"
```

## 🔧 高级功能

### 1. 条件执行

```yaml
# 条件执行示例
steps:
  - name: "check-file-type"
    agent: "coder"
    prompt: "检查文件类型：{{file}}"
    output: "file_info"
    
  - name: "typescript-analysis"
    agent: "coder"
    prompt: "TypeScript 特定分析"
    output: "ts_analysis"
    condition: "{{file_info.language}} == 'typescript'"
    
  - name: "javascript-analysis"
    agent: "coder"
    prompt: "JavaScript 特定分析"
    output: "js_analysis"
    condition: "{{file_info.language}} == 'javascript'"
```

### 2. 循环执行

```yaml
# 循环处理多个文件
steps:
  - name: "process-files"
    agent: "coder"
    prompt: |
      处理文件：{{current_file}}
      进度：{{loop.index + 1}}/{{loop.total}}
    output: "file_result"
    loop:
      items: "{{file_list}}"
      variable: "current_file"
      parallel: true
      max_concurrent: 3
```

### 3. 错误处理

```yaml
# 错误处理和重试
steps:
  - name: "risky-operation"
    agent: "coder"
    prompt: "执行可能失败的操作"
    output: "operation_result"
    error_handling:
      strategy: "retry"
      max_retries: 3
      retry_delay: 1000
      fallback_step: "fallback-operation"
      
  - name: "fallback-operation"
    agent: "coder"
    prompt: "执行备用操作"
    output: "fallback_result"
```

### 4. 并行执行

```yaml
# 并行执行多个分析
parallel_groups:
  - name: "analysis-group"
    steps:
      - name: "security-scan"
        agent: "coder"
        prompt: "安全扫描"
        output: "security_result"
        
      - name: "performance-analysis"
        agent: "coder"
        prompt: "性能分析"
        output: "performance_result"
        
      - name: "quality-check"
        agent: "coder"
        prompt: "质量检查"
        output: "quality_result"
    wait_for_all: true
    timeout: 60000
```

## 🔒 安全最佳实践

### 1. 输入验证

```yaml
# 输入验证配置
input_validation:
  file:
    type: "string"
    pattern: "^[a-zA-Z0-9._/-]+$"
    max_length: 500
    required: true
    
  selection:
    type: "string"
    max_length: 50000
    sanitize: true
    
  custom_param:
    type: "object"
    schema:
      name: { type: "string", required: true }
      value: { type: "number", min: 0, max: 100 }
```

### 2. 权限控制

```yaml
# 权限和安全配置
security:
  required_permissions:
    - "file.read"
    - "file.write"
  
  restricted_operations:
    - "shell.execute"
    - "network.request"
    
  sandbox:
    enabled: true
    allowed_paths:
      - "./src/**"
      - "./tests/**"
    blocked_paths:
      - "./node_modules/**"
      - "./.*"
      
  resource_limits:
    max_execution_time: 300000  # 5分钟
    max_memory_usage: "256MB"
    max_file_size: "10MB"
```

### 3. 敏感数据处理

```yaml
# 敏感数据保护
data_protection:
  sensitive_patterns:
    - "password"
    - "api[_-]?key"
    - "secret"
    - "token"
    
  redaction:
    enabled: true
    replacement: "[REDACTED]"
    
  logging:
    exclude_sensitive: true
    hash_identifiers: true
```

## 📊 性能优化

### 1. 缓存策略

```yaml
# 缓存配置
caching:
  enabled: true
  strategy: "smart"  # none | basic | smart | aggressive
  
  cache_keys:
    - "file_content:{{file_hash}}"
    - "analysis_result:{{file_hash}}:{{analysis_type}}"
    
  ttl: 3600  # 1小时
  max_size: "100MB"
  
  invalidation:
    on_file_change: true
    on_config_change: true
```

### 2. 资源管理

```yaml
# 资源管理配置
resource_management:
  memory:
    max_usage: "512MB"
    gc_threshold: "256MB"
    
  cpu:
    max_usage: 80  # 百分比
    priority: "normal"  # low | normal | high
    
  io:
    max_concurrent_reads: 10
    max_concurrent_writes: 5
    buffer_size: "64KB"
```

## 📚 社区和分享

### 1. 预设发布

```yaml
# 发布配置
publication:
  registry: "ai-agent-hub-registry"
  category: "development"
  tags: ["typescript", "analysis", "quality"]
  
  metadata:
    license: "MIT"
    homepage: "https://github.com/user/preset"
    repository: "https://github.com/user/preset.git"
    
  dependencies:
    ai_agent_hub: ">=0.1.0"
    tools:
      - "readFile@1.0.0"
      - "writeFile@1.0.0"
```

### 2. 版本管理

```yaml
# 版本控制
versioning:
  current: "1.2.0"
  compatibility:
    min_version: "1.0.0"
    max_version: "2.0.0"
    
  changelog:
    - version: "1.2.0"
      date: "2025-01-15"
      changes:
        - "添加错误处理改进"
        - "优化性能"
        - "修复已知问题"
    - version: "1.1.0"
      date: "2025-01-01"
      changes:
        - "新增并行执行支持"
        - "改进用户体验"
```

## 🐛 调试和故障排除

### 1. 调试配置

```yaml
# 调试设置
debugging:
  enabled: true
  log_level: "debug"  # error | warn | info | debug | trace
  
  trace:
    execution_steps: true
    variable_changes: true
    tool_calls: true
    
  breakpoints:
    - step: "analyze-code"
      condition: "{{file}} contains 'debug'"
    - step: "generate-suggestions"
      always: true
```

### 2. 错误诊断

```typescript
// 错误诊断工具
import { PresetDiagnostics } from '../src/preset/diagnostics';

const diagnostics = new PresetDiagnostics();

// 执行诊断
const report = await diagnostics.diagnose('my-preset.yaml', {
  checkSyntax: true,
  checkDependencies: true,
  checkPerformance: true,
  checkSecurity: true
});

// 输出诊断结果
console.log('诊断报告:', report);
if (report.issues.length > 0) {
  console.error('发现问题:', report.issues);
}
```

### 3. 性能分析

```yaml
# 性能分析配置
profiling:
  enabled: true
  
  metrics:
    - "execution_time"
    - "memory_usage"
    - "tool_call_count"
    - "cache_hit_rate"
    
  output:
    format: "json"
    file: "performance-report.json"
    
  alerts:
    slow_execution: 30000  # 30秒
    high_memory: "256MB"
    low_cache_hit: 0.5  # 50%
```

## 📖 示例和教程

### 完整示例：代码审查预设

```yaml
name: "comprehensive-code-review"
description: "全面的代码审查工作流，包含质量分析、安全检查和改进建议"
version: "1.0.0"
author: "AI Agent Hub Team"
tags: ["code-review", "quality", "security"]

# 输入参数定义
inputs:
  file:
    type: "string"
    description: "要审查的文件路径"
    required: true
  selection:
    type: "string"
    description: "选中的代码片段"
    required: false
  review_type:
    type: "string"
    description: "审查类型"
    enum: ["quick", "standard", "comprehensive"]
    default: "standard"

# 代理配置
agents:
  - coder
  - requirements
  - tester

# 工作流步骤
steps:
  # 第一步：代码质量分析
  - name: "quality-analysis"
    agent: "coder"
    description: "分析代码质量和潜在问题"
    prompt: |
      请对以下代码进行全面的质量分析：
      
      文件路径：{{file}}
      代码内容：{{selection || '整个文件'}}
      审查级别：{{review_type}}
      
      请分析以下方面：
      1. 代码规范和风格一致性
      2. 逻辑错误和潜在 bug
      3. 性能问题和优化机会
      4. 代码复杂度和可读性
      5. 错误处理的完整性
      6. 文档和注释的充分性
      
      请以 JSON 格式返回分析结果：
      {
        "overall_score": 0-100,
        "issues": [
          {
            "type": "error|warning|suggestion",
            "category": "style|logic|performance|complexity|documentation",
            "description": "问题描述",
            "line": "行号（如果适用）",
            "severity": "high|medium|low",
            "suggestion": "改进建议"
          }
        ],
        "metrics": {
          "complexity": 0-10,
          "maintainability": 0-100,
          "test_coverage": 0-100
        }
      }
    output: "quality_analysis"
    timeout: 60000
    
  # 第二步：安全检查
  - name: "security-check"
    agent: "coder"
    description: "检查安全漏洞和风险"
    prompt: |
      请对以下代码进行安全检查：
      
      文件：{{file}}
      代码：{{selection || '整个文件'}}
      
      重点检查：
      1. 输入验证和清理
      2. SQL 注入风险
      3. XSS 攻击防护
      4. 敏感数据处理
      5. 权限和访问控制
      6. 加密和哈希使用
      7. 依赖安全性
      
      返回 JSON 格式的安全报告：
      {
        "security_score": 0-100,
        "vulnerabilities": [
          {
            "type": "vulnerability_type",
            "severity": "critical|high|medium|low",
            "description": "漏洞描述",
            "location": "代码位置",
            "remediation": "修复建议"
          }
        ],
        "recommendations": ["安全建议列表"]
      }
    output: "security_analysis"
    condition: "{{review_type}} != 'quick'"
    
  # 第三步：生成改进建议
  - name: "generate-recommendations"
    agent: "requirements"
    description: "基于分析结果生成改进建议"
    prompt: |
      基于以下分析结果，生成具体的改进建议：
      
      质量分析：{{quality_analysis}}
      安全分析：{{security_analysis || '未执行安全检查'}}
      
      请生成：
      1. 优先级排序的改进建议
      2. 具体的实施步骤
      3. 预期的改进效果
      4. 实施的风险评估
      
      返回格式化的建议报告。
    output: "recommendations"
    
  # 第四步：生成修复代码（可选）
  - name: "generate-fixes"
    agent: "coder"
    description: "生成修复后的代码"
    prompt: |
      基于以下分析和建议，生成修复后的代码：
      
      原始代码：{{selection}}
      质量问题：{{quality_analysis.issues}}
      安全问题：{{security_analysis.vulnerabilities || []}}
      改进建议：{{recommendations}}
      
      请生成：
      1. 修复后的完整代码
      2. 修改说明和注释
      3. 需要注意的事项
      
      确保修复后的代码：
      - 解决了识别的问题
      - 保持了原有功能
      - 提高了代码质量
      - 遵循了最佳实践
    output: "fixed_code"
    condition: "{{quality_analysis.overall_score}} < 80 && {{review_type}} == 'comprehensive'"
    
  # 第五步：生成测试代码
  - name: "generate-tests"
    agent: "tester"
    description: "生成测试代码"
    prompt: |
      为以下代码生成全面的测试：
      
      代码：{{fixed_code || selection}}
      质量分析：{{quality_analysis}}
      
      生成测试覆盖：
      1. 正常流程测试
      2. 边界条件测试
      3. 错误处理测试
      4. 性能测试（如果需要）
      
      使用适当的测试框架和断言。
    output: "test_code"
    condition: "{{review_type}} == 'comprehensive'"

# 输出配置
output:
  format: "markdown"
  template: |
    # 代码审查报告
    
    ## 概览
    - 文件：{{file}}
    - 审查类型：{{review_type}}
    - 总体评分：{{quality_analysis.overall_score}}/100
    
    ## 质量分析
    {{quality_analysis | format_analysis}}
    
    {{#if security_analysis}}
    ## 安全检查
    {{security_analysis | format_security}}
    {{/if}}
    
    ## 改进建议
    {{recommendations}}
    
    {{#if fixed_code}}
    ## 修复代码
    ```{{language}}
    {{fixed_code}}
    ```
    {{/if}}
    
    {{#if test_code}}
    ## 测试代码
    ```{{language}}
    {{test_code}}
    ```
    {{/if}}
  
  save_to_file: true
  file_pattern: "code-review-{{file | basename}}-{{timestamp}}"

# 配置选项
configuration:
  max_context_size: 20000
  enable_caching: true
  cache_ttl: 1800  # 30分钟
  security_level: "standard"
  
# 性能配置
performance:
  timeout: 300000  # 5分钟
  max_retries: 2
  parallel_execution: false
  
# 元数据
metadata:
  created_date: "2025-01-15"
  last_updated: "2025-01-15"
  compatible_versions: ["0.1.0+"]
  required_tools: ["readFile", "writeFile"]
  estimated_runtime: "2-5 minutes"
  category: "code-quality"
  difficulty: "intermediate"
  license: "MIT"
```

## 🚀 部署和发布

### 1. 预设验证清单

- [ ] 语法正确性检查
- [ ] 依赖完整性验证
- [ ] 安全性审查
- [ ] 性能测试
- [ ] 文档完整性
- [ ] 示例和教程
- [ ] 版本兼容性
- [ ] 许可证合规

### 2. 发布流程

```bash
# 1. 验证预设
npm run validate-preset my-preset.yaml

# 2. 运行测试
npm run test-preset my-preset.yaml

# 3. 生成文档
npm run generate-docs my-preset.yaml

# 4. 打包发布
npm run publish-preset my-preset.yaml
```

### 3. 社区贡献

1. **Fork 项目**：从主仓库 fork 代码
2. **创建分支**：为新预设创建特性分支
3. **开发预设**：按照本指南开发预设
4. **测试验证**：确保预设正常工作
5. **提交 PR**：提交 Pull Request
6. **代码审查**：参与代码审查过程
7. **合并发布**：通过审查后合并到主分支

## 📞 支持和反馈

- **文档**: [AI Agent Hub 文档](../README.md)
- **问题报告**: [GitHub Issues](https://github.com/ai-agent-hub/issues)
- **功能请求**: [GitHub Discussions](https://github.com/ai-agent-hub/discussions)
- **社区交流**: [Discord 频道](https://discord.gg/ai-agent-hub)

---

*最后更新: 2025年1月15日*  
*下次审查: 2025年2月15日*