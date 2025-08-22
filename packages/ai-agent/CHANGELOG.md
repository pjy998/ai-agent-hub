# Change Log

All notable changes to the "AI Agent Hub" extension will be documented in this file.

## [0.0.20] - 2025-01-27

### ✨ Added
- **Token Probe功能**: 全新的AI模型上下文窗口测试工具
  - 支持15种最新AI模型，包括GPT-4.1、GPT-4o、GPT-5、Claude Sonnet 3.5/3.7/4、Gemini 2.5 Pro等
  - 智能二分法和线性搜索算法，快速准确找到Token限制
  - 项目摘要生成功能，支持动态调整大小以适应不同模型
  - 详细的测试报告和历史记录管理
  - VS Code命令集成：`AI Agent: Token Probe`、`AI Agent: Token Probe (Quick Test)`等
- **GitHub Copilot Chat API集成**: 完整的API调用和错误处理机制
- **性能优化**: 支持并发测试和结果缓存，提升测试效率

### 🛠️ Technical Details
- 实现了智能测试策略，结合二分法快速定位和线性搜索精确验证
- 添加了完整的TypeScript类型定义和错误处理
- 集成了项目分析和摘要生成功能，支持多种编程语言
- 提供了用户友好的配置界面和进度显示

## [0.0.19] - 2025-01-27

### 🔧 Internal
- 代码重构和优化准备

## [0.0.18] - 2025-01-27

### 🔧 Fixed
- **Monorepo Dependency Resolution**: Fixed `yaml` module resolution in monorepo environments
  - Updated `.vscodeignore` to include `!../../node_modules/yaml/**` for proper dependency packaging
  - Resolved "Cannot find module 'yaml'" errors in remote VS Code environments
  - Ensured Chat participant activation works correctly in monorepo structures

### 🛠️ Technical Details
- **Root Cause**: In monorepo structures, dependencies are hoisted to the root `node_modules`, but `.vscodeignore` was excluding all parent directories
- **Solution**: Modified `.vscodeignore` to specifically include the hoisted `yaml` dependency from root `node_modules`
- **Impact**: Extension now works correctly in both standalone and monorepo project structures

## [0.0.17] - 2024-12-21

### 🔧 Fixed
- **扩展打包问题**: 修复了 `.vscodeignore` 配置导致 `yaml` 依赖未被包含在扩展包中的问题
  - 在 `.vscodeignore` 中添加了 `!node_modules/yaml/**` 规则
  - 确保 `yaml` 运行时依赖被正确打包到 VSIX 文件中
  - 解决了远程环境中仍然出现 "Cannot find module 'yaml'" 错误的根本原因
- **远程环境兼容性**: 确保扩展在 VS Code Server 环境中正确加载所有依赖

### 📚 Documentation
- 更新了依赖打包最佳实践和 `.vscodeignore` 配置指南

## [0.0.16] - 2024-12-21

### 🔧 Fixed
- **依赖管理问题**: 修复了缺少 `yaml` 运行时依赖导致的模块解析错误
  - 在 package.json 中添加了 `yaml: "^2.3.4"` 作为运行时依赖
  - 解决了 `@ai-agent.config` 命令返回 "unclear" 错误的问题
  - 修复了控制台中 "Cannot find module 'yaml'" 的错误
- **扩展激活**: 确保 Chat 参与者在远程环境中正确加载和激活

### 📚 Documentation
- 新增 `CONSOLE-ERROR-ANALYSIS.md` - 详细的错误分析和解决方案文档
- 更新了依赖管理最佳实践和预防措施

## [0.0.15] - 2024-12-21

### ✨ Added
- **扩展语言支持系统**: 全新的可扩展多语言支持架构
  - 可扩展语言管理器 (ExtensibleLanguageManager)
  - 支持三种语言扩展方式：内置模板、YAML配置文件、JavaScript插件
  - 动态语言模板加载和插件系统
  - AI驱动的语言配置生成
- **增强的Copilot Chat集成**: 新增语言管理命令
  - `@ai-agent.config plugins` - 管理语言插件
  - `@ai-agent.config stats` - 显示语言支持统计
  - `@ai-agent.config reload` - 重新加载所有模板和插件
  - `@ai-agent.config custom "为 [语言名] 生成配置"` - AI动态生成新语言支持
- **语言配置示例**: 
  - C++ 语言配置模板 (cpp.yaml)
  - Lua 语言插件示例 (example-language-plugin.js)
  - 语言注册表配置 (registry.yaml)
- **完整文档**: 扩展语言支持指南 (extending-language-support.md)

### 🔧 Improved
- **配置验证**: 增强的YAML配置文件验证机制
- **插件系统**: 完整的插件生命周期管理（初始化、清理、依赖验证）
- **AI集成**: 通过Copilot Chat智能生成语言特定的分析规则
- **向后兼容**: 保持与现有内置语言模板的完全兼容

### 🛠️ Technical
- **TypeScript**: 修复所有类型定义和编译错误
- **模块化设计**: 可扩展的语言模板管理架构
- **动态加载**: 支持运行时加载新的语言模板和插件

## [0.1.0] - 2024-12-20

### ✨ Added
- **C# Coding Standards Analysis**: Complete implementation of Microsoft C# coding guidelines analysis
  - Naming convention validation (PascalCase, camelCase, underscore prefixes)
  - Code formatting checks (indentation, line length, spacing)
  - Language feature usage validation (modern C# patterns)
  - Security vulnerability detection (hardcoded secrets, SQL injection risks)
  - Performance optimization suggestions (string operations, collections)
- **GitHub Copilot Chat Integration**: Seamless integration with VS Code Copilot Chat
  - `@analyze` participant for project analysis
  - `@analyze csharp` command for C# coding standards analysis
  - Real-time analysis results display in chat interface
  - Automatic workspace path detection
- **Automated Configuration Generation**:
  - `.editorconfig` file generation with C# best practices
  - Code analysis rule sets for consistent development
- **Enhanced Project Analysis**:
  - Comprehensive project health scoring
  - Detailed analysis reports in Markdown format
  - File-level issue tracking with line numbers
  - Priority-based issue categorization (high/medium/low)

### 🔧 Improved
- **User Experience**: Streamlined analysis workflow with better progress indicators
- **Error Handling**: Enhanced error messages and graceful failure handling
- **Performance**: Optimized file scanning and analysis algorithms
- **Documentation**: Comprehensive user guides and configuration examples

### 🛠️ Technical
- **Architecture**: Modular design with extensible analysis engine
- **MCP Integration**: Model Context Protocol support for AI model communication
- **TypeScript**: Full TypeScript implementation with strict type checking
- **VS Code API**: Leveraging latest VS Code extension APIs

## [0.0.10] - 2024-12-15

### 🔧 Fixed
- **MCP SDK Integration**: Resolved import issues with Model Context Protocol SDK
- **Extension Activation**: Improved extension startup reliability
- **Command Registration**: Fixed command palette integration

### 📚 Documentation
- Updated API documentation
- Enhanced security configuration guide
- Improved preset development documentation

## [0.0.9] - 2024-12-10

### ✨ Added
- **Project Self-Analysis**: Initial implementation of project analysis capabilities
- **Command Palette Integration**: Added core commands for project analysis
- **Basic Reporting**: Simple analysis report generation

### 🛠️ Technical
- **Foundation**: Core extension architecture and VS Code integration
- **TypeScript Setup**: Project structure with TypeScript compilation
- **Basic Commands**: Initial command set for project operations

---

## 🚀 Upcoming Features

### Version 0.2.0 (Planned)
- **Multi-language Support**: Extended analysis for Python, Java, and Go
- **Custom Rules**: User-defined coding standards and analysis rules
- **Team Collaboration**: Shared analysis configurations and reports
- **CI/CD Integration**: GitHub Actions and Azure DevOps pipeline integration

### Version 0.3.0 (Planned)
- **AI-Powered Suggestions**: Advanced code improvement recommendations
- **Automated Refactoring**: One-click code quality improvements
- **Performance Profiling**: Runtime performance analysis and optimization
- **Code Metrics Dashboard**: Visual project health monitoring

---

## 📝 Notes

- **Semantic Versioning**: This project follows [SemVer](https://semver.org/)
- **Breaking Changes**: Major version increments indicate breaking changes
- **Feedback**: We welcome feedback and feature requests via [GitHub Issues](https://github.com/pjy998/ai-agent-hub/issues)

## 🤝 Contributing

See our [Contributing Guide](https://github.com/pjy998/ai-agent-hub/blob/main/CONTRIBUTING.md) for details on how to contribute to this project.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/pjy998/ai-agent-hub/blob/main/LICENSE) file for details.