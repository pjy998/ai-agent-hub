# AI Agent Hub MCP Server - VS Code 使用指南

## 概述

AI Agent Hub MCP Server 是一个符合 Model Context Protocol (MCP) 标准的服务器，为 VS Code 提供 AI 驱动的编程工具和功能。

## 安装

### 方法1：从 npm 安装（推荐）

```bash
npm install -g ai-agent-hub-mcp@latest
```

当前最新版本：**v0.0.8**

### 方法2：从源码安装

```bash
git clone <repository-url>
cd ai-agent-hub/packages/ai-mcp
npm install
npm run build
npm link
```

## VS Code 配置

### 1. 安装 MCP 扩展

在 VS Code 中安装支持 MCP 的扩展（如 Claude Dev 或其他 MCP 客户端）。

### 2. 配置 MCP 服务器

在你的项目根目录创建或编辑 `.vscode/settings.json` 文件：

**方法一：使用工作区变量（推荐，需要打开文件夹）**
```json
{
  "mcp.servers": {
    "ai-agent-hub": {
            "command": "npx",
            "args": ["ai-agent-hub-mcp@0.0.8", "start"],
            "cwd": "${workspaceFolder}",
            "env": {
                "NODE_ENV": "production"
            }
        }
  }
}
```

**方法二：使用相对路径（适用于未打开文件夹的情况）**
```json
{
  "mcp.servers": {
    "ai-agent-hub": {
            "command": "npx",
            "args": ["ai-agent-hub-mcp@0.0.7", "start"],
            "cwd": ".",
            "env": {
                "NODE_ENV": "production"
            }
        }
  }
}
```

### 3. 全局配置（可选）

如果你想在所有项目中使用，可以在 VS Code 的全局设置中添加相同配置。

## 可用工具

MCP 服务器提供以下工具：

### 文件操作工具
- **write_file**: 创建或写入文件
- **read_file**: 读取文件内容
- **search_files**: 搜索文件和内容

### Shell 工具
- **run_shell**: 执行 shell 命令

### Git 工具
- **git**: 执行 git 命令

### AI 服务
- **local**: 本地 AI 服务
- **openai**: OpenAI API 集成（需要配置）
- **anthropic**: Anthropic API 集成（需要配置）

## 环境变量配置

在项目根目录创建 `.env` 文件来配置 AI 服务：

```env
# OpenAI 配置
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1

# Anthropic 配置
ANTHROPIC_API_KEY=your_anthropic_api_key

# 本地服务配置
LOCAL_AI_URL=http://localhost:11434
```

## 使用示例

### 1. 文件操作

```javascript
// 通过 MCP 客户端调用
{
  "tool": "write_file",
  "arguments": {
    "path": "./src/example.js",
    "content": "console.log('Hello World');"
  }
}
```

### 2. 代码搜索

```javascript
{
  "tool": "search_files",
  "arguments": {
    "query": "function calculateTotal",
    "filePattern": "*.js"
  }
}
```

### 3. 执行命令

```javascript
{
  "tool": "run_shell",
  "arguments": {
    "command": "npm test"
  }
}
```

## 故障排除

### 1. 服务器无法启动

- 检查 Node.js 版本（需要 >= 16）
- 确认包已正确安装：`npm list -g ai-agent-hub-mcp`
- 查看 VS Code 输出面板中的错误信息

### 2. 工作区变量错误

如果遇到 "Variable workspaceFolder can not be resolved" 错误：
- 确保在 VS Code 中打开了一个文件夹（File > Open Folder）
- 或者使用相对路径配置：将 `"cwd": "${workspaceFolder}"` 改为 `"cwd": "."`

### 3. 工具调用失败

- 检查工作目录权限
- 确认环境变量配置正确
- 查看 MCP 服务器日志

### 4. AI 服务不可用

- 检查 API 密钥配置
- 确认网络连接
- 验证 API 端点可访问性

## 开发和调试

### 启动开发模式

```bash
cd packages/ai-mcp
npm run dev
```

### 查看日志

服务器会输出详细的调试信息，包括：
- 工具注册状态
- AI 服务连接状态
- 请求处理日志

### 测试连接

```bash
# 测试服务器状态
ai-agent-hub-mcp status

# 启动服务器
ai-agent-hub-mcp start
```

## 版本更新日志

### v0.0.8 (最新)
- **修复npm包发布问题**：添加files配置确保所有必要文件被包含
- **解决模块错误**：解决"Cannot find module './tools/index'"错误
- **完善包文件结构**：优化包文件结构和发布配置

### v0.0.7
- **修复构建问题**：解决TypeScript编译配置问题，确保JavaScript文件正确生成
- **修复模块导入**：修正Node.js内置模块导入方式，移除冲突的path依赖
- **修复运行时错误**：解决"Cannot find module './tools/index'"错误
- **优化编译配置**：改进tsconfig.json配置，确保编译输出完整

### v0.0.6
- ✨ 改进启动信息显示，现在包含：
  - 清晰的版本信息和启动时间
  - 详细的工具列表（5个工具：write_file, read_file, search_files, run_shell, git）
  - AI服务状态信息
  - 使用说明和文档链接
- 🔧 优化日志格式，使用分隔线提高可读性
- 📖 完善错误提示和使用指南

### v0.0.5
- 🚀 首次发布到 npm registry
- 📝 添加 VS Code 配置支持

## 更新

```bash
# 更新到最新版本
npm update -g ai-agent-hub-mcp

# 检查版本
ai-agent-hub-mcp --version
```

## 支持

如果遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查 [GitHub Issues](https://github.com/your-repo/ai-agent-hub/issues)
3. 提交新的 Issue 并包含：
   - 错误信息
   - VS Code 版本
   - 操作系统信息
   - 配置文件内容