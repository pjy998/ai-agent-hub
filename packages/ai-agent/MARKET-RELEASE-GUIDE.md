# VS Code 市场发布指南 - 版本 0.0.16

## 🚨 紧急修复发布

本次发布主要修复了远程用户报告的控制台错误问题，确保 `@ai-agent.config` 命令能够正常工作。

## 📋 发布前准备

### ✅ 已完成项目
- [x] **Bug 修复**: 添加了缺失的 `yaml` 运行时依赖
- [x] **版本更新**: 从 0.0.15 升级到 0.0.16
- [x] **CHANGELOG 更新**: 记录了本次修复的详细信息
- [x] **编译验证**: TypeScript 编译成功
- [x] **打包验证**: VSIX 文件生成成功 (ai-agent-vscode-0.0.16.vsix)
- [x] **本地测试**: 修复验证完成

### 🔄 待执行项目
- [ ] **市场发布**: 发布到 VS Code 市场
- [ ] **发布验证**: 确认远程用户可以正常使用

## 🐛 本次修复的问题

### 问题描述
远程用户在使用 `@ai-agent.config generate csharp` 命令时遇到：
1. Copilot Chat 返回 "unclear" 错误
2. VS Code 控制台显示 "Cannot find module 'yaml'" 错误
3. 扩展的 Chat 参与者无法正确激活

### 根本原因
- `package.json` 缺少 `yaml` 包作为运行时依赖
- 只有 `@types/js-yaml` 作为开发依赖，缺少实际的运行时包
- 导致扩展在远程环境中加载时模块解析失败

### 修复内容
1. **添加运行时依赖**：在 `package.json` 中添加 `"yaml": "^2.3.4"`
2. **依赖安装**：确保新依赖被正确安装
3. **重新编译打包**：生成包含修复的新版本

## 🚀 发布步骤

### 1. 登录 VS Code 市场

```powershell
# 如果还没有登录，需要先登录
vsce login jieky
# 输入 Azure DevOps 个人访问令牌 (PAT)
```

### 2. 发布到市场

```powershell
# 方法1: 使用 npm 脚本
npm run publish

# 方法2: 直接使用 vsce
vsce publish

# 方法3: 发布特定版本
vsce publish 0.0.16
```

### 3. 验证发布

1. **检查市场页面**：
   - 访问 [VS Code 市场](https://marketplace.visualstudio.com/items?itemName=jieky.ai-agent-vscode)
   - 确认版本已更新到 0.0.16
   - 检查更新日志是否正确显示

2. **远程安装测试**：
   ```powershell
   # 从市场安装最新版本
   code --install-extension jieky.ai-agent-vscode
   ```

3. **功能验证**：
   - 重启 VS Code
   - 在 Copilot Chat 中测试 `@ai-agent.config generate csharp`
   - 确认不再出现 "unclear" 错误
   - 检查控制台无模块解析错误

## 📊 发布后操作

### 1. 通知用户

可以通过以下渠道通知用户更新：
- GitHub Issues 回复
- 项目 README 更新
- 发布说明

### 2. 监控反馈

- 关注 VS Code 市场的用户评论
- 监控 GitHub Issues 中的新问题报告
- 检查下载和安装统计

### 3. 准备下次发布

```powershell
# 为下次发布准备
git add .
git commit -m "fix: resolve yaml dependency issue for remote users (v0.0.16)"
git push origin main
git tag v0.0.16
git push origin v0.0.16
```

## 🔍 发布验证清单

### 发布前验证
- [ ] 版本号正确 (0.0.16)
- [ ] CHANGELOG 已更新
- [ ] 编译无错误
- [ ] VSIX 文件生成成功
- [ ] 本地安装测试通过

### 发布后验证
- [ ] 市场页面显示新版本
- [ ] 远程安装成功
- [ ] `@ai-agent.config` 命令正常工作
- [ ] 控制台无错误信息
- [ ] Chat 参与者正确激活

## 🚨 紧急回滚计划

如果发布后发现新问题：

1. **立即回滚**：
   ```powershell
   # 发布上一个稳定版本
   vsce publish 0.0.15
   ```

2. **问题修复**：
   - 在本地环境修复问题
   - 更新版本号到 0.0.17
   - 重新测试和发布

## 📞 联系信息

如果发布过程中遇到问题：
- GitHub Issues: https://github.com/pjy998/ai-agent-hub/issues
- VS Code 市场支持: https://marketplace.visualstudio.com/

## 📚 相关文档

- [CONSOLE-ERROR-ANALYSIS.md](./CONSOLE-ERROR-ANALYSIS.md) - 详细的错误分析
- [PUBLISHING.md](./PUBLISHING.md) - 完整的发布指南
- [CHANGELOG.md](./CHANGELOG.md) - 版本更新记录

---

**重要提醒**: 这是一个紧急修复版本，主要解决远程用户无法正常使用扩展的问题。发布后请及时验证功能是否正常。