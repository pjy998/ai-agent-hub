# C# 编码规范分析指南

本指南说明如何使用 AI Agent Hub 的 C# 编码规范分析预设来分析外部 C# 项目。

## 概述

基于微软官方编码规范 <mcreference link="https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions" index="0">0</mcreference>，我们提供了一个全面的 C# 项目分析工具，可以帮助开发团队：

- 检查代码是否符合微软编码规范
- 评估代码质量和可维护性
- 识别潜在的安全问题
- 生成详细的改进建议
- 提供自动化工具配置

## 分析预设功能

### 核心分析能力

1. **编码规范检查**
   - 命名约定（PascalCase、camelCase）
   - 代码格式（缩进、大括号位置）
   - 语言特性使用（var、语言关键字）
   - 代码组织（using语句、命名空间）

2. **代码质量评估**
   - 复杂度分析（圈复杂度、继承深度）
   - 可维护性（代码重复、方法长度）
   - 可读性（注释覆盖率、命名清晰度）
   - 性能考虑（字符串操作、资源释放）

3. **安全性审查**
   - 输入验证和注入防护
   - 敏感数据处理
   - 异常处理安全性

## 使用方法

### 前置条件

1. 确保 AI Agent Hub 已正确安装和配置
2. 准备要分析的 C# 项目路径
3. 确保有足够的磁盘空间存储分析报告

### 执行分析

#### 方法一：通过 VS Code 扩展

1. 在 VS Code 中打开 AI Agent Hub
2. 选择 "C# Coding Standards Analysis" 预设
3. 配置分析参数：
   ```json
   {
     "project_path": "C:\\path\\to\\your\\csharp\\project",
     "analysis_depth": "comprehensive",
     "include_examples": true,
     "generate_editorconfig": true
   }
   ```
4. 启动分析流程

#### 方法二：通过命令行

```bash
# 导航到 AI Agent Hub 目录
cd ai-agent-hub

# 执行分析预设
npm run analyze -- --preset=csharp-coding-standards-analysis --project="C:\path\to\project"
```

### 配置选项

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `project_path` | string | 必填 | 要分析的 C# 项目根目录 |
| `analysis_depth` | enum | comprehensive | 分析深度：basic/standard/comprehensive |
| `include_examples` | boolean | true | 是否在报告中包含代码示例 |
| `generate_editorconfig` | boolean | true | 是否生成 EditorConfig 文件 |
| `generate_ruleset` | boolean | true | 是否生成代码分析规则集 |
| `max_file_size` | string | 1MB | 单个文件最大分析大小 |
| `timeout` | string | 30m | 分析超时时间 |

## 分析报告

### 报告结构

分析完成后，将在 `./reports/` 目录下生成详细报告：

```
reports/
├── csharp-standards-analysis-{timestamp}.md
├── editorconfig-suggestion.txt
├── ruleset-configuration.xml
└── improvement-checklist.md
```

### 报告内容

#### 1. 执行摘要
- 项目基本信息（文件数量、代码行数）
- 总体评分和符合度
- 主要发现和关键问题

#### 2. 详细分析

**编码规范符合度**
- 命名约定检查结果
- 代码格式规范性
- 语言特性使用情况

**代码质量评估**
- 复杂度分析图表
- 可维护性指标
- 性能问题识别

**安全性评估**
- 安全漏洞风险等级
- 输入验证覆盖率
- 敏感数据处理审查

#### 3. 问题清单

按优先级分类的问题列表：

**高优先级问题**
- 安全漏洞
- 严重违反编码规范
- 性能瓶颈

**中优先级问题**
- 可维护性问题
- 代码重复
- 命名不规范

**低优先级问题**
- 代码风格不一致
- 注释不完整
- 格式问题

#### 4. 改进计划

**短期改进（1-2周）**
- 修复安全问题
- 统一命名规范
- 添加必要注释

**中期改进（1-2月）**
- 重构复杂方法
- 消除代码重复
- 优化性能瓶颈

**长期改进（3-6月）**
- 架构优化
- 测试覆盖率提升
- 文档完善

#### 5. 工具配置

**EditorConfig 配置**
```ini
root = true

[*.cs]
charset = utf-8
indent_style = space
indent_size = 4
insert_final_newline = true
trim_trailing_whitespace = true

# C# 编码规范
dotnet_naming_rule.interfaces_should_be_prefixed_with_i.severity = warning
dotnet_naming_rule.interfaces_should_be_prefixed_with_i.symbols = interface
dotnet_naming_rule.interfaces_should_be_prefixed_with_i.style = prefix_interface_with_i
```

**代码分析规则集**
```xml
<?xml version="1.0" encoding="utf-8"?>
<RuleSet Name="Microsoft C# Coding Standards" ToolsVersion="16.0">
  <Rules AnalyzerId="Microsoft.CodeAnalysis.CSharp" RuleNamespace="Microsoft.CodeAnalysis.CSharp">
    <Rule Id="CS1591" Action="Warning" />
    <Rule Id="CA1303" Action="Warning" />
    <Rule Id="CA1304" Action="Warning" />
  </Rules>
</RuleSet>
```

## 最佳实践

### 分析前准备

1. **确保项目可编译**
   - 解决编译错误
   - 安装必要的 NuGet 包
   - 配置正确的目标框架

2. **备份项目**
   - 提交当前更改到版本控制
   - 创建分析分支

3. **团队协调**
   - 通知团队成员分析计划
   - 确定改进优先级
   - 分配责任人

### 分析结果应用

1. **逐步改进**
   - 优先处理高优先级问题
   - 分批次进行代码修改
   - 每次修改后进行测试

2. **工具集成**
   - 将生成的 EditorConfig 添加到项目
   - 配置 IDE 代码分析规则
   - 集成到 CI/CD 流水线

3. **持续监控**
   - 定期重新分析
   - 跟踪改进进度
   - 更新团队编码标准

## 常见问题

### Q: 分析大型项目时性能如何？
A: 分析工具针对大型项目进行了优化，支持并行处理和增量分析。对于超大项目（>100万行代码），建议分模块进行分析。

### Q: 如何处理第三方代码？
A: 可以通过配置排除模式忽略第三方代码：
```yaml
exclude_patterns:
  - "**/packages/**"
  - "**/bin/**"
  - "**/obj/**"
  - "**/ThirdParty/**"
```

### Q: 分析结果如何与团队分享？
A: 生成的 Markdown 报告可以直接在 GitHub/GitLab 中查看，也可以转换为 HTML 或 PDF 格式分享。

### Q: 如何自定义分析规则？
A: 可以修改预设文件中的分析规则，或创建自定义的分析预设。详见 <mcfile name="preset-development-guide.md" path="docs/preset-development-guide.md"></mcfile>。

## 技术支持

如果在使用过程中遇到问题，可以通过以下方式获取支持：

1. **文档资源**
   - <mcfile name="README.md" path="README.md"></mcfile>
   - <mcfile name="preset-development-guide.md" path="docs/preset-development-guide.md"></mcfile>

2. **社区支持**
   - GitHub Issues
   - 开发者论坛
   - 技术交流群

3. **专业服务**
   - 企业级技术支持
   - 定制化分析服务
   - 团队培训服务

---

*本指南基于微软官方编码规范制定，持续更新以反映最新的最佳实践。*