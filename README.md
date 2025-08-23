# AI Agent Hub

> AI-powered coding assistant with project analysis and intelligent workflow automation for VS Code

[![Version](https://img.shields.io/badge/version-0.0.22-blue.svg)](https://github.com/your-repo/ai-agent-hub)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.74.0+-brightgreen.svg)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 概述

AI Agent Hub 是一个强大的 VS Code 扩展，通过 Chat 参与者系统提供智能编程辅助。它采用简化的单体架构，专注于项目分析、代码质量评估和开发效率提升。

## 核心特性

### 🤖 Chat 参与者系统
- **@code** - 多语言代码分析和优化建议
- **@report** - 项目分析报告生成
- **@token** - Token 使用情况监控和优化
- **@config** - 扩展配置管理
- **@recommend** - 智能推荐和最佳实践

### 📊 项目分析引擎
- 自动项目结构扫描
- 多语言代码质量评估
- 技术栈识别和分析
- 改进建议生成

### 🔧 开发工具集成
- VS Code 原生集成
- GitHub Copilot Chat API 支持
- 文件系统操作
- 配置管理

## 快速开始

### 安装

1. 在 VS Code 中搜索 "AI Agent Hub"
2. 点击安装
3. 重启 VS Code

### 使用方法

1. 打开 VS Code Chat 面板 (`Ctrl+Shift+I`)
2. 使用 `@` 符号调用不同的 Chat 参与者：
   ```
   @code 分析这个函数的性能问题
   @report 生成项目分析报告
   @token 检查当前 token 使用情况
   @config 显示扩展配置
   @recommend 推荐代码改进方案
   ```

### 命令面板

- `AI Agent: C# Analysis` - 执行 C# 代码分析
- `AI Agent: Token Probe` - 检查 token 使用情况
- `AI Agent: Self Project Scan` - 扫描当前项目

## 架构设计

### 简化单体架构
```
VS Code Extension
├── Chat Participants (@code, @report, @token, @config, @recommend)
├── Core Services
│   ├── Project Analysis Engine
│   ├── Report Generator
│   ├── Config Manager
│   ├── Token Manager
│   └── Language Detector
└── VS Code Integration
    ├── Extension Commands
    ├── Chat API Integration
    └── File System Operations
```

### 技术栈
- **开发语言**: TypeScript
- **平台**: VS Code Extension API
- **Chat 集成**: GitHub Copilot Chat API
- **构建工具**: npm, webpack
- **测试框架**: Jest

## 开发指南

### 环境要求
- Node.js 16+
- VS Code 1.74.0+
- npm 或 yarn

### 本地开发

```bash
# 克隆项目
git clone <repository-url>
cd ai-agent-hub

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm test
```

### 项目结构
```
ai-agent-hub/
├── packages/
│   ├── ai-agent/          # VS Code 扩展主包
│   │   ├── src/
│   │   │   ├── participants/  # Chat 参与者实现
│   │   │   ├── services/      # 核心服务
│   │   │   ├── commands/      # 扩展命令
│   │   │   └── extension.ts   # 扩展入口
│   │   └── package.json
│   └── ai-mcp/            # MCP 相关（已弃用）
├── docs/                  # 文档目录
├── package.json          # 根项目配置
└── README.md             # 项目说明
```

## 版本历史

### v0.0.22 (当前版本)
- ✅ Chat 参与者系统完整实现
- ✅ 项目分析引擎优化
- ✅ 多语言支持增强
- ✅ Token 管理功能
- ✅ 配置管理系统

### v0.0.9 (基础版本)
- ✅ VS Code 扩展基础框架
- ✅ 基本 Chat 参与者
- ✅ 项目扫描功能
- ✅ C# 分析支持

## 路线图

### v0.1.0 (计划中)
- 🔄 增强多语言支持
- 🔄 高级代码质量分析
- 🔄 可视化报告
- 🔄 性能优化

### v0.2.0 (未来)
- 📋 企业级功能
- 📋 团队协作支持
- 📋 自定义规则引擎
- 📋 API 集成扩展

## 贡献指南

我们欢迎社区贡献！请查看 [CONTRIBUTING.md](docs/CONTRIBUTING.md) 了解详细信息。

### 贡献流程
1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 支持

- 📧 邮箱: support@ai-agent-hub.com
- 🐛 问题反馈: [GitHub Issues](https://github.com/your-repo/ai-agent-hub/issues)
- 💬 讨论: [GitHub Discussions](https://github.com/your-repo/ai-agent-hub/discussions)

---

**更新日期**: 2025年8月23日

**AI Agent Hub** - 让 AI 成为你的编程伙伴 🚀