# 开发指南

> AI Agent Hub 开发环境搭建和开发流程指南

**版本**: v0.0.23  
**更新日期**: 2025年8月23日

## 环境要求

### 必需软件
- **Node.js**: 16.0.0 或更高版本
- **npm**: 8.0.0 或更高版本
- **VS Code**: 1.74.0 或更高版本
- **Git**: 2.30.0 或更高版本

### 推荐工具
- **VS Code 扩展**:
  - TypeScript and JavaScript Language Features
  - ESLint
  - Prettier - Code formatter
  - GitHub Copilot
  - Extension Test Runner

### 系统要求
- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **内存**: 最少 4GB RAM，推荐 8GB+
- **存储**: 至少 2GB 可用空间

## 项目结构

```
ai-agent-hub/
├── packages/
│   ├── ai-agent/                    # VS Code 扩展主包
│   │   ├── src/
│   │   │   ├── extension.ts          # 扩展入口点
│   │   │   ├── participants/         # Chat 参与者实现
│   │   │   │   ├── CodeParticipant.ts
│   │   │   │   ├── ReportParticipant.ts
│   │   │   │   ├── TokenParticipant.ts
│   │   │   │   ├── ConfigParticipant.ts
│   │   │   │   └── RecommendParticipant.ts
│   │   │   ├── services/             # 核心服务
│   │   │   │   ├── ProjectAnalysisEngine.ts
│   │   │   │   ├── ReportGenerator.ts
│   │   │   │   ├── ConfigManager.ts
│   │   │   │   ├── TokenManager.ts
│   │   │   │   └── LanguageDetector.ts
│   │   │   ├── commands/             # 扩展命令
│   │   │   │   ├── CSharpAnalysisCommand.ts
│   │   │   │   ├── TokenProbeCommand.ts
│   │   │   │   └── SelfProjectScanCommand.ts
│   │   │   ├── utils/                # 工具函数
│   │   │   │   ├── fileUtils.ts
│   │   │   │   ├── configUtils.ts
│   │   │   │   └── loggerUtils.ts
│   │   │   └── types/                # 类型定义
│   │   │       ├── index.ts
│   │   │       ├── participants.ts
│   │   │       └── services.ts
│   │   ├── test/                     # 测试文件
│   │   │   ├── suite/
│   │   │   │   ├── extension.test.ts
│   │   │   │   ├── participants.test.ts
│   │   │   │   └── services.test.ts
│   │   │   └── runTest.ts
│   │   ├── package.json              # 扩展清单
│   │   ├── tsconfig.json             # TypeScript 配置
│   │   ├── webpack.config.js         # 构建配置
│   │   └── README.md
│   └── ai-mcp/                       # MCP 相关（已弃用）
├── docs/                             # 文档目录
│   ├── architecture.md
│   ├── chat-participants-guide.md
│   ├── development-guide.md
│   └── contributing.md
├── scripts/                          # 构建脚本
│   ├── build.js
│   ├── test.js
│   └── package.js
├── .github/                          # GitHub 配置
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── package.json                      # 根项目配置
├── tsconfig.json                     # 根 TypeScript 配置
├── .eslintrc.js                      # ESLint 配置
├── .prettierrc                       # Prettier 配置
├── .gitignore
└── README.md
```

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-org/ai-agent-hub.git
cd ai-agent-hub
```

### 2. 安装依赖

```bash
# 安装根项目依赖
npm install

# 安装扩展包依赖
cd packages/ai-agent
npm install
```

### 3. 开发模式

```bash
# 在根目录运行开发模式
npm run dev

# 或者在扩展目录运行
cd packages/ai-agent
npm run watch
```

### 4. 调试扩展

1. 在 VS Code 中打开项目
2. 按 `F5` 启动调试
3. 在新的 VS Code 窗口中测试扩展

## 开发流程

### 代码规范

#### TypeScript 规范

```typescript
// 使用接口定义类型
interface IParticipant {
  id: string;
  name: string;
  description: string;
  handleRequest(request: ChatRequest): Promise<ChatResponse>;
}

// 使用枚举定义常量
enum ParticipantType {
  CODE = 'code',
  REPORT = 'report',
  TOKEN = 'token',
  CONFIG = 'config',
  RECOMMEND = 'recommend'
}

// 使用泛型提高代码复用性
class ServiceManager<T> {
  private services: Map<string, T> = new Map();
  
  register(name: string, service: T): void {
    this.services.set(name, service);
  }
  
  get(name: string): T | undefined {
    return this.services.get(name);
  }
}
```

#### 命名规范

- **类名**: PascalCase (例: `ProjectAnalysisEngine`)
- **接口名**: 以 `I` 开头的 PascalCase (例: `IConfigManager`)
- **方法名**: camelCase (例: `analyzeProject`)
- **常量**: UPPER_SNAKE_CASE (例: `MAX_TOKEN_LIMIT`)
- **文件名**: kebab-case (例: `project-analysis-engine.ts`)

#### 注释规范

```typescript
/**
 * 项目分析引擎
 * 负责扫描和分析项目结构、代码质量等
 */
export class ProjectAnalysisEngine implements IProjectAnalysisEngine {
  /**
   * 扫描项目目录
   * @param rootPath 项目根目录路径
   * @param options 扫描选项
   * @returns 扫描结果
   */
  async scanProject(
    rootPath: string, 
    options: ScanOptions = {}
  ): Promise<ProjectScanResult> {
    // 实现逻辑
  }
}
```

### Git 工作流

#### 分支策略

- **main**: 主分支，包含稳定的生产代码
- **develop**: 开发分支，包含最新的开发代码
- **feature/***: 功能分支，用于开发新功能
- **bugfix/***: 修复分支，用于修复 bug
- **release/***: 发布分支，用于准备发布

#### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
# 功能开发
git commit -m "feat(participants): add @recommend participant"

# Bug 修复
git commit -m "fix(config): resolve configuration loading issue"

# 文档更新
git commit -m "docs(guide): update development guide"

# 代码重构
git commit -m "refactor(services): optimize project analysis engine"

# 性能优化
git commit -m "perf(analysis): improve file scanning performance"

# 测试相关
git commit -m "test(participants): add unit tests for chat participants"
```

#### 开发流程

1. **创建功能分支**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/new-participant
   ```

2. **开发和测试**
   ```bash
   # 编写代码
   npm run test
   npm run lint
   npm run build
   ```

3. **提交代码**
   ```bash
   git add .
   git commit -m "feat(participants): add new chat participant"
   git push origin feature/new-participant
   ```

4. **创建 Pull Request**
   - 在 GitHub 上创建 PR
   - 填写详细的描述
   - 请求代码审查

5. **合并代码**
   - 通过代码审查后合并到 develop
   - 删除功能分支

### 测试策略

#### 单元测试

```typescript
// test/suite/participants.test.ts
import * as assert from 'assert';
import { CodeParticipant } from '../../src/participants/CodeParticipant';

suite('CodeParticipant Tests', () => {
  let participant: CodeParticipant;
  
  setup(() => {
    participant = new CodeParticipant();
  });
  
  test('should analyze code quality', async () => {
    const request = {
      prompt: 'analyze this code',
      context: { file: 'test.ts', content: 'const x = 1;' }
    };
    
    const response = await participant.handleRequest(request);
    
    assert.ok(response);
    assert.ok(response.content.includes('analysis'));
  });
});
```

#### 集成测试

```typescript
// test/suite/extension.test.ts
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Extension Integration Tests', () => {
  test('should register all chat participants', async () => {
    const extension = vscode.extensions.getExtension('jieky.ai-agent-vscode');
    assert.ok(extension);
    
    await extension.activate();
    
    // 验证参与者是否注册成功
    const participants = vscode.chat.participants;
    assert.ok(participants.some(p => p.id === 'code'));
    assert.ok(participants.some(p => p.id === 'report'));
  });
});
```

#### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- --grep "CodeParticipant"

# 生成测试覆盖率报告
npm run test:coverage
```

### 构建和打包

#### 开发构建

```bash
# 监听模式构建
npm run watch

# 单次构建
npm run build
```

#### 生产构建

```bash
# 生产环境构建
npm run build:prod

# 打包扩展
npm run package
```

#### 发布准备

```bash
# 更新版本号
npm version patch  # 或 minor, major

# 生成 CHANGELOG
npm run changelog

# 创建发布包
npm run package:release
```

## 调试技巧

### VS Code 调试配置

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}/packages/ai-agent"],
      "outFiles": ["${workspaceFolder}/packages/ai-agent/out/**/*.js"],
      "preLaunchTask": "npm: watch"
    },
    {
      "name": "Extension Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}/packages/ai-agent",
        "--extensionTestsPath=${workspaceFolder}/packages/ai-agent/out/test/suite/index"
      ],
      "outFiles": ["${workspaceFolder}/packages/ai-agent/out/test/**/*.js"],
      "preLaunchTask": "npm: build"
    }
  ]
}
```

### 日志调试

```typescript
// 使用 VS Code 输出通道
const outputChannel = vscode.window.createOutputChannel('AI Agent Hub');

export class Logger {
  static debug(message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[${timestamp}] DEBUG: ${message}`);
    if (args.length > 0) {
      outputChannel.appendLine(JSON.stringify(args, null, 2));
    }
  }
  
  static error(message: string, error?: Error): void {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[${timestamp}] ERROR: ${message}`);
    if (error) {
      outputChannel.appendLine(error.stack || error.message);
    }
  }
}
```

### 性能分析

```typescript
// 性能监控装饰器
function measure(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    const start = performance.now();
    try {
      const result = await method.apply(this, args);
      const end = performance.now();
      Logger.debug(`${propertyName} took ${end - start} milliseconds`);
      return result;
    } catch (error) {
      const end = performance.now();
      Logger.error(`${propertyName} failed after ${end - start} milliseconds`, error);
      throw error;
    }
  };
}

// 使用示例
export class ProjectAnalysisEngine {
  @measure
  async scanProject(rootPath: string): Promise<ProjectScanResult> {
    // 实现逻辑
  }
}
```

## 常见问题

### 开发环境问题

**Q: 扩展无法加载**
A: 检查以下项目：
1. 确保 TypeScript 编译无错误
2. 检查 package.json 中的 activationEvents
3. 验证扩展清单格式是否正确

**Q: Chat 参与者无法注册**
A: 确保：
1. GitHub Copilot 扩展已安装并激活
2. 参与者 ID 唯一且符合规范
3. 正确实现 IChatParticipant 接口

**Q: 构建失败**
A: 常见解决方案：
1. 清除 node_modules 并重新安装
2. 检查 TypeScript 版本兼容性
3. 验证 webpack 配置是否正确

### 性能优化

**文件扫描优化**
```typescript
// 使用 Worker 线程处理大文件
import { Worker } from 'worker_threads';

export class FileScanner {
  async scanLargeProject(rootPath: string): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./file-scanner-worker.js', {
        workerData: { rootPath }
      });
      
      worker.on('message', resolve);
      worker.on('error', reject);
    });
  }
}
```

**内存管理**
```typescript
// 使用对象池减少 GC 压力
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  
  constructor(factory: () => T, initialSize: number = 10) {
    this.factory = factory;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }
  
  acquire(): T {
    return this.pool.pop() || this.factory();
  }
  
  release(obj: T): void {
    this.pool.push(obj);
  }
}
```

## 贡献指南

### 代码贡献

1. **Fork 项目**到你的 GitHub 账户
2. **创建功能分支**进行开发
3. **编写测试**确保代码质量
4. **提交 Pull Request**并描述变更
5. **参与代码审查**并根据反馈调整

### 文档贡献

- 改进现有文档的准确性和清晰度
- 添加使用示例和最佳实践
- 翻译文档到其他语言
- 创建视频教程和演示

### 问题报告

使用 GitHub Issues 报告问题时，请包含：
- 详细的问题描述
- 重现步骤
- 期望行为和实际行为
- 环境信息（VS Code 版本、操作系统等）
- 相关的日志和错误信息

---

**持续改进**: 本开发指南会随着项目发展不断更新，欢迎提出改进建议。