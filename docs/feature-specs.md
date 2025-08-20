# AI Agent Hub 功能规格书

## 🏗️ 系统架构规格

### 整体架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   VS Code UI    │    │  Chat Participant│    │  Workflow Engine│
│                 │◄──►│                 │◄──►│                 │
│  - Chat Panel   │    │  - @ai-coding   │    │  - YAML Parser  │
│  - Context Menu │    │  - @ai-refactor │    │  - Step Executor│
│  - Status Bar   │    │  - @ai-requirements│  │  - Context Mgr  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
           │                       │                       │
           ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  File System    │    │   AI Service    │    │   Data Store    │
│                 │    │                 │    │                 │
│  - File Watcher │    │  - VS Code LM   │    │  - Config       │
│  - Git Info     │    │  - Streaming    │    │  - History      │
│  - Project Scan │    │  - Model Switch │    │  - Cache        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 核心模块规格

### 1. Chat Participant 模块

#### 1.1 @ai-coding 参与者
**功能**: 编程辅助和代码生成

**输入接口**:
```typescript
interface CodingRequest {
  prompt: string;           // 用户输入的编程需求
  context: ProjectContext;  // 项目上下文信息
  files: FileInfo[];       // 相关文件信息
  selection?: CodeSelection; // 选中的代码片段
}
```

**输出接口**:
```typescript
interface CodingResponse {
  suggestions: CodeSuggestion[]; // 代码建议列表
  explanation: string;           // 解释说明
  actions: Action[];            // 可执行的操作
  confidence: number;           // 置信度 (0-1)
}
```

**处理流程**:
1. 解析用户输入意图
2. 收集相关上下文信息
3. 调用AI模型生成建议
4. 格式化输出结果
5. 提供可执行操作

#### 1.2 @ai-refactor 参与者
**功能**: 代码重构和优化

**输入接口**:
```typescript
interface RefactorRequest {
  code: string;            // 待重构的代码
  language: string;        // 编程语言
  refactorType: RefactorType; // 重构类型
  context: FileContext;    // 文件上下文
}

enum RefactorType {
  EXTRACT_METHOD = 'extract_method',
  RENAME_VARIABLE = 'rename_variable',
  OPTIMIZE_PERFORMANCE = 'optimize_performance',
  IMPROVE_READABILITY = 'improve_readability'
}
```

**输出接口**:
```typescript
interface RefactorResponse {
  refactoredCode: string;   // 重构后的代码
  changes: Change[];        // 变更详情
  reasoning: string;        // 重构理由
  impact: ImpactAnalysis;   // 影响分析
}
```

#### 1.3 @ai-requirements 参与者
**功能**: 需求分析和技术方案设计

**输入接口**:
```typescript
interface RequirementsRequest {
  description: string;      // 需求描述
  constraints: Constraint[]; // 约束条件
  existingCode: ProjectInfo; // 现有代码信息
}
```

**输出接口**:
```typescript
interface RequirementsResponse {
  analysis: RequirementAnalysis; // 需求分析
  solution: TechnicalSolution;   // 技术方案
  implementation: ImplementationPlan; // 实现计划
  risks: Risk[];                 // 风险评估
}
```

### 2. 工作流引擎模块

#### 2.1 YAML 工作流解析器
**功能**: 解析和验证YAML工作流配置

**YAML 结构规范**:
```yaml
name: "编程辅助工作流"
version: "1.0.0"
description: "自动化编程辅助流程"

triggers:
  - type: "file_save"
    patterns: ["**/*.ts", "**/*.js"]
  - type: "selection"
    languages: ["typescript", "javascript"]

steps:
  - name: "收集上下文"
    type: "context_collection"
    config:
      include_git: true
      include_dependencies: true
      max_files: 10
  
  - name: "AI分析"
    type: "ai_analysis"
    config:
      model: "gpt-4"
      temperature: 0.3
      max_tokens: 2000
  
  - name: "生成建议"
    type: "suggestion_generation"
    config:
      format: "markdown"
      include_code: true

output:
  format: "chat_response"
  actions: ["insert_code", "create_file"]
```

#### 2.2 步骤执行器
**功能**: 执行工作流中的各个步骤

**步骤类型定义**:
```typescript
interface WorkflowStep {
  name: string;
  type: StepType;
  config: StepConfig;
  condition?: string;
  timeout?: number;
}

enum StepType {
  CONTEXT_COLLECTION = 'context_collection',
  AI_ANALYSIS = 'ai_analysis',
  CODE_GENERATION = 'code_generation',
  FILE_OPERATION = 'file_operation',
  USER_INTERACTION = 'user_interaction'
}
```

**执行接口**:
```typescript
interface StepExecutor {
  execute(step: WorkflowStep, context: ExecutionContext): Promise<StepResult>;
  validate(step: WorkflowStep): ValidationResult;
  getRequiredPermissions(step: WorkflowStep): Permission[];
}
```

### 3. 上下文收集模块

#### 3.1 项目扫描器
**功能**: 扫描和分析项目结构

**扫描配置**:
```typescript
interface ScanConfig {
  maxDepth: number;         // 最大扫描深度
  excludePatterns: string[]; // 排除模式
  includeHidden: boolean;   // 是否包含隐藏文件
  maxFileSize: number;      // 最大文件大小
}
```

**扫描结果**:
```typescript
interface ProjectStructure {
  root: string;             // 项目根目录
  files: FileNode[];        // 文件树
  dependencies: Dependency[]; // 依赖关系
  techStack: TechStack;     // 技术栈信息
  metrics: ProjectMetrics;  // 项目指标
}
```

#### 3.2 Git 信息收集器
**功能**: 收集Git历史和变更信息

**收集接口**:
```typescript
interface GitCollector {
  getRecentCommits(count: number): Promise<Commit[]>;
  getCurrentBranch(): Promise<string>;
  getFileChanges(filePath: string): Promise<FileChange[]>;
  getBlameInfo(filePath: string, line: number): Promise<BlameInfo>;
}
```

#### 3.3 代码分析器
**功能**: 分析代码语义和结构

**分析能力**:
- AST解析和遍历
- 函数调用关系分析
- 变量作用域分析
- 依赖关系提取
- 代码复杂度计算

**分析接口**:
```typescript
interface CodeAnalyzer {
  parseAST(code: string, language: string): Promise<AST>;
  extractFunctions(ast: AST): Function[];
  analyzeComplexity(ast: AST): ComplexityMetrics;
  findDependencies(ast: AST): Dependency[];
}
```

### 4. AI 服务模块

#### 4.1 VS Code 语言模型集成
**功能**: 集成VS Code内置的语言模型API

**模型接口**:
```typescript
interface VSCodeLMService {
  listModels(): Promise<LanguageModel[]>;
  selectModel(modelId: string): Promise<void>;
  sendRequest(request: ChatRequest): Promise<ChatResponse>;
  streamRequest(request: ChatRequest): AsyncIterable<ChatChunk>;
}
```

**请求格式**:
```typescript
interface ChatRequest {
  messages: ChatMessage[];  // 对话消息
  options: RequestOptions;  // 请求选项
  context: RequestContext;  // 请求上下文
}

interface RequestOptions {
  temperature?: number;     // 温度参数
  maxTokens?: number;      // 最大token数
  stopSequences?: string[]; // 停止序列
  stream?: boolean;        // 是否流式响应
}
```

#### 4.2 流式响应处理
**功能**: 处理AI模型的流式响应

**流式接口**:
```typescript
interface StreamHandler {
  onChunk(chunk: ChatChunk): void;
  onComplete(response: ChatResponse): void;
  onError(error: Error): void;
  onCancel(): void;
}

interface ChatChunk {
  id: string;
  content: string;
  delta: string;
  finished: boolean;
}
```

### 5. 用户界面模块

#### 5.1 Chat 面板
**功能**: 显示AI对话和交互

**组件结构**:
```typescript
interface ChatPanel {
  messages: ChatMessage[];     // 消息列表
  participants: Participant[]; // 参与者列表
  inputBox: InputBox;         // 输入框
  actionButtons: ActionButton[]; // 操作按钮
}

interface ChatMessage {
  id: string;
  sender: string;             // 发送者
  content: string;            // 消息内容
  timestamp: Date;            // 时间戳
  type: MessageType;          // 消息类型
  actions?: MessageAction[];  // 可执行操作
}
```

#### 5.2 状态栏集成
**功能**: 显示AI Agent状态信息

**状态项**:
```typescript
interface StatusBarItem {
  text: string;               // 显示文本
  tooltip: string;            // 提示信息
  command?: string;           // 点击命令
  color?: string;             // 颜色
  priority: number;           // 优先级
}

enum AgentStatus {
  IDLE = 'idle',
  WORKING = 'working',
  ERROR = 'error',
  DISABLED = 'disabled'
}
```

## 🔧 技术规格

### 开发环境要求
- **Node.js**: >= 18.x
- **TypeScript**: >= 5.0
- **VS Code**: >= 1.80.0
- **VS Code API**: >= 1.80.0

### 依赖库规格
```json
{
  "dependencies": {
    "vscode": "^1.80.0",
    "yaml": "^2.3.2",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.80.0",
    "@types/node": "^18.0.0",
    "eslint": "^8.0.0",
    "jest": "^29.0.0"
  }
}
```

### 性能规格
- **启动时间**: < 3秒
- **响应延迟**: < 5秒 (首次响应)
- **内存占用**: < 200MB (包含缓存)
- **CPU使用**: < 10% (空闲时), < 50% (AI推理时)
- **网络适应**: 支持低带宽环境 (< 1Mbps)
- **离线能力**: 基础功能离线可用

### 兼容性规格
- **操作系统**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)
- **VS Code版本**: 1.80.0+
- **Node.js版本**: 18.x+

## 🧪 测试规格

### 单元测试
- **覆盖率要求**: > 80%
- **测试框架**: Jest
- **测试类型**: 功能测试、边界测试、错误测试

### 集成测试
- **VS Code扩展测试**: 使用VS Code测试框架
- **AI服务测试**: Mock AI响应进行测试
- **工作流测试**: 端到端工作流执行测试

### 性能测试
- **负载测试**: 模拟大量并发请求
- **压力测试**: 测试系统极限性能
- **内存泄漏测试**: 长时间运行内存监控

## 📊 监控规格

### 日志记录
```typescript
interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  context?: any;
  error?: Error;
}

enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}
```

### 性能指标
- **响应时间分布**: P50, P90, P95, P99
- **错误率**: 按功能模块统计
- **资源使用**: CPU、内存、磁盘IO
- **用户行为**: 功能使用频率、用户满意度

### 错误处理
```typescript
interface ErrorHandler {
  handleError(error: Error, context: ErrorContext): void;
  reportError(error: Error): void;
  recoverFromError(error: Error): boolean;
}

interface ErrorContext {
  operation: string;
  user: string;
  timestamp: Date;
  stackTrace: string;
}
```

## 🔧 MCP工具系统规格 (新增)

### 1. 工具基础架构

#### 1.1 BaseTool 抽象类
**功能**: 所有MCP工具的基类，提供统一的接口和安全验证

**接口定义**:
```typescript
abstract class BaseTool {
  protected workspaceRoot: string;
  protected toolName: string;
  protected description: string;

  abstract getSchema(): any;
  abstract execute(params: ToolParams, context?: ToolContext): Promise<ToolResult>;
  
  protected validateParams(params: ToolParams): boolean;
  protected validateFilePath(filePath: string): boolean;
  protected validateCommand(command: string): boolean;
  protected logExecution(params: ToolParams, result: ToolResult, context: ToolContext): void;
}
```

#### 1.2 工具结果接口
```typescript
interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    timestamp: string;
    execution_time_ms?: number;
    [key: string]: any;
  };
}

interface ToolParams {
  [key: string]: any;
}

interface ToolContext {
  user_id?: string;
  session_id?: string;
  workspace_root: string;
  timestamp: string;
}
```

### 2. 核心工具实现

#### 2.1 文件操作工具

**WriteFileTool**:
- 支持安全的文件写入
- 自动创建父目录
- 路径安全验证
- 编码格式支持

**ReadFileTool**:
- 支持大文件读取限制
- 文件大小检查
- 编码格式检测
- 二进制文件过滤

**SearchFilesTool**:
- 正则表达式搜索
- 文件名和内容搜索
- 文件类型过滤
- 结果数量限制

#### 2.2 命令执行工具

**RunShellTool**:
- 命令白名单验证
- 危险命令黑名单
- 执行超时控制
- 跨平台支持

**GitTool**:
- Git操作安全模式
- 常用命令支持
- 分支保护机制
- 操作日志记录

### 3. 工具管理器

#### 3.1 ToolManager 类
**功能**: 统一管理所有工具的注册、执行和监控

```typescript
class ToolManager {
  private tools: Map<string, BaseTool>;
  private config: ToolConfig;
  private stats: ToolStats;
  
  registerTool(tool: BaseTool): void;
  getTool(name: string): BaseTool | undefined;
  getAvailableTools(): string[];
  executeTool(name: string, params: ToolParams, context?: ToolContext): Promise<ToolResult>;
  updateStats(toolName: string, result: ToolResult, executionTime: number): void;
  getStats(): ToolStats;
}
```

#### 3.2 配置管理
```typescript
interface ToolConfig {
  enabled_tools: string[];
  disabled_tools: string[];
  security: {
    workspace_restriction: boolean;
    command_whitelist: string[];
    max_file_size_mb: number;
    max_execution_time_ms: number;
  };
  rate_limiting: {
    max_requests_per_minute: number;
    max_concurrent_executions: number;
  };
}
```

### 4. 安全验证规格

#### 4.1 路径安全验证
- 防止路径遍历攻击 (../, ../../)
- 工作区边界检查
- 绝对路径限制
- 特殊字符过滤

#### 4.2 命令安全验证
- 危险命令黑名单 (rm, del, format, shutdown等)
- 命令白名单机制
- 重定向和管道限制
- 权限提升防护

#### 4.3 数据安全处理
- 敏感信息过滤
- 日志数据清理
- 错误信息脱敏
- 执行结果限制

### 5. MCP服务器规格

#### 5.1 HTTP API接口
```typescript
// 工具执行接口
POST /execute
{
  "tool": "write_file",
  "params": {
    "file_path": "src/test.ts",
    "content": "console.log('Hello World');"
  }
}

// 工具列表接口
GET /tools

// 服务器状态接口
GET /status

// 版本信息接口
GET /version
```

#### 5.2 CLI命令支持
```bash
# 启动服务器
npx ai-mcp start --port 3000

# 检查状态
npx ai-mcp status

# 显示版本
npx ai-mcp version

# 执行工具
npx ai-mcp exec write_file --file="test.txt" --content="Hello"
```

### 6. 配置和工具函数

#### 6.1 配置管理器
```typescript
class ConfigManager {
  private config: McpConfig;
  
  loadConfig(): McpConfig;
  updateConfig(updates: Partial<McpConfig>): void;
  saveConfig(): void;
  resetToDefault(): void;
}
```

#### 6.2 实用工具函数
```typescript
class Utils {
  static validateFilePath(filePath: string, workspaceRoot: string): boolean;
  static validateCommand(command: string, whitelist: string[]): boolean;
  static formatFileSize(bytes: number): string;
  static formatExecutionTime(milliseconds: number): string;
  static sanitizeForLogging(data: any): any;
  static generateId(): string;
  static retry<T>(fn: () => Promise<T>, maxAttempts: number): Promise<T>;
}
```