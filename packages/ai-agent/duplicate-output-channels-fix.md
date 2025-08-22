# 重复输出通道问题修复指南

## 问题描述
新版本 v0.0.19 发布后，仍然出现 2 个 "AI Agent Hub - Config Generator" 输出通道。

## 根本原因
虽然代码已修复（ConfigGeneratorParticipant 只实例化一次），但 VS Code 可能没有完全重新加载扩展，导致旧的实例仍在内存中。

## 解决方案

### 方法 1：完全重启 VS Code
1. **关闭所有 VS Code 窗口**
   - 使用 `Ctrl+Shift+P` 打开命令面板
   - 运行 `Developer: Reload Window` 或直接关闭所有窗口

2. **确保所有 VS Code 进程已结束**
   - 打开任务管理器
   - 结束所有 `Code.exe` 进程

3. **重新启动 VS Code**
   - 重新打开 VS Code
   - 检查输出面板，应该只有一个 "AI Agent Hub - Config Generator" 通道

### 方法 2：禁用并重新启用扩展
1. 打开扩展面板 (`Ctrl+Shift+X`)
2. 搜索 "AI Agent Hub"
3. 点击 "禁用" 按钮
4. 重新启动 VS Code
5. 重新启用扩展

### 方法 3：重新安装扩展
1. 卸载当前扩展
2. 重新从市场安装 v0.0.19

## 验证修复
1. 打开 VS Code
2. 按 `Ctrl+Shift+U` 打开输出面板
3. 在下拉菜单中查看，应该只有一个 "AI Agent Hub - Config Generator" 通道
4. 使用 `@config` 命令测试配置生成功能
5. 检查输出通道是否正确显示日志

## 技术细节
- **修复版本**: v0.0.19
- **修复内容**: 移除了 ConfigGeneratorParticipant 的重复实例化
- **发布时间**: 刚刚发布到 VS Code 市场

如果问题仍然存在，请提供详细的错误信息和 VS Code 版本号。