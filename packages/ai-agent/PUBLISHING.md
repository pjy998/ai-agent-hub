# 发布指南 - AI Agent Hub VS Code Extension

本文档详细说明如何将 AI Agent Hub 扩展发布到 VS Code 市场。

## 📋 发布前检查清单

### ✅ 已完成项目
- [x] **Package.json 配置**: 版本、描述、关键词、发布者信息
- [x] **市场资源**: 图标 (icon.png)、README.md、CHANGELOG.md
- [x] **构建验证**: TypeScript 编译成功，VSIX 打包成功
- [x] **代码质量**: 所有 TypeScript 错误已修复

### 🔄 待完成项目
- [ ] **Azure DevOps 令牌**: 获取个人访问令牌 (PAT)
- [ ] **本地测试**: 安装并测试扩展功能
- [ ] **发布执行**: 运行发布命令

## 🚀 发布步骤

### 1. 获取 Azure DevOps 个人访问令牌 (PAT)

1. 访问 [Azure DevOps](https://dev.azure.com/)
2. 登录您的 Microsoft 账户
3. 点击右上角用户头像 → **Personal access tokens**
4. 点击 **+ New Token**
5. 配置令牌:
   - **Name**: `VS Code Extension Publishing`
   - **Organization**: 选择 `All accessible organizations`
   - **Expiration**: 选择合适的过期时间
   - **Scopes**: 选择 `Custom defined`
   - **Marketplace**: 勾选 `Acquire` 和 `Manage`
6. 点击 **Create** 并**保存生成的令牌**

### 2. 配置 VSCE 发布工具

```powershell
# 登录到 VS Code 市场
vsce login jieky
# 输入刚才获取的 PAT 令牌
```

### 3. 本地测试扩展

```powershell
# 安装打包好的扩展进行测试
code --install-extension ai-agent-vscode-0.1.0.vsix
```

测试功能:
- 打开命令面板 (`Ctrl+Shift+P`)
- 运行 `AI Agent Hub: Analyze Self`
- 测试 Copilot Chat 集成 (`@analyze csharp`)
- 验证所有功能正常工作

### 4. 发布到市场

```powershell
# 发布扩展
npm run publish

# 或者直接使用 vsce
vsce publish
```

### 5. 验证发布

1. 访问 [VS Code 市场](https://marketplace.visualstudio.com/)
2. 搜索 "AI Agent Hub" 或 "jieky"
3. 确认扩展已成功发布
4. 检查扩展页面信息是否正确

## 🔧 发布配置详情

### Package.json 关键配置

```json
{
  "name": "ai-agent-vscode",
  "displayName": "AI Agent Hub",
  "description": "AI-powered coding assistant with project analysis, C# coding standards, and intelligent workflow automation for VS Code",
  "version": "0.1.0",
  "publisher": "jieky",
  "icon": "icon.png",
  "repository": {
    "type": "git",
    "url": "https://github.com/pjy998/ai-agent-hub.git"
  }
}
```

### 发布脚本

```json
{
  "scripts": {
    "vscode:prepublish": "npm run build",
    "build": "npm run compile",
    "compile": "tsc -p ./",
    "package": "vsce package",
    "publish": "vsce publish"
  }
}
```

## 📊 发布后操作

### 1. 更新版本号

发布成功后，为下次发布准备:

```powershell
# 更新版本号 (patch/minor/major)
npm version patch
```

### 2. 更新 CHANGELOG

在 `CHANGELOG.md` 中记录新版本的更改:

```markdown
## [0.1.1] - 2024-12-21
### 🔧 Fixed
- 修复了某个问题
### ✨ Added
- 新增了某个功能
```

### 3. 推送到 Git

```powershell
git add .
git commit -m "chore: release v0.1.0"
git push origin main
git tag v0.1.0
git push origin v0.1.0
```

## 🚨 常见问题

### 发布失败

**问题**: `Error: Failed request: (401) Unauthorized`
**解决**: 检查 PAT 令牌是否正确，重新运行 `vsce login`

**问题**: `Error: Extension name already exists`
**解决**: 更改 `package.json` 中的 `name` 字段

**问题**: `Error: Publisher not found`
**解决**: 确保在 [VS Code 市场](https://marketplace.visualstudio.com/manage) 创建了发布者账户

### 扩展不显示

**问题**: 扩展发布后在市场中找不到
**解决**: 发布后可能需要几分钟时间同步，耐心等待

### 图标不显示

**问题**: 扩展图标在市场中不显示
**解决**: 确保 `icon.png` 文件存在且路径正确

## 📚 相关资源

- [VS Code Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [VSCE CLI Reference](https://github.com/microsoft/vscode-vsce)
- [Azure DevOps PAT Guide](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)
- [VS Code Marketplace](https://marketplace.visualstudio.com/)

## 🎯 下一步

发布成功后，考虑:

1. **用户反馈**: 监控 GitHub Issues 和市场评论
2. **功能迭代**: 根据用户需求添加新功能
3. **性能优化**: 持续改进扩展性能
4. **文档完善**: 更新用户文档和 API 文档

---

**祝发布顺利！** 🎉