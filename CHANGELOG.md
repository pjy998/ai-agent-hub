# AI Agent Hub - 变更日志

## [0.0.22] - 2025-01-22

### 修复
- **Chat Participant 注册**: 修复 package.json 中缺失的 `ai-agent.token` chat participant 声明
  - 解决 "chatParticipant must be declared in package.json" 错误
  - 正确注册 Token Probe chat participant 以支持 GitHub Copilot Chat

## [0.0.21] - 2025-01-22

### 新增
- **Token Probe Chat Participant**: 为 GitHub Copilot Chat 集成添加 `@token` chat participant
  - 在 Copilot Chat 中直接访问 Token Probe 功能
  - 支持自然语言命令进行 token 限制测试
  - 实时测试结果和进度更新
  - 增强的聊天集成和直观的用户界面

### 改进
- 改进 GitHub Copilot Chat 集成，提供专用 participant
- 通过聊天界面提供更好的 token 限制测试用户体验

## [0.0.3] - 2025-01-19

### 修复
- **VS Code扩展**: 修复模块导入路径问题，移除.js扩展名以确保正确的模块解析
- **依赖管理**: 优化@modelcontextprotocol/sdk依赖的导入方式
- **扩展激活**: 解决扩展激活失败的问题，确保Chat Participants功能正常工作

### 技术改进
- 改进TypeScript模块解析配置
- 优化扩展打包流程
- 增强错误处理和调试信息

## [0.0.2] - 2025-01-19

### 🔧 改进和修复

#### 文档更新
- **Chat Participants 架构重构**: 移除过时的 `@coding`、`@refactor`、`@requirements` 参与者，保留核心功能参与者
- **MCP 服务器配置**: 更新文档中过时的端口配置信息，从 HTTP 端口模式改为 stdio 模式
- **启动命令**: 修正 MCP 服务器启动命令为 `npx ai-agent-hub-mcp start`

#### 技术改进
- **通信方式优化**: 从 HTTP 端口通信改为 stdio 模式，提高安全性和稳定性
- **配置简化**: 移除不必要的端口配置，简化用户设置流程
- **文档一致性**: 确保所有文档中的指令格式和配置信息保持一致

### 📚 文档修复
- 修正 `README.md` 中的 Chat Participants 使用示例
- 更新 MCP 服务器集成说明
- 修正故障排除指南中的过时信息

## [0.0.1] - 2025-01-19

### 🎉 首次发布

这是 AI Agent Hub 的首个预览版本，提供了完整的 MCP (Model Context Protocol) 集成和 VS Code 扩展支持。

### ✨ 新功能

#### AI-MCP 服务器 (@ai-agent-hub/mcp)
- **跨平台 MCP 服务器**: 支持 Windows、macOS、Linux 和 SSH 远程开发
- **多项目管理**: 同时管理多个项目的 MCP 服务器实例
- **CLI 工具**: 提供完整的命令行界面用于启动、停止和管理 MCP 服务器
- **工作流执行**: 支持 YAML 预设和工作流执行功能
- **项目信息获取**: 自动检测和提供项目结构信息

#### AI Agent VS Code 扩展 (ai-agent-vscode)
- **Chat Participants**: 集成 `@analyze`、`@token`、`@csharp`、`@report`、`@recommend`、`@config` 聊天参与者
- **MCP 客户端**: 无缝连接到 AI-MCP 服务器
- **智能代码助手**: 提供代码生成、重构和问题解答功能
- **跨平台支持**: 在所有主流操作系统上运行

### 🔧 技术特性

- **MCP 协议支持**: 完整实现 Model Context Protocol 规范
- **TypeScript 支持**: 全面的类型安全和开发体验
- **错误处理**: 完善的错误处理和用户反馈机制
- **日志系统**: 详细的日志记录用于调试和监控
- **配置管理**: 灵活的配置系统支持多种使用场景

### 📦 发布包

- **NPM 包**: `@ai-agent-hub/mcp@0.0.1` (16.0 KB)
- **VS Code 扩展**: `ai-agent-vscode-0.0.1.vsix` (12.4 KB)

### 🚀 快速开始

#### 安装 AI-MCP 服务器
```bash
npm install -g @ai-agent-hub/mcp
```

#### 启动 MCP 服务器
```bash
ai-agent-mcp start
```

#### 安装 VS Code 扩展
1. 下载 `ai-agent-vscode-0.0.1.vsix`
2. 在 VS Code 中运行: `code --install-extension ai-agent-vscode-0.0.1.vsix`

### 🎯 使用场景

- **代码开发**: 使用 `@coding` 助手进行代码生成和问题解答
- **代码重构**: 使用 `@refactor` 助手优化和重构现有代码
- **多项目开发**: 同时管理多个项目的 AI 助手服务
- **远程开发**: 在 SSH 环境中使用 AI 助手功能

### ⚠️ 已知限制

- 工作流执行功能目前为模拟实现，后续版本将提供完整的 YAML 解析
- 部分高级功能仍在开发中
- 建议在测试环境中使用此预览版本

### 🔮 后续计划

- 完善工作流执行逻辑
- 增强错误处理和用户体验
- 添加更多 Chat Participants
- 支持更多开发工具集成

---

**注意**: 这是一个预览版本，主要用于功能验证和用户反馈收集。生产环境使用请谨慎评估。