# AI Agent Hub 0.0.1 快速开始指南

## 🎯 两种使用方式

AI Agent Hub 0.0.1 支持两种集成方式：

### 方式 1: VS Code 原生 MCP 集成 (推荐)
使用 VS Code 的原生 MCP 支持，无需安装扩展。

### 方式 2: VS Code 扩展模式
使用自定义 VS Code 扩展进行集成。

---

## 🚀 方式 1: VS Code 原生 MCP 集成

### 步骤 1: 构建项目
```bash
# Windows
build-0.0.1.bat

# Linux/Mac
chmod +x build-0.0.1.sh
./build-0.0.1.sh
```

### 步骤 2: 安装 MCP 服务器
```bash
# 全局安装 (推荐)
npm install -g @ai-agent-hub/mcp

# 或使用 npx (无需安装)
npx @ai-agent-hub/mcp start
```

### 步骤 3: 启动 MCP 服务器
```bash
# 在项目目录中启动
cd d:/trae/ai-agent-hub
npx @ai-agent-hub/mcp start
```

### 步骤 4: 配置 VS Code
项目已包含 `.vscode/settings.json` 配置，VS Code 会自动连接。

### 步骤 5: 在 VS Code Chat 中使用
```
@ai-agent-hub 创建一个计算器函数
@ai-agent-hub 重构这段代码
@ai-agent-hub 分析用户登录需求
```

---

## 🔧 方式 2: VS Code 扩展模式

### 步骤 1: 构建项目
```bash
# Windows
build-0.0.1.bat

# Linux/Mac
chmod +x build-0.0.1.sh
./build-0.0.1.sh
```

### 步骤 2: 启动 MCP 服务器
```bash
cd d:/trae/ai-agent-hub
ai-agent-mcp start
```

### 步骤 3: 启动 VS Code 扩展
```bash
# 在 VS Code 中
# 1. 打开 packages/ai-agent 目录
# 2. 按 F5 启动扩展开发主机
# 3. 在新窗口中打开 ai-agent-hub 项目
```

### 步骤 4: 测试 Chat Participants
```
@ai-agent.coding 创建一个计算器函数
@ai-agent.refactor 优化这段代码
@ai-agent.requirements 分析需求
```

---

## 📊 功能对比

| 功能 | VS Code 原生 MCP | VS Code 扩展模式 |
|------|------------------|------------------|
| 安装复杂度 | ⭐⭐⭐⭐⭐ 简单 | ⭐⭐⭐ 中等 |
| 启动速度 | ⭐⭐⭐⭐⭐ 快速 | ⭐⭐⭐ 中等 |
| 稳定性 | ⭐⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐ 较高 |
| 调试功能 | ⭐⭐⭐ 基础 | ⭐⭐⭐⭐⭐ 完整 |
| 自定义性 | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐⭐ 高 |

## 🎯 推荐使用场景

### 使用 VS Code 原生 MCP 当：
- ✅ 需要简单快速的集成
- ✅ 多项目并发开发
- ✅ 生产环境使用
- ✅ 团队协作开发

### 使用 VS Code 扩展模式当：
- ✅ 需要调试工作流
- ✅ 需要自定义功能
- ✅ 开发和测试阶段
- ✅ 需要详细的历史记录

---

## 🔍 验证安装

### 方式 1 验证 (VS Code 原生 MCP)
```bash
# 1. 检查 MCP 服务器
npx @ai-agent-hub/mcp status

# 2. 在 VS Code Chat 中测试
@ai-agent-hub list_presets
@ai-agent-hub get_project_info
```

### 方式 2 验证 (VS Code 扩展)
```bash
# 1. 检查 MCP 服务器
ai-agent-mcp status

# 2. 在 VS Code Chat 中测试
@ai-agent.coding help
@ai-agent.refactor help
```

---

## 🛠️ 故障排除

### 常见问题 1: MCP 服务器启动失败
```bash
# 检查 Node.js 版本
node --version  # 需要 >= 16.x

# 清理并重新安装
npm cache clean --force
npm install -g @ai-agent-hub/mcp
```

### 常见问题 2: VS Code 无法连接
```bash
# 检查配置文件
cat .vscode/settings.json

# 重启 VS Code
# 查看输出面板的 MCP 日志
```

### 常见问题 3: 预设文件未找到
```bash
# 确保预设目录存在
ls agents/presets/

# 应该包含：
# - coding-with-ai.yaml
# - refactor.yaml
# - requirements-analysis.yaml
```

---

## 📚 相关文档

- [VS Code MCP 设置指南](./vscode-mcp-setup.md)
- [0.0.1 版本验证指南](./packages/ai-agent/verify-0.0.1.md)
- [MCP 配置文件](./mcp-config.json)
- [项目 README](./README.md)

---

## 🎉 成功标志

安装成功后，你应该能够：
- [ ] MCP 服务器正常启动
- [ ] VS Code 显示 MCP 连接状态
- [ ] Chat 中可以使用 AI Agent 命令
- [ ] 工作流可以正常执行
- [ ] 获取项目信息和预设列表

选择适合你需求的方式开始使用 AI Agent Hub！