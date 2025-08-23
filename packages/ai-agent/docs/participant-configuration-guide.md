# 参与者配置管理指南

本指南介绍如何使用新的参与者配置管理系统，避免硬编码参与者名称和命令，提高代码的可维护性和一致性。

## 概述

为了解决硬编码参与者名称导致的维护问题，我们引入了统一的配置管理系统：

- **集中配置**: 所有参与者信息在 `participants-config.ts` 中统一管理
- **动态引用**: 通过配置管理器动态生成参与者名称和命令
- **类型安全**: 使用 TypeScript 类型确保配置的正确性
- **易于维护**: 修改参与者名称只需更新配置文件

## 核心文件

### 1. 配置文件 (`src/config/participants-config.ts`)

定义所有参与者的基本信息和常用命令：

```typescript
export const PARTICIPANTS_CONFIG = {
  CODE: {
    id: 'code',
    name: 'Code Analyzer',
    description: '代码分析助手',
    displayName: '@code'
  },
  REPORT: {
    id: 'report',
    name: 'Report Generator',
    description: '报告生成助手',
    displayName: '@report'
  }
  // ... 其他参与者
} as const;

export const COMMON_COMMANDS = {
  ANALYZE_PROJECT: ['分析项目', '分析', '扫描'],
  QUALITY_CHECK: ['质量检查', '编码规范', '规范'],
  GENERATE_REPORT: ['生成报告', '报告', '导出'],
  SHOW_ISSUES: ['显示问题', '问题', '建议'],
  SHOW_STATS: ['统计', '数据', '指标']
} as const;
```

### 2. 配置管理器 (`ParticipantsConfigManager`)

提供访问配置的统一接口：

```typescript
// 获取参与者显示名称
const displayName = ParticipantsConfigManager.getDisplayName('CODE'); // '@code'

// 获取参与者名称（不带@）
const name = ParticipantsConfigManager.getParticipantName('CODE'); // 'code'

// 生成命令帮助
const commands = ParticipantsConfigManager.generateCommandHelp('CODE', COMMON_COMMANDS.ANALYZE_PROJECT);
// 返回: ['@code 分析项目', '@code 分析', '@code 扫描']
```

### 3. 辅助工具类 (`src/utils/participant-helper.ts`)

提供更高级的辅助方法：

```typescript
// 获取单个命令引用
const command = ParticipantHelper.getCommandReference('CODE', 'ANALYZE_PROJECT');
// 返回: '@code 分析项目'

// 生成帮助文档部分
const helpSections = ParticipantHelper.generateHelpSections('CODE', [
  {
    title: '📋 项目分析',
    commandType: 'ANALYZE_PROJECT',
    description: '项目结构和代码分析'
  }
]);

// 生成快速操作
const quickActions = ParticipantHelper.generateQuickActions('CODE', [
  {
    icon: '🔍',
    label: '分析项目',
    commandType: 'ANALYZE_PROJECT'
  }
]);
```

## 使用指南

### 1. 在参与者中使用配置系统

**❌ 错误的硬编码方式：**

```typescript
// 不要这样做
stream.markdown('使用 `@csharp 分析项目` 开始分析');
stream.markdown('- `@codeanalysis 质量检查` - 代码质量评估');
```

**✅ 正确的配置化方式：**

```typescript
// 导入配置
import { ParticipantHelper, HELP_TEMPLATES } from '../utils/participant-helper';

// 使用配置生成命令引用
const analyzeCommand = ParticipantHelper.getCommandReference('CODE', 'ANALYZE_PROJECT');
stream.markdown(`使用 ${analyzeCommand} 开始分析`);

// 使用模板生成帮助文档
const helpSections = ParticipantHelper.generateHelpSections('CODE', HELP_TEMPLATES.ANALYSIS_ASSISTANT.sections);
stream.markdown(helpSections);
```

### 2. 添加新的参与者

1. 在 `PARTICIPANTS_CONFIG` 中添加新的参与者配置：

```typescript
export const PARTICIPANTS_CONFIG = {
  // ... 现有配置
  NEW_PARTICIPANT: {
    id: 'new',
    name: 'New Assistant',
    description: '新的助手',
    displayName: '@new'
  }
} as const;
```

2. 在参与者实现中使用配置：

```typescript
const command = ParticipantHelper.getCommandReference('NEW_PARTICIPANT', 'ANALYZE_PROJECT');
```

### 3. 添加新的命令类型

在 `COMMON_COMMANDS` 中添加新的命令类型：

```typescript
export const COMMON_COMMANDS = {
  // ... 现有命令
  NEW_COMMAND: ['新命令', '命令别名']
} as const;
```

### 4. 创建自定义帮助模板

在 `participant-helper.ts` 中添加新的模板：

```typescript
export const HELP_TEMPLATES = {
  // ... 现有模板
  CUSTOM_TEMPLATE: {
    sections: [
      {
        title: '🔧 自定义功能',
        commandType: 'NEW_COMMAND',
        description: '自定义功能描述'
      }
    ],
    quickActions: [
      {
        icon: '🔧',
        label: '自定义操作',
        commandType: 'NEW_COMMAND'
      }
    ]
  }
};
```

## 最佳实践

### 1. 避免硬编码

- **永远不要**在代码中直接写参与者名称（如 `@csharp`、`@code`）
- **始终使用**配置管理器或辅助工具类获取参与者信息
- **保持一致性**，所有参与者都应使用相同的配置系统

### 2. 使用类型安全

```typescript
// 使用类型安全的参与者ID
type ParticipantId = keyof typeof PARTICIPANTS_CONFIG;
type CommandType = keyof typeof COMMON_COMMANDS;

function getCommand(participantId: ParticipantId, commandType: CommandType) {
  return ParticipantHelper.getCommandReference(participantId, commandType);
}
```

### 3. 模块化帮助文档

使用预定义的模板和辅助方法，而不是手动构建帮助文档：

```typescript
// 推荐：使用模板
const helpContent = ParticipantHelper.generateHelpSections(
  'CODE', 
  HELP_TEMPLATES.ANALYSIS_ASSISTANT.sections
);

// 不推荐：手动构建
const helpContent = `
### 项目分析
- @code 分析项目 - 项目分析
- @code 分析 - 快速分析
`;
```

### 4. 保持配置同步

- 修改 `package.json` 中的参与者ID时，同步更新配置文件
- 确保 `extension.ts` 中的注册代码使用相同的ID
- 定期检查配置的一致性

## 迁移指南

### 从硬编码迁移到配置化

1. **识别硬编码**：搜索代码中的 `@` 符号和参与者名称
2. **替换引用**：使用配置管理器替换硬编码的参与者名称
3. **测试验证**：确保所有命令引用正确工作
4. **文档更新**：更新相关文档以反映新的配置系统

### 示例迁移

**迁移前：**
```typescript
stream.markdown('使用 `@csharp 分析项目` 开始分析');
stream.markdown('- `@codeanalysis 质量检查` - 代码质量评估');
```

**迁移后：**
```typescript
const analyzeCommand = ParticipantHelper.getCommandReference('CODE', 'ANALYZE_PROJECT');
const qualityCommand = ParticipantHelper.getCommandReference('CODE', 'QUALITY_CHECK');

stream.markdown(`使用 ${analyzeCommand} 开始分析`);
stream.markdown(`- ${qualityCommand} - 代码质量评估`);
```

## 故障排除

### 常见问题

1. **参与者名称不匹配**
   - 检查 `package.json`、`extension.ts` 和配置文件中的ID是否一致
   - 确保使用正确的参与者ID键名

2. **命令不工作**
   - 验证命令类型是否在 `COMMON_COMMANDS` 中定义
   - 检查参与者是否正确注册

3. **类型错误**
   - 确保使用正确的类型定义
   - 检查导入语句是否正确

### 调试技巧

```typescript
// 调试参与者配置
console.log('Available participants:', Object.keys(PARTICIPANTS_CONFIG));
console.log('Available commands:', Object.keys(COMMON_COMMANDS));

// 验证生成的命令
const commands = ParticipantsConfigManager.generateCommandHelp('CODE', COMMON_COMMANDS.ANALYZE_PROJECT);
console.log('Generated commands:', commands);
```

## 总结

通过使用这个配置管理系统，我们可以：

- ✅ 避免硬编码参与者名称
- ✅ 提高代码的可维护性
- ✅ 确保参与者名称的一致性
- ✅ 简化帮助文档的生成
- ✅ 提供类型安全的配置访问

记住：**永远不要硬编码参与者名称，始终使用配置系统！**