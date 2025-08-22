# AI Agent Hub 配置生成测试指南

## 问题诊断

如果您在使用 `@ai-agent.config generate csharp` 命令时收到 "unclear" 错误，这表明 Copilot Chat 没有正确识别我们的扩展插件。

## 解决方案

### 1. 确认扩展已激活

首先确认 AI Agent Hub 扩展已正确安装和激活：

1. 打开 VS Code
2. 按 `Ctrl+Shift+P` 打开命令面板
3. 输入 "Extensions: Show Installed Extensions"
4. 查找 "AI Agent Hub" 扩展，确认已启用

### 2. 重新加载 VS Code 窗口

扩展更新后需要重新加载窗口：

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "Developer: Reload Window"
3. 选择并执行

### 3. 正确的命令格式

在 Copilot Chat 中使用以下格式：

#### 基本配置生成
```
@ai-agent.config generate csharp
```

#### 自定义配置生成
```
@ai-agent.config custom "为 C# 生成配置，要求：包含 Microsoft 编码规范检查"
```

#### 其他可用命令
```
@ai-agent.config detect          # 检测项目语言
@ai-agent.config list           # 列出支持的语言
@ai-agent.config help           # 显示帮助信息
```

## 支持的语言

当前支持以下编程语言的配置生成：

- **C#** (`csharp` 或 `c#`)
- **Java** (`java`)
- **Python** (`python`)
- **JavaScript** (`javascript`)
- **TypeScript** (`typescript`)
- **Vue** (`vue`)
- **React** (`react`)
- **Angular** (`angular`)
- **Go** (`go`)
- **Rust** (`rust`)
- **PHP** (`php`)
- **Ruby** (`ruby`)
- **Swift** (`swift`)
- **Kotlin** (`kotlin`)

## 测试步骤

### 步骤 1: 基本功能测试

1. 打开 Copilot Chat
2. 输入：`@ai-agent.config help`
3. 应该看到详细的帮助信息

### 步骤 2: 语言检测测试

1. 在 Copilot Chat 中输入：`@ai-agent.config detect`
2. 系统应该自动检测当前项目中使用的编程语言

### 步骤 3: C# 配置生成测试

1. 在 Copilot Chat 中输入：`@ai-agent.config generate csharp`
2. 系统应该：
   - 显示正在生成配置的进度
   - 调用 Copilot Chat API 生成配置
   - 创建 YAML 配置文件
   - 显示配置摘要

### 步骤 4: 自定义配置测试

1. 在 Copilot Chat 中输入：
   ```
   @ai-agent.config custom "为 C# 生成配置，要求：包含 Microsoft 编码规范、安全检查和性能优化"
   ```
2. 系统应该根据您的具体要求生成定制化配置

## 故障排除

### 如果命令仍然不被识别

1. **检查扩展版本**：确保使用的是 v0.0.15 或更高版本
2. **查看开发者控制台**：
   - 按 `F12` 打开开发者工具
   - 查看 Console 标签页是否有错误信息
3. **重新安装扩展**：
   - 卸载 AI Agent Hub 扩展
   - 重新安装最新版本
   - 重新加载 VS Code 窗口

### 如果生成过程失败

1. **检查网络连接**：确保能够访问 Copilot Chat API
2. **检查 Copilot 订阅**：确保您有有效的 GitHub Copilot 订阅
3. **查看输出面板**：
   - 打开 "View" > "Output"
   - 选择 "AI Agent Hub - Config Generator" 频道
   - 查看详细的错误信息

## 预期结果

成功执行 `@ai-agent.config generate csharp` 后，您应该看到：

1. **进度提示**：显示正在生成配置
2. **AI 调用**：显示正在调用 Copilot Chat
3. **文件创建**：显示 YAML 文件保存路径
4. **配置摘要**：包括：
   - 语言信息
   - 文件扩展名
   - 分析规则数量
   - 编码标准项目
   - 安全检查项目
   - 性能检查项目
5. **使用说明**：如何使用生成的配置

## 生成的文件位置

配置文件将保存在：
```
<workspace>/.ai-agent/configs/<language>-analysis-config.yaml
```

例如，C# 配置文件路径：
```
.ai-agent/configs/csharp-analysis-config.yaml
```

## 联系支持

如果问题仍然存在，请：

1. 收集错误信息（开发者控制台 + 输出面板）
2. 记录您的操作步骤
3. 提供您的 VS Code 版本和扩展版本信息
4. 在项目 GitHub 仓库中创建 Issue

---

**注意**：此功能需要有效的 GitHub Copilot 订阅才能正常工作。