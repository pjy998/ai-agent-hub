# Chat 参与者使用指南

> AI Agent Hub Chat 参与者系统完整使用手册

**版本**: v0.0.22  
**更新日期**: 2025年8月23日

## 概述

AI Agent Hub 通过 Chat 参与者系统为 VS Code 提供智能编程辅助。每个参与者都专注于特定的功能领域，通过 `@` 符号在 VS Code Chat 面板中调用。

## 快速开始

### 激活 Chat 面板
1. 使用快捷键 `Ctrl+Shift+I` (Windows/Linux) 或 `Cmd+Shift+I` (macOS)
2. 或通过菜单：`View` → `Open View...` → `Chat`
3. 确保已安装并启用 GitHub Copilot 扩展

### 基本使用语法
```
@参与者名称 您的问题或指令
```

## Chat 参与者详解

### 🔍 @code - 代码分析参与者

**主要功能**：多语言代码分析和优化建议

#### 支持的编程语言
- C# (.cs)
- JavaScript (.js)
- TypeScript (.ts)
- Python (.py)
- Java (.java)
- Go (.go)
- Rust (.rs)
- Vue.js (.vue)
- React (.jsx, .tsx)

#### 使用示例

**代码质量分析**
```
@code 分析当前文件的代码质量
@code 检查这个函数的性能问题
@code 这段代码有什么可以改进的地方？
```

**代码优化建议**
```
@code 如何优化这个循环的性能？
@code 这个函数可以重构吗？
@code 建议更好的错误处理方式
```

**最佳实践检查**
```
@code 检查代码是否符合最佳实践
@code 这个类的设计有什么问题？
@code 推荐更好的命名方式
```

#### 分析维度
- **代码质量**: 可读性、可维护性、复杂度
- **性能分析**: 时间复杂度、空间复杂度、瓶颈识别
- **安全检查**: 常见安全漏洞、输入验证
- **最佳实践**: 编码规范、设计模式、架构建议

### 📊 @report - 报告生成参与者

**主要功能**：项目分析报告生成

#### 报告类型

**项目概览报告**
```
@report 生成项目概览报告
@report 分析项目结构和技术栈
@report 项目健康度评估
```

**代码质量报告**
```
@report 生成代码质量报告
@report 分析代码复杂度分布
@report 检查代码覆盖率和测试情况
```

**技术债务报告**
```
@report 分析技术债务情况
@report 识别需要重构的代码
@report 评估维护成本
```

**依赖分析报告**
```
@report 分析项目依赖关系
@report 检查过时的依赖包
@report 安全漏洞扫描报告
```

#### 报告格式
- **Markdown**: 适合文档和分享
- **HTML**: 适合浏览器查看
- **JSON**: 适合程序化处理
- **PDF**: 适合正式文档

### 🎯 @token - Token 管理参与者

**主要功能**：Token 使用情况监控和优化

#### 监控功能

**使用统计**
```
@token 显示今日 token 使用情况
@token 查看本周 token 消耗统计
@token 分析 token 使用趋势
```

**成本分析**
```
@token 计算本月 API 调用成本
@token 预估下月费用
@token 成本优化建议
```

**性能监控**
```
@token 查看 API 响应时间
@token 分析请求失败率
@token 监控服务可用性
```

#### 优化建议

**提示词优化**
```
@token 优化这个提示词的 token 使用
@token 如何减少 token 消耗？
@token 批处理优化建议
```

**配置调优**
```
@token 推荐最佳配置参数
@token 调整模型选择策略
@token 优化缓存设置
```

### ⚙️ @config - 配置管理参与者

**主要功能**：扩展配置管理

#### 配置查看

**当前配置**
```
@config 显示当前扩展配置
@config 查看用户设置
@config 显示工作区配置
```

**配置验证**
```
@config 验证配置是否正确
@config 检查配置冲突
@config 诊断配置问题
```

#### 配置管理

**配置修改**
```
@config 修改分析语言设置
@config 更新报告输出格式
@config 调整 token 限制
```

**配置重置**
```
@config 重置为默认配置
@config 清除用户自定义设置
@config 恢复工厂设置
```

**配置导入导出**
```
@config 导出当前配置
@config 导入配置文件
@config 分享配置模板
```

#### 配置项说明

**基础设置**
- `aiAgent.analysis.languages`: 支持的分析语言
- `aiAgent.report.format`: 默认报告格式
- `aiAgent.token.limit`: Token 使用限制

**高级设置**
- `aiAgent.cache.enabled`: 启用缓存
- `aiAgent.logging.level`: 日志级别
- `aiAgent.security.mode`: 安全模式

### 💡 @recommend - 推荐系统参与者

**主要功能**：智能推荐和最佳实践

#### 推荐类型

**代码改进推荐**
```
@recommend 推荐代码改进方案
@recommend 建议重构策略
@recommend 优化算法选择
```

**工具推荐**
```
@recommend 推荐适合的开发工具
@recommend 建议测试框架
@recommend 推荐 CI/CD 方案
```

**学习资源推荐**
```
@recommend 推荐学习资料
@recommend 相关技术文档
@recommend 最佳实践案例
```

**架构建议**
```
@recommend 项目架构优化建议
@recommend 设计模式推荐
@recommend 技术栈选择建议
```

#### 个性化推荐

推荐系统会根据以下因素提供个性化建议：
- 项目类型和规模
- 使用的技术栈
- 代码质量水平
- 团队经验水平
- 业务需求特点

## 高级使用技巧

### 组合使用

**分析 + 报告**
```
@code 分析项目代码质量
@report 基于分析结果生成详细报告
```

**配置 + 优化**
```
@config 检查当前配置
@token 基于配置优化 token 使用
```

**推荐 + 实施**
```
@recommend 推荐项目改进方案
@code 实施推荐的代码优化
```

### 上下文感知

参与者会自动感知当前上下文：
- **当前文件**: 自动分析当前打开的文件
- **选中代码**: 针对选中的代码片段进行分析
- **项目根目录**: 基于整个项目进行分析
- **工作区设置**: 考虑当前工作区的配置

### 批量操作

**批量文件分析**
```
@code 分析 src 目录下的所有 TypeScript 文件
@report 为所有 .cs 文件生成质量报告
```

**批量配置更新**
```
@config 为所有工作区应用相同配置
@config 批量更新项目设置
```

## 最佳实践

### 提问技巧

**具体明确**
```
❌ @code 这个代码怎么样？
✅ @code 分析这个排序算法的时间复杂度和优化建议
```

**提供上下文**
```
❌ @recommend 推荐工具
✅ @recommend 为 React + TypeScript 项目推荐测试工具
```

**分步骤操作**
```
1. @code 先分析代码问题
2. @recommend 获取改进建议
3. @code 实施具体优化
4. @report 生成改进报告
```

### 工作流建议

**日常开发流程**
1. 编写代码
2. `@code` 分析代码质量
3. 根据建议优化代码
4. `@token` 检查 API 使用情况

**项目评估流程**
1. `@report` 生成项目概览
2. `@code` 深入分析关键模块
3. `@recommend` 获取改进建议
4. `@config` 优化项目配置

**性能优化流程**
1. `@code` 识别性能瓶颈
2. `@recommend` 获取优化方案
3. `@token` 监控优化效果
4. `@report` 生成性能报告

## 故障排除

### 常见问题

**参与者无响应**
- 检查 GitHub Copilot 是否正常工作
- 确认扩展已正确安装和激活
- 重启 VS Code 并重试

**分析结果不准确**
- 确保项目文件完整
- 检查文件编码格式
- 更新到最新版本

**配置问题**
- 使用 `@config 诊断配置问题`
- 重置为默认配置
- 检查工作区设置冲突

### 获取帮助

**内置帮助**
```
@code help
@report help
@token help
@config help
@recommend help
```

**社区支持**
- GitHub Issues: 报告 bug 和功能请求
- GitHub Discussions: 社区讨论和经验分享
- 官方文档: 查看最新文档和更新

## 更新日志

### v0.0.22 (当前版本)
- ✅ 完整的 Chat 参与者系统
- ✅ 增强的多语言支持
- ✅ 优化的 Token 管理
- ✅ 改进的配置系统
- ✅ 智能推荐功能

### 即将推出
- 🔄 可视化报告界面
- 🔄 自定义分析规则
- 🔄 团队协作功能
- 🔄 API 集成扩展

---

**提示**: 本指南会随着功能更新持续完善，建议定期查看最新版本。