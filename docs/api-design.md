# AI Agent Hub API 设计文档

## 🔌 API 架构概览

### 内部API架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Extension     │    │  Chat Participant│    │  Workflow API   │
│   Commands API  │◄──►│      API        │◄──►│                 │
│                 │    │                 │    │  - Execute      │
│  - Trigger      │    │  - @ai-coding   │    │  - Validate     │
│  - Configure    │    │  - @ai-refactor │    │  - Monitor      │
│  - Monitor      │    │  - @ai-requirements│  │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
           │                       │                       │
           ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Context API   │    │   AI Service    │    │   Storage API   │
│                 │    │      API        │    │                 │
│  - Collect      │    │  - Chat         │    │  - Config       │
│  - Analyze      │    │  - Stream       │    │  - History      │
│  - Cache        │    │  - Models       │    │  - Cache        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 核心API接口

### 1. Chat Participant API

#### 1.1 基础接口
```typescript
/**
 * Chat参与者基础接口
 */
interface IChatParticipant {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  
  /**
   * 处理用户请求
   * @param request 用户请求
   * @param context 对话上下文
   * @param token 取消令牌
   */
  handleRequest(
    request: ChatRequest,
    context: ChatContext,
    token: CancellationToken
  ): Promise<ChatResponse>;
  
  /**
   * 获取参与者能力
   */
  getCapabilities(): ParticipantCapabilities;
}
```

#### 1.2 请求响应接口
```typescript
/**
 * Chat请求接口
 */
interface ChatRequest {
  /** 请求ID */
  id: string;
  /** 用户输入 */
  prompt: string;
  /** 请求类型 */
  type: RequestType;
  /** 附加参数 */
  parameters?: Record<string, any>;
  /** 上下文信息 */
  context?: RequestContext;
}

/**
 * Chat响应接口
 */
interface ChatResponse {
  /** 响应ID */
  id: string;
  /** 响应内容 */
  content: string;
  /** 响应类型 */
  type: ResponseType;
  /** 可执行操作 */
  actions?: ChatAction[];
  /** 元数据 */
  metadata?: ResponseMetadata;
}

/**
 * 请求类型枚举
 */
enum RequestType {
  CODING = 'coding',
  REFACTOR = 'refactor',
  REQUIREMENTS = 'requirements',
  GENERAL = 'general'
}

/**
 * 响应类型枚举
 */
enum ResponseType {
  TEXT = 'text',
  CODE = 'code',
  MARKDOWN = 'markdown',
  STRUCTURED = 'structured'
}
```

#### 1.3 操作接口
```typescript
/**
 * Chat操作接口
 */
interface ChatAction {
  /** 操作ID */
  id: string;
  /** 操作标题 */
  title: string;
  /** 操作描述 */
  description?: string;
  /** 操作类型 */
  type: ActionType;
  /** 操作参数 */
  parameters: ActionParameters;
  /** 操作图标 */
  icon?: string;
}

/**
 * 操作类型枚举
 */
enum ActionType {
  INSERT_CODE = 'insert_code',
  CREATE_FILE = 'create_file',
  MODIFY_FILE = 'modify_file',
  OPEN_FILE = 'open_file',
  RUN_COMMAND = 'run_command',
  SHOW_DIFF = 'show_diff'
}

/**
 * 操作参数接口
 */
interface ActionParameters {
  /** 目标文件路径 */
  filePath?: string;
  /** 代码内容 */
  code?: string;
  /** 插入位置 */
  position?: Position;
  /** 命令 */
  command?: string;
  /** 其他参数 */
  [key: string]: any;
}
```

### 2. Workflow API

#### 2.1 工作流执行接口
```typescript
/**
 * 工作流执行器接口
 */
interface IWorkflowExecutor {
  /**
   * 执行工作流
   * @param workflowId 工作流ID
   * @param input 输入参数
   * @param context 执行上下文
   */
  execute(
    workflowId: string,
    input: WorkflowInput,
    context: ExecutionContext
  ): Promise<WorkflowResult>;
  
  /**
   * 验证工作流
   * @param workflow 工作流定义
   */
  validate(workflow: WorkflowDefinition): ValidationResult;
  
  /**
   * 获取工作流状态
   * @param executionId 执行ID
   */
  getStatus(executionId: string): Promise<ExecutionStatus>;
  
  /**
   * 取消工作流执行
   * @param executionId 执行ID
   */
  cancel(executionId: string): Promise<void>;
}
```

#### 2.2 工作流定义接口
```typescript
/**
 * 工作流定义接口
 */
interface WorkflowDefinition {
  /** 工作流ID */
  id: string;
  /** 工作流名称 */
  name: string;
  /** 工作流版本 */
  version: string;
  /** 工作流描述 */
  description?: string;
  /** 触发器 */
  triggers: WorkflowTrigger[];
  /** 步骤 */
  steps: WorkflowStep[];
  /** 输出配置 */
  output: WorkflowOutput;
  /** 配置选项 */
  config?: WorkflowConfig;
}

/**
 * 工作流触发器接口
 */
interface WorkflowTrigger {
  /** 触发器类型 */
  type: TriggerType;
  /** 触发条件 */
  condition: TriggerCondition;
  /** 触发器配置 */
  config?: TriggerConfig;
}

/**
 * 触发器类型枚举
 */
enum TriggerType {
  FILE_SAVE = 'file_save',
  CODE_SELECTION = 'code_selection',
  CHAT_COMMAND = 'chat_command',
  MANUAL = 'manual',
  SCHEDULED = 'scheduled'
}
```

#### 2.3 步骤执行接口
```typescript
/**
 * 工作流步骤接口
 */
interface WorkflowStep {
  /** 步骤ID */
  id: string;
  /** 步骤名称 */
  name: string;
  /** 步骤类型 */
  type: StepType;
  /** 步骤配置 */
  config: StepConfig;
  /** 执行条件 */
  condition?: string;
  /** 超时时间 */
  timeout?: number;
  /** 重试配置 */
  retry?: RetryConfig;
}

/**
 * 步骤类型枚举
 */
enum StepType {
  CONTEXT_COLLECTION = 'context_collection',
  AI_ANALYSIS = 'ai_analysis',
  CODE_GENERATION = 'code_generation',
  FILE_OPERATION = 'file_operation',
  USER_INTERACTION = 'user_interaction',
  VALIDATION = 'validation'
}

/**
 * 步骤执行结果接口
 */
interface StepResult {
  /** 步骤ID */
  stepId: string;
  /** 执行状态 */
  status: ExecutionStatus;
  /** 输出数据 */
  output?: any;
  /** 错误信息 */
  error?: Error;
  /** 执行时间 */
  duration: number;
  /** 元数据 */
  metadata?: Record<string, any>;
}
```

### 3. Context API

#### 3.1 上下文收集接口
```typescript
/**
 * 上下文收集器接口
 */
interface IContextCollector {
  /**
   * 收集项目上下文
   * @param options 收集选项
   */
  collectProjectContext(options: CollectionOptions): Promise<ProjectContext>;
  
  /**
   * 收集文件上下文
   * @param filePath 文件路径
   * @param options 收集选项
   */
  collectFileContext(filePath: string, options: CollectionOptions): Promise<FileContext>;
  
  /**
   * 收集代码上下文
   * @param selection 代码选择
   * @param options 收集选项
   */
  collectCodeContext(selection: CodeSelection, options: CollectionOptions): Promise<CodeContext>;
}
```

#### 3.2 上下文数据接口
```typescript
/**
 * 项目上下文接口
 */
interface ProjectContext {
  /** 项目根路径 */
  rootPath: string;
  /** 项目名称 */
  name: string;
  /** 技术栈信息 */
  techStack: TechStack;
  /** 文件结构 */
  structure: FileStructure;
  /** 依赖信息 */
  dependencies: Dependency[];
  /** Git信息 */
  git?: GitInfo;
  /** 配置文件 */
  configs: ConfigFile[];
}

/**
 * 文件上下文接口
 */
interface FileContext {
  /** 文件路径 */
  path: string;
  /** 文件内容 */
  content: string;
  /** 编程语言 */
  language: string;
  /** AST信息 */
  ast?: AST;
  /** 导入依赖 */
  imports: Import[];
  /** 导出内容 */
  exports: Export[];
  /** 函数定义 */
  functions: FunctionDefinition[];
  /** 类定义 */
  classes: ClassDefinition[];
}

/**
 * 代码上下文接口
 */
interface CodeContext {
  /** 选中的代码 */
  selectedCode: string;
  /** 代码位置 */
  range: Range;
  /** 所在函数 */
  containingFunction?: FunctionDefinition;
  /** 所在类 */
  containingClass?: ClassDefinition;
  /** 相关变量 */
  variables: Variable[];
  /** 调用关系 */
  callGraph: CallGraph;
}
```

### 4. AI Service API

#### 4.1 AI服务接口
```typescript
/**
 * AI服务接口
 */
interface IAIService {
  /**
   * 发送聊天请求
   * @param messages 消息列表
   * @param options 请求选项
   */
  chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse>;
  
  /**
   * 发送流式聊天请求
   * @param messages 消息列表
   * @param options 请求选项
   */
  streamChat(messages: ChatMessage[], options: ChatOptions): AsyncIterable<ChatChunk>;
  
  /**
   * 获取可用模型列表
   */
  getModels(): Promise<AIModel[]>;
  
  /**
   * 设置当前模型
   * @param modelId 模型ID
   */
  setModel(modelId: string): Promise<void>;
}
```

#### 4.2 消息接口
```typescript
/**
 * 聊天消息接口
 */
interface ChatMessage {
  /** 消息ID */
  id: string;
  /** 角色 */
  role: MessageRole;
  /** 消息内容 */
  content: string;
  /** 时间戳 */
  timestamp: Date;
  /** 元数据 */
  metadata?: MessageMetadata;
}

/**
 * 消息角色枚举
 */
enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

/**
 * 聊天选项接口
 */
interface ChatOptions {
  /** 温度参数 */
  temperature?: number;
  /** 最大token数 */
  maxTokens?: number;
  /** 停止序列 */
  stopSequences?: string[];
  /** 是否流式响应 */
  stream?: boolean;
  /** 模型ID */
  modelId?: string;
}
```

### 5. Storage API

#### 5.1 配置存储接口
```typescript
/**
 * 配置存储接口
 */
interface IConfigStorage {
  /**
   * 获取配置值
   * @param key 配置键
   * @param defaultValue 默认值
   */
  get<T>(key: string, defaultValue?: T): Promise<T>;
  
  /**
   * 设置配置值
   * @param key 配置键
   * @param value 配置值
   */
  set<T>(key: string, value: T): Promise<void>;
  
  /**
   * 删除配置
   * @param key 配置键
   */
  delete(key: string): Promise<void>;
  
  /**
   * 获取所有配置
   */
  getAll(): Promise<Record<string, any>>;
}
```

#### 5.2 历史记录接口
```typescript
/**
 * 历史记录存储接口
 */
interface IHistoryStorage {
  /**
   * 保存历史记录
   * @param record 历史记录
   */
  save(record: HistoryRecord): Promise<void>;
  
  /**
   * 获取历史记录
   * @param filter 过滤条件
   * @param limit 限制数量
   */
  get(filter: HistoryFilter, limit?: number): Promise<HistoryRecord[]>;
  
  /**
   * 删除历史记录
   * @param id 记录ID
   */
  delete(id: string): Promise<void>;
  
  /**
   * 清空历史记录
   */
  clear(): Promise<void>;
}

/**
 * 历史记录接口
 */
interface HistoryRecord {
  /** 记录ID */
  id: string;
  /** 记录类型 */
  type: RecordType;
  /** 时间戳 */
  timestamp: Date;
  /** 记录数据 */
  data: any;
  /** 用户ID */
  userId?: string;
  /** 会话ID */
  sessionId?: string;
}
```

## 🔧 API 使用示例

### 1. Chat Participant 使用示例
```typescript
// 注册Chat参与者
const codingParticipant = new CodingParticipant();
vscode.chat.createChatParticipant('ai-coding', codingParticipant);

// 处理用户请求
class CodingParticipant implements IChatParticipant {
  async handleRequest(
    request: ChatRequest,
    context: ChatContext,
    token: CancellationToken
  ): Promise<ChatResponse> {
    // 收集上下文
    const projectContext = await this.contextCollector.collectProjectContext({
      includeGit: true,
      maxFiles: 10
    });
    
    // 调用AI服务
    const aiResponse = await this.aiService.chat([
      { role: 'system', content: 'You are a coding assistant.' },
      { role: 'user', content: request.prompt }
    ], {
      temperature: 0.3,
      maxTokens: 2000
    });
    
    // 返回响应
    return {
      id: generateId(),
      content: aiResponse.content,
      type: ResponseType.MARKDOWN,
      actions: [
        {
          id: 'insert-code',
          title: 'Insert Code',
          type: ActionType.INSERT_CODE,
          parameters: { code: extractCode(aiResponse.content) }
        }
      ]
    };
  }
}
```

### 2. Workflow 执行示例
```typescript
// 执行工作流
const workflowExecutor = new WorkflowExecutor();

const result = await workflowExecutor.execute('coding-assistant', {
  filePath: '/path/to/file.ts',
  userPrompt: 'Add error handling to this function'
}, {
  userId: 'user123',
  sessionId: 'session456'
});

console.log('Workflow result:', result);
```

### 3. 上下文收集示例
```typescript
// 收集项目上下文
const contextCollector = new ContextCollector();

const projectContext = await contextCollector.collectProjectContext({
  includeGit: true,
  includeDependencies: true,
  maxDepth: 3,
  excludePatterns: ['node_modules', '.git']
});

console.log('Project context:', projectContext);
```

## 🔒 API 安全规范

### 1. 权限控制
```typescript
/**
 * 权限检查接口
 */
interface IPermissionChecker {
  /**
   * 检查文件访问权限
   * @param filePath 文件路径
   * @param operation 操作类型
   */
  checkFilePermission(filePath: string, operation: FileOperation): boolean;
  
  /**
   * 检查网络访问权限
   * @param url 网络地址
   */
  checkNetworkPermission(url: string): boolean;
  
  /**
   * 检查命令执行权限
   * @param command 命令
   */
  checkCommandPermission(command: string): boolean;
}
```

### 2. 数据验证
```typescript
/**
 * 输入验证器接口
 */
interface IInputValidator {
  /**
   * 验证用户输入
   * @param input 用户输入
   * @param schema 验证模式
   */
  validate(input: any, schema: ValidationSchema): ValidationResult;
  
  /**
   * 清理用户输入
   * @param input 用户输入
   */
  sanitize(input: string): string;
}
```

### 3. 错误处理
```typescript
/**
 * API错误类
 */
class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * 错误代码枚举
 */
enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT'
}
```

## 📊 API 监控

### 1. 性能监控
```typescript
/**
 * 性能监控接口
 */
interface IPerformanceMonitor {
  /**
   * 记录API调用
   * @param apiName API名称
   * @param duration 执行时间
   * @param success 是否成功
   */
  recordAPICall(apiName: string, duration: number, success: boolean): void;
  
  /**
   * 获取性能指标
   * @param timeRange 时间范围
   */
  getMetrics(timeRange: TimeRange): Promise<PerformanceMetrics>;
}
```

### 2. 日志记录
```typescript
/**
 * API日志记录器
 */
interface IAPILogger {
  /**
   * 记录API请求
   * @param request 请求信息
   */
  logRequest(request: APIRequest): void;
  
  /**
   * 记录API响应
   * @param response 响应信息
   */
  logResponse(response: APIResponse): void;
  
  /**
   * 记录API错误
   * @param error 错误信息
   */
  logError(error: APIError): void;
}
```