# 扩展语言支持指南

本指南详细说明如何为 AI Agent Hub 添加更多编程语言的支持。

## 概述

AI Agent Hub 提供了三种方式来扩展语言支持：

1. **内置模板扩展** - 直接修改内置语言模板
2. **YAML 配置文件** - 通过 YAML 文件定义新语言
3. **JavaScript 插件** - 开发功能完整的语言插件

## 方法一：内置模板扩展

### 步骤 1：修改 LanguageTemplates.ts

在 `src/templates/LanguageTemplates.ts` 中添加新语言模板：

```typescript
// 在 initialize() 方法中添加
this.registerTemplate('新语言名称', {
    language: '新语言名称',
    fileExtensions: ['.ext1', '.ext2'],
    analysisRules: [
        {
            name: '规则名称',
            description: '规则描述',
            severity: 'warning',
            pattern: '正则表达式模式'
        }
    ],
    codingStandards: [
        {
            name: '编码标准名称',
            description: '标准描述',
            rules: ['规则1', '规则2']
        }
    ],
    securityChecks: [
        {
            name: '安全检查名称',
            description: '检查描述',
            severity: 'error',
            pattern: '检查模式'
        }
    ],
    performanceChecks: [
        {
            name: '性能检查名称',
            description: '检查描述',
            impact: 'high',
            suggestion: '优化建议'
        }
    ],
    frameworkConfigs: {
        '框架名称': {
            dependencies: ['依赖1', '依赖2'],
            configFiles: ['配置文件1', '配置文件2'],
            buildCommands: ['构建命令']
        }
    }
});
```

### 步骤 2：更新类型定义

确保在相关接口中包含新语言的类型定义。

## 方法二：YAML 配置文件

### 步骤 1：创建语言配置文件

在 `src/templates/languages/` 目录下创建 `新语言.yaml`：

```yaml
name: "新语言名称"
version: "1.0.0"
author: "作者名称"
description: "语言描述"

language:
  name: "新语言名称"
  fileExtensions: [".ext1", ".ext2"]
  
analysisRules:
  - name: "规则名称"
    description: "规则描述"
    severity: "warning"
    pattern: "正则表达式"
    category: "代码质量"
    
codingStandards:
  - name: "编码标准"
    description: "标准描述"
    rules:
      - "使用驼峰命名"
      - "避免全局变量"
      
securityChecks:
  - name: "安全检查"
    description: "检查描述"
    severity: "error"
    pattern: "危险模式"
    
performanceChecks:
  - name: "性能检查"
    description: "检查描述"
    impact: "high"
    suggestion: "优化建议"
    
frameworkConfigs:
  框架名称:
    dependencies: ["依赖1", "依赖2"]
    configFiles: ["配置文件"]
    buildCommands: ["构建命令"]
    
toolIntegrations:
  staticAnalysis:
    tools: ["工具1", "工具2"]
    configs: ["配置1", "配置2"]
  formatting:
    tools: ["格式化工具"]
    configs: ["格式化配置"]
  testing:
    frameworks: ["测试框架"]
    patterns: ["测试模式"]
```

### 步骤 2：更新注册表

在 `src/templates/registry.yaml` 中添加新语言：

```yaml
languages:
  新语言名称:
    extensions: [".ext1", ".ext2"]
    configFile: "新语言.yaml"
    category: "编程语言"
    status: "active"
```

## 方法三：JavaScript 插件

### 步骤 1：创建插件文件

在 `src/plugins/` 目录下创建 `新语言-plugin.js`：

```javascript
// 新语言插件
class 新语言Plugin {
    constructor() {
        this.name = '新语言 Language Plugin';
        this.version = '1.0.0';
        this.author = '作者名称';
        this.supportedLanguages = ['新语言名称'];
    }

    async initialize() {
        console.log(`${this.name} 初始化完成`);
    }

    async cleanup() {
        console.log(`${this.name} 清理完成`);
    }

    getTemplate(language) {
        if (language === '新语言名称') {
            return {
                language: '新语言名称',
                fileExtensions: ['.ext1', '.ext2'],
                analysisRules: [
                    {
                        name: '规则名称',
                        description: '规则描述',
                        severity: 'warning',
                        pattern: '正则表达式'
                    }
                ],
                codingStandards: [
                    {
                        name: '编码标准',
                        description: '标准描述',
                        rules: ['规则1', '规则2']
                    }
                ],
                securityChecks: [
                    {
                        name: '安全检查',
                        description: '检查描述',
                        severity: 'error',
                        pattern: '危险模式'
                    }
                ],
                performanceChecks: [
                    {
                        name: '性能检查',
                        description: '检查描述',
                        impact: 'high',
                        suggestion: '优化建议'
                    }
                ],
                frameworkConfigs: {
                    '框架名称': {
                        dependencies: ['依赖1', '依赖2'],
                        configFiles: ['配置文件'],
                        buildCommands: ['构建命令']
                    }
                }
            };
        }
        return null;
    }
}

// 导出插件实例
module.exports = new 新语言Plugin();
```

### 步骤 2：注册插件

插件会被自动扫描和加载，无需手动注册。

## 使用 AI 动态生成

### 通过 Copilot Chat

1. 在 VS Code 中打开 Copilot Chat
2. 输入：`@ai-agent.config custom "为 [新语言名称] 生成完整的代码分析配置"`
3. AI 会自动生成适合该语言的配置

### 示例对话

```
用户: @ai-agent.config custom "为 Kotlin 生成 Android 开发的代码分析配置"

AI: 我将为 Kotlin Android 开发生成专门的代码分析配置...
[生成包含 Android 特定规则的配置]
```

## 最佳实践

### 1. 语言特性分析

在添加新语言支持时，考虑以下方面：

- **语法特性**：静态类型 vs 动态类型、面向对象 vs 函数式
- **常见问题**：内存管理、并发安全、性能瓶颈
- **生态系统**：主流框架、构建工具、测试框架
- **编码规范**：官方风格指南、社区最佳实践

### 2. 规则设计原则

- **渐进式**：从基础规则开始，逐步添加高级规则
- **可配置**：允许用户自定义规则严重程度
- **上下文相关**：考虑项目类型和框架特性
- **性能友好**：避免过于复杂的正则表达式

### 3. 测试验证

```bash
# 验证配置
npm run test:config

# 测试特定语言
npm run test:language -- --lang=新语言名称

# 集成测试
npm run test:integration
```

## 社区贡献

### 提交新语言支持

1. Fork 项目仓库
2. 创建特性分支：`git checkout -b feature/add-新语言-support`
3. 添加语言配置和测试
4. 提交 Pull Request

### 贡献指南

- 遵循现有代码风格
- 添加完整的测试用例
- 更新相关文档
- 提供示例配置

## 故障排除

### 常见问题

**Q: 新添加的语言没有被识别？**
A: 检查文件扩展名配置和注册表更新

**Q: 插件加载失败？**
A: 验证插件语法和依赖项

**Q: 配置验证失败？**
A: 检查 YAML 语法和必需字段

### 调试命令

```bash
# 查看支持的语言
@ai-agent.config list

# 检查插件状态
@ai-agent.config plugins

# 重新加载配置
@ai-agent.config reload

# 显示统计信息
@ai-agent.config stats
```

## 示例：添加 Dart 支持

### 完整示例

```yaml
# src/templates/languages/dart.yaml
name: "Dart"
version: "1.0.0"
author: "AI Agent Hub"
description: "Dart 语言代码分析配置"

language:
  name: "Dart"
  fileExtensions: [".dart"]
  
analysisRules:
  - name: "PreferConstConstructors"
    description: "优先使用 const 构造函数"
    severity: "info"
    pattern: "class\\s+\\w+\\s*\\{[^}]*\\w+\\([^)]*\\)\\s*:"
    category: "性能"
    
  - name: "AvoidPrint"
    description: "避免在生产代码中使用 print"
    severity: "warning"
    pattern: "print\\s*\\("
    category: "代码质量"
    
codingStandards:
  - name: "Effective Dart"
    description: "遵循 Effective Dart 指南"
    rules:
      - "使用 lowerCamelCase 命名变量和函数"
      - "使用 UpperCamelCase 命名类型"
      - "使用 lowercase_with_underscores 命名库和包"
      
securityChecks:
  - name: "AvoidWebOnlyLibraries"
    description: "避免在非 Web 平台使用 Web 专用库"
    severity: "error"
    pattern: "import\\s+['\"]dart:html['\"]|import\\s+['\"]dart:js['\"]"    
    
performanceChecks:
  - name: "PreferCollectionLiterals"
    description: "优先使用集合字面量"
    impact: "medium"
    suggestion: "使用 [] 而不是 List()，使用 {} 而不是 Map()"
    
frameworkConfigs:
  Flutter:
    dependencies: ["flutter", "flutter_test"]
    configFiles: ["pubspec.yaml", "analysis_options.yaml"]
    buildCommands: ["flutter build", "flutter test"]
    
toolIntegrations:
  staticAnalysis:
    tools: ["dart analyze", "flutter analyze"]
    configs: ["analysis_options.yaml"]
  formatting:
    tools: ["dart format"]
    configs: [".dart_tool/package_config.json"]
  testing:
    frameworks: ["test", "flutter_test"]
    patterns: ["test/**/*_test.dart"]
```

通过以上方法，您可以轻松为 AI Agent Hub 添加任何编程语言的支持，让代码分析功能覆盖更广泛的开发场景。