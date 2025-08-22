# 动态配置生成功能

## 概述

AI Agent Hub 现在支持通过 Copilot Chat 动态生成多语言代码分析配置，无需手动编写复杂的 YAML 配置文件。

## 功能特性

### 🚀 核心功能

- **多语言支持**: 支持 C#、Java、Python、JavaScript、TypeScript、Vue.js、Go、Rust 等主流编程语言
- **AI 驱动生成**: 通过 Copilot Chat 智能生成配置
- **模板系统**: 内置语言特定的分析模板
- **配置验证**: 自动验证生成的配置文件
- **配置测试**: 测试配置的有效性和完整性

### 📋 支持的命令

| 命令 | 描述 | 示例 |
|------|------|------|
| `@ai-agent.config generate <language>` | 为指定语言生成分析配置 | `@ai-agent.config generate java` |
| `@ai-agent.config list` | 显示所有支持的编程语言 | `@ai-agent.config list` |
| `@ai-agent.config detect` | 自动检测当前项目的编程语言 | `@ai-agent.config detect` |
| `@ai-agent.config custom <requirements>` | 根据需求生成自定义配置 | `@ai-agent.config custom 检查Spring Boot安全性` |
| `@ai-agent.config validate <file>` | 验证YAML配置文件 | `@ai-agent.config validate config.yaml` |
| `@ai-agent.config test <file>` | 测试配置的有效性 | `@ai-agent.config test config.yaml` |
| `@ai-agent.config help` | 显示帮助信息 | `@ai-agent.config help` |

## 使用指南

### 1. 生成语言特定配置

```
@ai-agent.config generate java
```

这将为 Java 项目生成一个包含以下内容的完整配置：
- 代码质量检查
- 安全性分析
- 性能优化建议
- 测试覆盖率分析
- 依赖管理检查

### 2. 自定义配置生成

```
@ai-agent.config custom 我需要检查Spring Boot项目的安全漏洞和性能问题
```

AI 将根据您的具体需求生成定制化的分析配置。

### 3. 项目语言检测

```
@ai-agent.config detect
```

自动扫描当前工作区，识别项目中使用的编程语言。

### 4. 配置验证

```
@ai-agent.config validate my-config.yaml
```

验证配置文件的语法和结构是否正确。

### 5. 配置测试

```
@ai-agent.config test my-config.yaml
```

测试配置文件是否能够正常执行。

## 配置文件结构

生成的 YAML 配置文件包含以下主要部分：

```yaml
name: "配置名称"
description: "配置描述"
version: "1.0.0"

# 上下文配置
context:
  include_files:
    - "**/*.java"
  exclude_files:
    - "**/target/**"
  max_file_size: 1048576

# 分析步骤
steps:
  - name: "代码质量检查"
    description: "检查代码质量和最佳实践"
    prompt: |
      请分析代码质量...
    context:
      include_files:
        - "**/*.java"

# 输出配置
output:
  format: "markdown"
  save_to: "analysis-report.md"

# 分析规则
rules:
  code_quality:
    - name: "命名规范检查"
      severity: "warning"
      pattern: "^[A-Z][a-zA-Z0-9]*$"
```

## 语言模板

### 支持的编程语言

| 语言 | 文件扩展名 | 特色检查 |
|------|------------|----------|
| C# | `.cs`, `.csproj` | Microsoft 编码规范、.NET 安全性 |
| Java | `.java`, `.xml`, `.gradle` | Spring 框架、Maven/Gradle 依赖 |
| Python | `.py`, `.requirements.txt` | PEP 8 规范、Django/Flask 安全性 |
| JavaScript | `.js`, `.json`, `.package.json` | ESLint 规则、Node.js 安全性 |
| TypeScript | `.ts`, `.tsx`, `.tsconfig.json` | TypeScript 类型检查、React 最佳实践 |
| Vue.js | `.vue`, `.js`, `.ts` | Vue 组件规范、Vuex 状态管理 |
| Go | `.go`, `.mod` | Go 编码规范、并发安全性 |
| Rust | `.rs`, `.toml` | Rust 所有权模型、内存安全性 |

### 分析维度

每个语言模板都包含以下分析维度：

1. **代码质量**
   - 命名规范
   - 代码复杂度
   - 设计模式
   - 最佳实践

2. **安全性检查**
   - 常见漏洞检测
   - 敏感信息泄露
   - 输入验证
   - 权限控制

3. **性能优化**
   - 算法复杂度
   - 内存使用
   - 数据库查询
   - 缓存策略

4. **编码标准**
   - 语言特定规范
   - 团队约定
   - 文档要求
   - 测试覆盖率

## 配置验证

### 验证规则

配置验证器会检查以下内容：

- **基本结构**: 必需字段是否存在
- **步骤验证**: 每个步骤是否有效
- **上下文验证**: 文件路径和模式是否正确
- **输出验证**: 输出格式是否支持
- **性能检查**: 配置是否会影响性能

### 验证报告

验证完成后会生成详细报告：

```markdown
# 配置验证报告

## 验证结果: ✅ 通过

## ⚠️ 警告

- **steps[0].prompt**: 提示过短
  💡 建议: 建议提供更详细的提示（至少20个字符）

## 💡 建议

- 考虑将复杂流程拆分为多个配置
- 添加更多的示例和说明
```

## 配置测试

### 测试类型

1. **基本配置测试**: 验证配置完整性
2. **文件扩展名测试**: 检查文件模式匹配
3. **分析规则测试**: 验证每个规则的有效性
4. **步骤执行测试**: 模拟步骤执行过程

### 测试报告

```markdown
# 配置测试报告

## 测试结果: ✅ 通过

- 总测试数: 15
- 通过测试: 15
- 失败测试: 0

## 📊 覆盖率

- 分析规则: 100%
- 编码标准: 95%
- 安全检查: 100%
- 性能检查: 90%
```

## 最佳实践

### 1. 配置命名

- 使用描述性的名称
- 包含语言和用途信息
- 遵循一致的命名约定

```yaml
name: "Java Spring Boot 安全性分析"
description: "针对Spring Boot应用的安全漏洞检测和最佳实践检查"
```

### 2. 步骤设计

- 每个步骤专注于特定领域
- 提供清晰的提示词
- 合理设置文件包含/排除规则

```yaml
steps:
  - name: "安全性分析"
    description: "检查常见安全漏洞"
    prompt: |
      请检查以下安全问题：
      1. SQL注入风险
      2. XSS攻击防护
      3. 认证授权机制
    context:
      include_files:
        - "**/src/main/java/**/*.java"
      exclude_files:
        - "**/test/**"
```

### 3. 规则配置

- 设置合适的严重级别
- 提供准确的匹配模式
- 包含详细的描述和示例

```yaml
rules:
  security:
    - name: "SQL注入检查"
      severity: "error"
      pattern: "Statement.*execute.*\+"
      description: "检测潜在的SQL注入风险"
      examples:
        - "Statement stmt = conn.createStatement(); stmt.execute(\"SELECT * FROM users WHERE id = \" + userId);"
```

### 4. 输出优化

- 选择合适的输出格式
- 包含必要的统计信息
- 提供可操作的建议

```yaml
output:
  format: "markdown"
  save_to: "security-analysis-report.md"
  include_summary: true
  include_metrics: true
  sections:
    - "安全漏洞概览"
    - "详细分析结果"
    - "修复建议"
    - "最佳实践指南"
```

## 故障排除

### 常见问题

1. **Copilot Chat 不可用**
   - 确保已安装并登录 GitHub Copilot
   - 检查 VS Code 扩展是否最新
   - 重启 VS Code 并重试

2. **配置生成失败**
   - 检查网络连接
   - 简化需求描述
   - 使用预定义模板作为备选

3. **配置验证错误**
   - 检查 YAML 语法
   - 确认必需字段已填写
   - 参考示例配置文件

4. **配置测试失败**
   - 检查文件路径是否正确
   - 确认工作区已打开
   - 验证配置文件权限

### 调试技巧

1. **启用详细日志**
   ```
   在 VS Code 设置中启用 "ai-agent-hub.debug" 选项
   ```

2. **检查输出面板**
   ```
   查看 "AI Agent Hub - Config Generator" 输出面板
   ```

3. **逐步验证**
   ```
   先验证配置，再进行测试
   分步骤检查每个组件
   ```

## 示例配置

查看 `examples/` 目录中的示例配置文件：

- `java-analysis-config.yaml` - Java 项目完整分析配置
- `csharp-security-config.yaml` - C# 安全性检查配置
- `python-performance-config.yaml` - Python 性能优化配置
- `vue-component-config.yaml` - Vue.js 组件分析配置

## 扩展开发

### 添加新语言支持

1. 在 `LanguageTemplates.ts` 中添加新的语言模板
2. 定义语言特定的分析规则
3. 创建示例配置文件
4. 更新文档

### 自定义分析规则

1. 扩展 `AnalysisRule` 接口
2. 实现规则验证逻辑
3. 添加规则测试用例
4. 更新配置验证器

## 贡献指南

欢迎贡献新的语言模板、分析规则和功能改进：

1. Fork 项目仓库
2. 创建功能分支
3. 添加测试用例
4. 提交 Pull Request

## 许可证

本项目采用 MIT 许可证，详见 LICENSE 文件。