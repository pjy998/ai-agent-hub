# AI Agent Hub

🤖 **AI-powered coding assistant with project analysis, C# coding standards, and intelligent workflow automation for VS Code**

## ✨ Features

### 🔍 Project Self-Analysis
- **Intelligent Project Scanning**: Automatically analyzes your codebase structure and dependencies
- **Health Assessment**: Provides comprehensive project health scores and recommendations
- **Real-time Insights**: Get instant feedback on code quality and project organization

### 🎯 C# Coding Standards Analysis
- **Microsoft Standards Compliance**: Checks against official Microsoft C# coding guidelines
- **Naming Conventions**: Validates class, method, and variable naming patterns
- **Code Formatting**: Ensures consistent indentation, spacing, and style
- **Security Analysis**: Detects potential security vulnerabilities and hardcoded secrets
- **Performance Optimization**: Identifies performance bottlenecks and suggests improvements
- **Automated Reports**: Generates detailed analysis reports with actionable recommendations

### 🚀 GitHub Copilot Chat Integration
- **@analyze Assistant**: Seamlessly integrated with GitHub Copilot Chat
- **Natural Language Commands**: Trigger analysis with simple commands like `@analyze csharp`
- **Contextual Analysis**: Automatically uses your current workspace for analysis
- **Interactive Results**: View results directly in Copilot Chat with rich formatting

### 🛠️ Intelligent Workflow Automation
- **Code Refactoring**: AI-powered code improvement suggestions
- **Requirements Analysis**: Analyze and validate project requirements
- **Automated Configuration**: Generates `.editorconfig` and analysis rule files
- **Multi-language Support**: Extensible architecture for various programming languages

## 🚀 Quick Start

### Installation
1. Install the extension from VS Code Marketplace
2. Open any project in VS Code
3. The extension activates automatically

### Using Project Analysis
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run `AI Agent Hub: Analyze Self`
3. View comprehensive project analysis results

### Using C# Coding Standards Analysis

#### Via Copilot Chat (Recommended)
1. Open GitHub Copilot Chat (`Ctrl+Shift+I`)
2. Type `@analyze csharp` to trigger C# analysis
3. View real-time analysis results and recommendations

#### Via Command Palette
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run `AI Agent Hub: Analyze Self`
3. Select C# analysis options

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