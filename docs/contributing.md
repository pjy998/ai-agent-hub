# 贡献指南

> 欢迎为 AI Agent Hub 项目做出贡献！

**版本**: v0.0.22  
**更新日期**: 2025年8月23日

## 欢迎贡献者

感谢您对 AI Agent Hub 项目的关注！我们欢迎各种形式的贡献，包括但不限于：

- 🐛 **Bug 报告**：发现并报告问题
- 💡 **功能建议**：提出新功能想法
- 🔧 **代码贡献**：修复 bug 或实现新功能
- 📚 **文档改进**：完善文档和示例
- 🌍 **本地化**：翻译和多语言支持
- 🎨 **设计改进**：UI/UX 优化建议
- 🧪 **测试**：编写和改进测试用例

## 快速开始

### 1. 准备环境

确保您的开发环境满足以下要求：
- Node.js 16.0.0+
- npm 8.0.0+
- VS Code 1.74.0+
- Git 2.30.0+

### 2. Fork 和克隆项目

```bash
# 1. Fork 项目到您的 GitHub 账户
# 2. 克隆您的 Fork
git clone https://github.com/YOUR_USERNAME/ai-agent-hub.git
cd ai-agent-hub

# 3. 添加上游仓库
git remote add upstream https://github.com/original-org/ai-agent-hub.git
```

### 3. 安装依赖

```bash
npm install
cd packages/ai-agent
npm install
```

### 4. 创建开发分支

```bash
git checkout -b feature/your-feature-name
```

## 贡献类型

### 🐛 Bug 报告

#### 报告前的检查

1. **搜索现有 Issues**：确保问题尚未被报告
2. **使用最新版本**：确认问题在最新版本中仍然存在
3. **最小化重现**：创建最简单的重现步骤

#### Bug 报告模板

```markdown
## Bug 描述
简洁清晰地描述遇到的问题。

## 重现步骤
1. 打开 VS Code
2. 安装 AI Agent Hub 扩展
3. 执行 '@code 分析代码'
4. 观察到错误

## 期望行为
描述您期望发生的行为。

## 实际行为
描述实际发生的行为。

## 环境信息
- OS: [例如 Windows 11]
- VS Code 版本: [例如 1.85.0]
- 扩展版本: [例如 0.0.22]
- Node.js 版本: [例如 18.17.0]

## 附加信息
- 错误日志
- 截图
- 相关配置文件
```

### 💡 功能建议

#### 建议前的考虑

1. **明确需求**：清楚描述要解决的问题
2. **考虑影响**：评估对现有功能的影响
3. **提供方案**：如果可能，提供实现思路

#### 功能建议模板

```markdown
## 功能描述
简洁描述建议的功能。

## 问题背景
描述当前遇到的问题或限制。

## 解决方案
详细描述建议的解决方案。

## 替代方案
描述考虑过的其他解决方案。

## 附加信息
- 使用场景
- 预期收益
- 实现复杂度评估
```

### 🔧 代码贡献

#### 开发流程

1. **选择 Issue**
   - 查看 [Good First Issue](https://github.com/org/ai-agent-hub/labels/good%20first%20issue) 标签
   - 在 Issue 中评论表明您要处理该问题
   - 等待维护者确认分配

2. **开发准备**
   ```bash
   # 同步最新代码
   git checkout develop
   git pull upstream develop
   
   # 创建功能分支
   git checkout -b feature/issue-123-add-new-participant
   ```

3. **编写代码**
   - 遵循项目的代码规范
   - 编写必要的测试
   - 更新相关文档

4. **测试验证**
   ```bash
   # 运行测试
   npm test
   
   # 代码检查
   npm run lint
   
   # 构建验证
   npm run build
   ```

5. **提交代码**
   ```bash
   git add .
   git commit -m "feat(participants): add new chat participant for issue #123"
   git push origin feature/issue-123-add-new-participant
   ```

#### 代码规范

**TypeScript 规范**

```typescript
// ✅ 好的示例
export interface IChatParticipant {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  
  handleRequest(request: ChatRequest): Promise<ChatResponse>;
}

export class CodeParticipant implements IChatParticipant {
  public readonly id = 'code';
  public readonly name = 'Code Analyzer';
  public readonly description = 'Analyzes code quality and provides suggestions';
  
  /**
   * 处理聊天请求
   * @param request 聊天请求对象
   * @returns 聊天响应
   */
  public async handleRequest(request: ChatRequest): Promise<ChatResponse> {
    try {
      // 实现逻辑
      return this.processCodeAnalysis(request);
    } catch (error) {
      Logger.error('Failed to handle chat request', error);
      throw new Error('Code analysis failed');
    }
  }
  
  private async processCodeAnalysis(request: ChatRequest): Promise<ChatResponse> {
    // 私有方法实现
  }
}
```

**命名约定**

- **文件名**: kebab-case (`code-participant.ts`)
- **类名**: PascalCase (`CodeParticipant`)
- **接口名**: 以 `I` 开头 (`IChatParticipant`)
- **方法名**: camelCase (`handleRequest`)
- **常量**: UPPER_SNAKE_CASE (`MAX_TOKEN_LIMIT`)
- **枚举**: PascalCase (`ParticipantType`)

**注释规范**

```typescript
/**
 * 项目分析引擎
 * 
 * 负责扫描项目结构，分析代码质量，生成改进建议
 * 
 * @example
 * ```typescript
 * const engine = new ProjectAnalysisEngine();
 * const result = await engine.scanProject('/path/to/project');
 * console.log(result.summary);
 * ```
 */
export class ProjectAnalysisEngine {
  /**
   * 扫描项目目录
   * 
   * @param rootPath - 项目根目录路径
   * @param options - 扫描选项
   * @returns 项目扫描结果
   * 
   * @throws {Error} 当路径不存在时抛出错误
   */
  public async scanProject(
    rootPath: string,
    options: ScanOptions = {}
  ): Promise<ProjectScanResult> {
    // 实现
  }
}
```

#### 测试要求

**单元测试**

```typescript
// test/suite/code-participant.test.ts
import * as assert from 'assert';
import { CodeParticipant } from '../../src/participants/CodeParticipant';
import { ChatRequest } from '../../src/types';

suite('CodeParticipant', () => {
  let participant: CodeParticipant;
  
  setup(() => {
    participant = new CodeParticipant();
  });
  
  test('should have correct id and name', () => {
    assert.strictEqual(participant.id, 'code');
    assert.strictEqual(participant.name, 'Code Analyzer');
  });
  
  test('should handle code analysis request', async () => {
    const request: ChatRequest = {
      prompt: 'analyze this function',
      context: {
        file: 'test.ts',
        content: 'function add(a: number, b: number) { return a + b; }'
      }
    };
    
    const response = await participant.handleRequest(request);
    
    assert.ok(response);
    assert.ok(response.content.length > 0);
    assert.ok(response.content.includes('function'));
  });
  
  test('should handle errors gracefully', async () => {
    const request: ChatRequest = {
      prompt: 'analyze invalid code',
      context: {
        file: 'invalid.ts',
        content: 'invalid syntax here'
      }
    };
    
    await assert.rejects(
      () => participant.handleRequest(request),
      /Code analysis failed/
    );
  });
});
```

**集成测试**

```typescript
// test/suite/extension.test.ts
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Extension Integration', () => {
  test('should activate extension successfully', async () => {
    const extension = vscode.extensions.getExtension('jieky.ai-agent-vscode');
    assert.ok(extension, 'Extension should be found');
    
    await extension.activate();
    assert.ok(extension.isActive, 'Extension should be active');
  });
  
  test('should register all chat participants', async () => {
    const participants = vscode.chat.participants;
    const participantIds = participants.map(p => p.id);
    
    assert.ok(participantIds.includes('code'), 'Should register @code participant');
    assert.ok(participantIds.includes('report'), 'Should register @report participant');
    assert.ok(participantIds.includes('token'), 'Should register @token participant');
  });
});
```

### 📚 文档贡献

#### 文档类型

1. **API 文档**：代码注释和接口说明
2. **用户指南**：功能使用说明
3. **开发文档**：开发环境和流程
4. **示例代码**：使用示例和最佳实践

#### 文档规范

**Markdown 格式**

```markdown
# 一级标题

> 引用说明或重要提示

## 二级标题

### 三级标题

**粗体文本**用于强调重要信息。

*斜体文本*用于术语或概念。

`代码片段`用于内联代码。

```typescript
// 代码块示例
const example = 'Hello World';
```

#### 列表项
- 使用短横线
- 保持一致的格式
- 适当的缩进

#### 编号列表
1. 第一步
2. 第二步
3. 第三步

#### 表格
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 | 值2 | 值3 |

#### 链接
[链接文本](URL)
[内部链接](#锚点)
```

**代码示例规范**

```typescript
// ✅ 好的示例：完整、可运行、有注释
/**
 * 使用 @code 参与者分析代码质量
 */
import * as vscode from 'vscode';

// 获取当前活动编辑器
const editor = vscode.window.activeTextEditor;
if (!editor) {
  vscode.window.showErrorMessage('No active editor found');
  return;
}

// 获取选中的代码或整个文档
const selection = editor.selection;
const code = editor.document.getText(selection.isEmpty ? undefined : selection);

// 使用 Chat API 调用 @code 参与者
const response = await vscode.chat.sendRequest(
  'code',
  `分析以下代码的质量：\n\n${code}`,
  { file: editor.document.fileName }
);

console.log('分析结果:', response.content);
```

## Pull Request 流程

### 提交前检查

- [ ] 代码通过所有测试
- [ ] 代码符合项目规范
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 提交信息符合规范
- [ ] 没有合并冲突

### PR 模板

```markdown
## 变更描述
简洁描述本次 PR 的主要变更。

## 变更类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档更新
- [ ] 性能优化
- [ ] 其他

## 相关 Issue
关闭 #123

## 测试
描述如何测试这些变更：
1. 步骤一
2. 步骤二
3. 验证结果

## 截图
如果适用，添加截图说明变更效果。

## 检查清单
- [ ] 代码通过所有测试
- [ ] 代码符合项目规范
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 自测通过
```

### 代码审查

#### 审查者指南

1. **功能正确性**
   - 代码是否解决了预期问题
   - 边界条件是否处理正确
   - 错误处理是否完善

2. **代码质量**
   - 代码是否清晰易读
   - 是否遵循项目规范
   - 是否有重复代码

3. **性能考虑**
   - 是否有性能问题
   - 内存使用是否合理
   - 是否需要优化

4. **测试覆盖**
   - 测试是否充分
   - 测试用例是否合理
   - 是否覆盖边界情况

#### 贡献者响应

1. **及时响应**：在 48 小时内回复审查意见
2. **积极沟通**：对不明确的意见主动询问
3. **虚心接受**：认真考虑审查建议
4. **持续改进**：根据反馈完善代码

## 社区规范

### 行为准则

我们致力于为所有人提供友好、安全和欢迎的环境。请遵循以下准则：

1. **尊重他人**：尊重不同的观点和经验
2. **建设性沟通**：提供有建设性的反馈
3. **包容性**：欢迎不同背景的贡献者
4. **专业性**：保持专业和礼貌的交流

### 沟通渠道

- **GitHub Issues**：Bug 报告和功能建议
- **GitHub Discussions**：一般讨论和问答
- **Pull Requests**：代码审查和技术讨论
- **Email**：私人或敏感问题

### 获得帮助

如果您在贡献过程中遇到问题：

1. **查看文档**：首先查看相关文档
2. **搜索 Issues**：查看是否有类似问题
3. **提问**：在 GitHub Discussions 中提问
4. **联系维护者**：通过 Email 联系项目维护者

## 认可贡献者

### 贡献者名单

我们会在以下地方认可贡献者：

- README.md 中的贡献者列表
- CHANGELOG.md 中的版本更新说明
- GitHub Releases 中的感谢名单
- 项目网站的贡献者页面

### 贡献统计

我们使用以下方式统计贡献：

- **代码贡献**：提交的代码行数和质量
- **文档贡献**：文档改进和新增内容
- **社区贡献**：帮助其他用户和参与讨论
- **测试贡献**：编写测试和发现 Bug

## 发布流程

### 版本规划

我们遵循 [语义化版本](https://semver.org/) 规范：

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

### 发布周期

- **主版本**：根据重大功能发布
- **次版本**：每月发布一次
- **修订版本**：根据 Bug 修复需要发布

### 参与发布

贡献者可以通过以下方式参与发布：

1. **测试预发布版本**：帮助测试 beta 版本
2. **编写发布说明**：协助编写 CHANGELOG
3. **文档更新**：更新版本相关文档
4. **社区推广**：帮助推广新版本

---

## 感谢

感谢所有为 AI Agent Hub 项目做出贡献的开发者、设计师、文档编写者和社区成员！您的贡献让这个项目变得更好。

**让我们一起构建更智能的编程助手！** 🚀

---

*本贡献指南会根据项目发展持续更新，欢迎提出改进建议。*