# AI Agent Hub

🤖 **智能AI编程助手 - 让AI成为你的编程伙伴！**

> 🚀 提供项目自动分析、C#编码规范检查、Token使用监控、多语言代码质量评估和GitHub Copilot Chat深度集成的强大VS Code扩展

[![Version](https://img.shields.io/badge/version-0.0.23-blue.svg)](https://marketplace.visualstudio.com/items?itemName=jieky.ai-agent-vscode)
[![Downloads](https://img.shields.io/badge/downloads-1K+-green.svg)](https://marketplace.visualstudio.com/items?itemName=jieky.ai-agent-vscode)
[![Rating](https://img.shields.io/badge/rating-⭐⭐⭐⭐⭐-yellow.svg)](https://marketplace.visualstudio.com/items?itemName=jieky.ai-agent-vscode)

## ✨ 核心功能

### 🔍 智能项目分析
- **🤖 AI驱动扫描**: 自动分析代码库结构、依赖关系和架构模式
- **📊 健康度评估**: 提供全面的项目健康评分和改进建议
- **⚡ 实时洞察**: 获取代码质量和项目组织的即时反馈
- **📈 趋势分析**: 跟踪项目质量变化趋势

### 🎯 C# 编码规范检查
- **✅ 微软标准合规**: 严格按照官方Microsoft C#编码指南检查
- **🏷️ 命名规范**: 验证类、方法、变量的命名模式
- **🎨 代码格式**: 确保一致的缩进、间距和代码风格
- **🔒 安全分析**: 检测潜在安全漏洞和硬编码密钥
- **⚡ 性能优化**: 识别性能瓶颈并提供优化建议
- **📋 自动化报告**: 生成详细的分析报告和可执行的改进方案

### 🚀 GitHub Copilot Chat 深度集成
- **💬 智能对话**: 6个专业Chat参与者 (@analyze, @token, @report, @config, @recommend, @code)
- **🗣️ 自然语言命令**: 使用简单命令如 `@analyze csharp` 触发分析
- **🎯 上下文感知**: 自动使用当前工作区进行分析
- **🎨 交互式结果**: 在Copilot Chat中直接查看丰富格式的结果
- **🔄 实时协作**: 与AI助手进行实时代码讨论和优化

### 🛠️ 智能工作流自动化
- **🔧 代码重构**: AI驱动的代码改进建议
- **📝 需求分析**: 分析和验证项目需求
- **⚙️ 自动配置**: 生成 `.editorconfig` 和分析规则文件
- **🌐 多语言支持**: 可扩展架构支持多种编程语言
- **📊 Token监控**: 实时监控GitHub Copilot Chat的Token使用情况

## 🚀 快速开始

### 📦 安装步骤
1. 🛒 从VS Code应用市场安装扩展
2. 📂 在VS Code中打开任意项目
3. ⚡ 扩展自动激活，开始智能分析

### 🔍 使用项目分析
1. 🎯 打开命令面板 (`Ctrl+Shift+P`)
2. 🚀 运行 `AI Agent Hub: Analyze Self`
3. 📊 查看全面的项目分析结果

### 🎯 使用C#编码规范检查

#### 💬 通过Copilot Chat (推荐方式)
1. 🗨️ 打开GitHub Copilot Chat (`Ctrl+Shift+I`)
2. ⌨️ 输入 `@analyze csharp` 触发C#分析
3. 📋 实时查看分析结果和改进建议

#### 🎛️ 通过命令面板
1. 🎯 打开命令面板 (`Ctrl+Shift+P`)
2. 🚀 运行 `AI Agent Hub: Analyze Self`
3. ⚙️ 选择C#分析选项

### 💡 Chat参与者使用指南
```
@analyze 项目分析    # 全面项目分析
@token 检查使用量    # Token使用监控
@report 生成报告    # 详细分析报告
@config 查看配置    # 扩展配置管理
@recommend 改进建议 # 智能优化建议
@code 代码质量     # 代码质量评估
```

## 📊 Analysis Results

### C# Coding Standards Report
- **📋 Score**: Overall coding standards compliance (0-100)
- **🔧 Issues**: Categorized list of coding standard violations
- **📄 Detailed Report**: Comprehensive Markdown report with file-level analysis
- **⚙️ Configuration Files**: Auto-generated `.editorconfig` for consistent formatting

### Project Health Assessment
- **📈 Health Score**: Overall project quality metrics
- **📋 Recommendations**: Actionable improvement suggestions
- **🔍 Dependency Analysis**: Package and dependency health check
- **📊 Code Metrics**: Lines of code, complexity, and maintainability scores

## 🎯 Supported Languages

- ✅ **C#**: Full coding standards analysis with Microsoft guidelines
- ✅ **TypeScript/JavaScript**: Project structure and quality analysis
- ✅ **Python**: Basic project analysis
- 🔄 **More languages**: Coming soon!

## ⚙️ Configuration

The extension works out-of-the-box with sensible defaults. For advanced configuration:

1. Create `csharp-analysis-config.json` in your project root
2. Customize analysis rules, file patterns, and reporting options
3. See [Configuration Guide](https://github.com/pjy998/ai-agent-hub/blob/main/docs/csharp-analysis-guide.md) for details

## 🤝 Integration

### GitHub Copilot Chat Participants
- `@token` - Token limit testing and analysis for GitHub Copilot Chat models
- `@csharp` - C# project analysis and code quality assessment
- `@report` - Project report generation with multiple formats
- `@recommend` - View and manage project improvement recommendations
- `@analyze` - General project analysis
- `@config` - Dynamic configuration generator for multi-language analysis

**Quick Examples:**
- `@token 测试` - Test token limits for current model
- `@csharp 分析项目` - Analyze C# project structure and quality
- `@report 项目分析` - Generate comprehensive project report
- `@recommend 列表` - View all improvement recommendations

### MCP (Model Context Protocol)
- Seamless integration with AI models
- Context-aware analysis and suggestions
- Extensible tool system for custom workflows

## 📚 Documentation

- [🤖 Chat Participants Guide](https://github.com/pjy998/ai-agent-hub/blob/main/docs/chat-participants-guide.md) - Complete guide for all chat participants
- [📖 User Guide](https://github.com/pjy998/ai-agent-hub/blob/main/docs/csharp-analysis-guide.md)
- [🔍 Token Probe Guide](https://github.com/pjy998/ai-agent-hub/blob/main/docs/improved-token-probe-guide.md)
- [🔧 Configuration Reference](https://github.com/pjy998/ai-agent-hub/blob/main/examples/csharp-analysis-config.json)
- [🚀 API Documentation](https://github.com/pjy998/ai-agent-hub/blob/main/docs/api-design.md)
- [🛡️ Security Guide](https://github.com/pjy998/ai-agent-hub/blob/main/docs/security-guide.md)

## 🐛 Issues & Support

- [🐛 Report Issues](https://github.com/pjy998/ai-agent-hub/issues)
- [💬 Discussions](https://github.com/pjy998/ai-agent-hub/discussions)
- [📧 Contact](mailto:support@ai-agent-hub.com)

## 🎉 What's New

### Version 0.2.0
- ✨ **New**: `@token` - Token limit testing and analysis for GitHub Copilot Chat models
- ✨ **New**: `@csharp` - Dedicated C# project analysis chat participant
- ✨ **New**: `@report` - Comprehensive project report generation with multiple formats
- ✨ **New**: `@recommend` - Intelligent recommendation system with implementation guidance
- ✨ **New**: Complete Chat Participants Guide documentation
- 🔧 **Improved**: Enhanced GitHub Copilot Chat integration with specialized participants
- 🔧 **Improved**: Better user experience with context-aware assistance

### Version 0.1.0
- ✨ **New**: C# Coding Standards Analysis with Microsoft guidelines
- ✨ **New**: GitHub Copilot Chat integration with `@analyze` commands
- ✨ **New**: Automated `.editorconfig` generation
- ✨ **New**: Real-time analysis results in Copilot Chat
- 🔧 **Improved**: Enhanced project analysis with detailed health metrics
- 🔧 **Improved**: Better error handling and user feedback

## 📄 License

MIT License - see [LICENSE](https://github.com/pjy998/ai-agent-hub/blob/main/LICENSE) for details.

---

**Made with ❤️ by the AI Agent Hub team**

[⭐ Star us on GitHub](https://github.com/pjy998/ai-agent-hub) | [🚀 Try it now](https://marketplace.visualstudio.com/items?itemName=jieky.ai-agent-vscode)