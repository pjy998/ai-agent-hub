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

#### 4.1 AI服务管理器接口
```typescript
/**
 * AI服务管理器接口
 */
interface IAIServiceManager {
  /**
   * 初始化AI服务
   * @param config AI服务配置
   */
  initialize(config: AIConfig): Promise<void>;
  
  /**
   * 添加AI服务提供商
   * @param provider 服务提供商
   */
  addProvider(provider: IAIProvider): Promise<void>;
  
  /**
   * 移除AI服务提供商
   * @param providerId 提供商ID
   */
  removeProvider(providerId: string): Promise<void>;
  
  /**
   * 生成AI响应
   * @param request AI请求
   */
  generateResponse(request: AIRequest): Promise<AIResponse>;
  
  /**
   * 获取服务统计信息
   */
  getStats(): Promise<AIServiceStats>;
  
  /**
   * 获取可用提供商列表
   */
  getProviders(): Promise<AIProviderInfo[]>;
}

/**
 * AI服务提供商接口
 */
interface IAIProvider {
  /** 提供商ID */
  readonly id: string;
  /** 提供商名称 */
  readonly name: string;
  /** 支持的模型列表 */
  readonly models: string[];
  
  /**
   * 初始化提供商
   * @param config 提供商配置
   */
  initialize(config: ProviderConfig): Promise<void>;
  
  /**
   * 生成响应
   * @param request AI请求
   */
  generateResponse(request: AIRequest): Promise<AIResponse>;
  
  /**
   * 检查健康状态
   */
  healthCheck(): Promise<boolean>;
}

/**
 * AI请求接口
 */
interface AIRequest {
  /** 请求ID */
  id: string;
  /** 提示内容 */
  prompt: string;
  /** 模型名称 */
  model?: string;
  /** 请求参数 */
  parameters?: AIParameters;
  /** 上下文信息 */
  context?: RequestContext;
}

/**
 * AI响应接口
 */
interface AIResponse {
  /** 响应ID */
  id: string;
  /** 响应内容 */
  content: string;
  /** 使用的模型 */
  model: string;
  /** 提供商ID */
  providerId: string;
  /** 响应元数据 */
  metadata: ResponseMetadata;
  /** 使用统计 */
  usage: TokenUsage;
}

/**
 * AI参数接口
 */
interface AIParameters {
  /** 温度参数 */
  temperature?: number;
  /** 最大token数 */
  maxTokens?: number;
  /** 停止序列 */
  stopSequences?: string[];
  /** 随机种子 */
  seed?: number;
}

/**
 * Token使用统计
 */
interface TokenUsage {
  /** 输入token数 */
  promptTokens: number;
  /** 输出token数 */
  completionTokens: number;
  /** 总token数 */
  totalTokens: number;
}

/**
 * AI服务统计信息
 */
interface AIServiceStats {
  /** 总请求数 */
  totalRequests: number;
  /** 成功请求数 */
  successfulRequests: number;
  /** 失败请求数 */
  failedRequests: number;
  /** 平均响应时间 */
  averageResponseTime: number;
  /** 总token使用量 */
  totalTokensUsed: number;
  /** 按提供商统计 */
  providerStats: Record<string, ProviderStats>;
}

/**
 * 提供商统计信息
 */
interface ProviderStats {
  /** 请求数 */
  requests: number;
  /** 成功率 */
  successRate: number;
  /** 平均响应时间 */
  averageResponseTime: number;
  /** Token使用量 */
  tokensUsed: number;
  /** 错误统计 */
  errors: Record<string, number>;
}
```

#### 4.2 AI配置接口
```typescript
/**
 * AI服务配置
 */
interface AIConfig {
  /** 默认提供商 */
  defaultProvider: string;
  /** 备用提供商列表 */
  fallbackProviders: string[];
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟 */
  retryDelay: number;
  /** 请求超时时间 */
  requestTimeout: number;
  /** 是否启用备用机制 */
  enableFallback: boolean;
  /** 是否启用统计 */
  enableStats: boolean;
  /** 提供商配置 */
  providers: Record<string, ProviderConfig>;
}

/**
 * 提供商配置
 */
interface ProviderConfig {
  /** 提供商类型 */
  provider: string;
  /** 模型名称 */
  model: string;
  /** API密钥 */
  apiKey?: string;
  /** 基础URL */
  baseUrl?: string;
  /** 默认参数 */
  defaultParameters?: AIParameters;
  /** 超时时间 */
  timeout?: number;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * AI提供商信息
 */
interface AIProviderInfo {
  /** 提供商ID */
  id: string;
  /** 提供商名称 */
  name: string;
  /** 提供商类型 */
  type: string;
  /** 支持的模型 */
  models: string[];
  /** 是否可用 */
  available: boolean;
  /** 健康状态 */
  healthy: boolean;
  /** 最后检查时间 */
  lastCheck: Date;
}

/**
 * 响应元数据
 */
interface ResponseMetadata {
  /** 响应时间 */
  responseTime: number;
  /** 生成时间 */
  generatedAt: Date;
  /** 模型版本 */
  modelVersion?: string;
  /** 请求ID */
  requestId?: string;
  /** 额外信息 */
  extra?: Record<string, any>;
}
```

### 5. Tool System API

#### 5.1 工具管理器接口
```typescript
/**
 * 工具管理器接口
 */
interface IToolManager {
  /**
   * 初始化工具系统
   * @param config 工具配置
   */
  initialize(config: ToolConfig): Promise<void>;
  
  /**
   * 注册工具
   * @param tool 工具实例
   */
  registerTool(tool: ITool): Promise<void>;
  
  /**
   * 注销工具
   * @param toolId 工具ID
   */
  unregisterTool(toolId: string): Promise<void>;
  
  /**
   * 执行工具
   * @param toolId 工具ID
   * @param params 执行参数
   */
  executeTool(toolId: string, params: ToolParams): Promise<ToolResult>;
  
  /**
   * 获取工具列表
   */
  getTools(): Promise<ToolInfo[]>;
  
  /**
   * 获取工具详情
   * @param toolId 工具ID
   */
  getToolInfo(toolId: string): Promise<ToolInfo | null>;
  
  /**
   * 检查工具权限
   * @param toolId 工具ID
   * @param context 执行上下文
   */
  checkPermission(toolId: string, context: ExecutionContext): Promise<boolean>;
  
  /**
   * 获取工具执行历史
   * @param toolId 工具ID
   * @param limit 限制数量
   */
  getExecutionHistory(toolId?: string, limit?: number): Promise<ToolExecution[]>;
}

/**
 * 工具基础接口
 */
interface ITool {
  /** 工具ID */
  readonly id: string;
  /** 工具名称 */
  readonly name: string;
  /** 工具描述 */
  readonly description: string;
  /** 工具版本 */
  readonly version: string;
  /** 工具类别 */
  readonly category: ToolCategory;
  /** 参数模式 */
  readonly parameterSchema: ParameterSchema;
  /** 是否需要权限验证 */
  readonly requiresPermission: boolean;
  
  /**
   * 执行工具
   * @param params 执行参数
   * @param context 执行上下文
   */
  execute(params: ToolParams, context: ExecutionContext): Promise<ToolResult>;
  
  /**
   * 验证参数
   * @param params 参数
   */
  validateParams(params: ToolParams): Promise<ValidationResult>;
  
  /**
   * 获取工具状态
   */
  getStatus(): Promise<ToolStatus>;
}

/**
 * 工具类别枚举
 */
enum ToolCategory {
  FILE_SYSTEM = 'file_system',
  CODE_ANALYSIS = 'code_analysis',
  BUILD_TOOLS = 'build_tools',
  VERSION_CONTROL = 'version_control',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  UTILITY = 'utility',
  CUSTOM = 'custom'
}

/**
 * 工具状态枚举
 */
enum ToolStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  ERROR = 'error',
  DISABLED = 'disabled'
}

/**
 * 工具信息接口
 */
interface ToolInfo {
  /** 工具ID */
  id: string;
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 工具版本 */
  version: string;
  /** 工具类别 */
  category: ToolCategory;
  /** 工具状态 */
  status: ToolStatus;
  /** 参数模式 */
  parameterSchema: ParameterSchema;
  /** 是否需要权限 */
  requiresPermission: boolean;
  /** 最后使用时间 */
  lastUsed?: Date;
  /** 使用次数 */
  usageCount: number;
}

/**
 * 工具执行结果接口
 */
interface ToolResult {
  /** 执行ID */
  executionId: string;
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: any;
  /** 错误信息 */
  error?: string;
  /** 执行时间 */
  executionTime: number;
  /** 输出日志 */
  logs?: string[];
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 工具执行记录接口
 */
interface ToolExecution {
  /** 执行ID */
  id: string;
  /** 工具ID */
  toolId: string;
  /** 执行参数 */
  params: ToolParams;
  /** 执行结果 */
  result: ToolResult;
  /** 执行时间 */
  timestamp: Date;
  /** 执行上下文 */
  context: ExecutionContext;
}

/**
 * 参数模式接口
 */
interface ParameterSchema {
  /** 参数类型 */
  type: 'object';
  /** 参数属性 */
  properties: Record<string, ParameterProperty>;
  /** 必需参数 */
  required?: string[];
  /** 额外属性 */
  additionalProperties?: boolean;
}

/**
 * 参数属性接口
 */
interface ParameterProperty {
  /** 属性类型 */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** 属性描述 */
  description?: string;
  /** 默认值 */
  default?: any;
  /** 枚举值 */
  enum?: any[];
  /** 最小值/长度 */
  minimum?: number;
  /** 最大值/长度 */
  maximum?: number;
  /** 数组项类型 */
  items?: ParameterProperty;
}

/**
 * 执行上下文接口
 */
interface ExecutionContext {
  /** 工作目录 */
  workingDirectory: string;
  /** 用户ID */
  userId?: string;
  /** 会话ID */
  sessionId?: string;
  /** 环境变量 */
  environment?: Record<string, string>;
  /** 权限信息 */
  permissions?: string[];
  /** 额外上下文 */
  extra?: Record<string, any>;
}

/**
 * 验证结果接口
 */
interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  errors?: ValidationError[];
}

/**
 * 验证错误接口
 */
interface ValidationError {
  /** 参数路径 */
  path: string;
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code?: string;
}

/**
 * 工具参数类型
 */
type ToolParams = Record<string, any>;

/**
 * 工具配置接口
 */
interface ToolConfig {
  /** 启用的工具列表 */
  enabledTools: string[];
  /** 禁用的工具列表 */
  disabledTools: string[];
  /** 工具白名单 */
  whitelist?: string[];
  /** 工具黑名单 */
  blacklist?: string[];
  /** 安全设置 */
  security: ToolSecurityConfig;
  /** 执行限制 */
  limits: ToolLimits;
  /** 日志配置 */
  logging: ToolLoggingConfig;
}

/**
 * 工具安全配置
 */
interface ToolSecurityConfig {
  /** 是否启用权限检查 */
  enablePermissionCheck: boolean;
  /** 工作区限制 */
  workspaceRestriction: boolean;
  /** 允许的命令列表 */
  allowedCommands?: string[];
  /** 禁止的命令列表 */
  blockedCommands?: string[];
  /** 文件访问限制 */
  fileAccessRestriction: boolean;
  /** 允许的文件扩展名 */
  allowedFileExtensions?: string[];
}

/**
 * 工具执行限制
 */
interface ToolLimits {
  /** 最大执行时间（毫秒） */
  maxExecutionTime: number;
  /** 最大文件大小（字节） */
  maxFileSize: number;
  /** 最大并发执行数 */
  maxConcurrentExecutions: number;
  /** 每分钟最大执行次数 */
  maxExecutionsPerMinute: number;
}

/**
 * 工具日志配置
 */
interface ToolLoggingConfig {
  /** 是否启用日志 */
  enabled: boolean;
  /** 日志级别 */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** 是否记录参数 */
  logParams: boolean;
  /** 是否记录结果 */
  logResults: boolean;
  /** 最大日志条数 */
  maxLogEntries: number;
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

### 6. Storage API

#### 6.1 配置存储接口
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
   * 清空所有配置
   */
  clear(): Promise<void>;
  
  /**
   * 获取所有配置键
   */
  keys(): Promise<string[]>;
  
  /**
   * 获取所有配置
   */
  getAll(): Promise<Record<string, any>>;
  
  /**
   * 监听配置变化
   * @param key 配置键
   * @param callback 回调函数
   */
  watch<T>(key: string, callback: (value: T) => void): Promise<() => void>;
}

/**
 * 会话存储接口
 */
interface ISessionStorage {
  /**
   * 保存会话数据
   * @param sessionId 会话ID
   * @param data 会话数据
   */
  saveSession(sessionId: string, data: SessionData): Promise<void>;
  
  /**
   * 获取会话数据
   * @param sessionId 会话ID
   */
  getSession(sessionId: string): Promise<SessionData | null>;
  
  /**
   * 删除会话
   * @param sessionId 会话ID
   */
  deleteSession(sessionId: string): Promise<void>;
  
  /**
   * 获取所有会话
   */
  getAllSessions(): Promise<SessionInfo[]>;
  
  /**
   * 清理过期会话
   * @param maxAge 最大存活时间（毫秒）
   */
  cleanupExpiredSessions(maxAge: number): Promise<number>;
}

/**
 * 缓存存储接口
 */
interface ICacheStorage {
  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 生存时间（秒）
   */
  set(key: string, value: any, ttl?: number): Promise<void>;
  
  /**
   * 获取缓存
   * @param key 缓存键
   */
  get<T>(key: string): Promise<T | null>;
  
  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): Promise<void>;
  
  /**
   * 检查缓存是否存在
   * @param key 缓存键
   */
  has(key: string): Promise<boolean>;
  
  /**
   * 清空所有缓存
   */
  clear(): Promise<void>;
  
  /**
   * 获取缓存统计信息
   */
  getStats(): Promise<CacheStats>;
}

/**
 * 会话数据接口
 */
interface SessionData {
  /** 会话ID */
  id: string;
  /** 创建时间 */
  createdAt: Date;
  /** 最后访问时间 */
  lastAccessedAt: Date;
  /** 会话状态 */
  status: SessionStatus;
  /** 用户ID */
  userId?: string;
  /** 会话上下文 */
  context: SessionContext;
  /** 消息历史 */
  messages: SessionMessage[];
  /** 会话元数据 */
  metadata: Record<string, any>;
}

/**
 * 会话状态枚举
 */
enum SessionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  TERMINATED = 'terminated'
}

/**
 * 会话上下文接口
 */
interface SessionContext {
  /** 工作区路径 */
  workspacePath?: string;
  /** 当前文件 */
  currentFile?: string;
  /** 选中的文本 */
  selectedText?: string;
  /** 光标位置 */
  cursorPosition?: Position;
  /** 环境变量 */
  environment: Record<string, string>;
}

/**
 * 会话消息接口
 */
interface SessionMessage {
  /** 消息ID */
  id: string;
  /** 消息角色 */
  role: 'user' | 'assistant' | 'system';
  /** 消息内容 */
  content: string;
  /** 时间戳 */
  timestamp: Date;
  /** 消息类型 */
  type: MessageType;
  /** 附加数据 */
  attachments?: MessageAttachment[];
}

/**
 * 消息类型枚举
 */
enum MessageType {
  TEXT = 'text',
  CODE = 'code',
  FILE = 'file',
  IMAGE = 'image',
  COMMAND = 'command',
  RESULT = 'result'
}

/**
 * 消息附件接口
 */
interface MessageAttachment {
  /** 附件类型 */
  type: AttachmentType;
  /** 附件内容 */
  content: string;
  /** 附件元数据 */
  metadata?: Record<string, any>;
}

/**
 * 附件类型枚举
 */
enum AttachmentType {
  FILE_CONTENT = 'file_content',
  CODE_SNIPPET = 'code_snippet',
  EXECUTION_RESULT = 'execution_result',
  ERROR_LOG = 'error_log'
}

/**
 * 会话信息接口
 */
interface SessionInfo {
  /** 会话ID */
  id: string;
  /** 创建时间 */
  createdAt: Date;
  /** 最后访问时间 */
  lastAccessedAt: Date;
  /** 会话状态 */
  status: SessionStatus;
  /** 消息数量 */
  messageCount: number;
  /** 会话标题 */
  title?: string;
}

/**
 * 缓存统计信息
 */
interface CacheStats {
  /** 缓存项数量 */
  itemCount: number;
  /** 缓存命中次数 */
  hits: number;
  /** 缓存未命中次数 */
  misses: number;
  /** 缓存命中率 */
  hitRate: number;
  /** 总内存使用量 */
  memoryUsage: number;
  /** 过期项数量 */
  expiredItems: number;
}
```

### 7. MCP Integration API

#### 7.1 MCP客户端管理器接口
```typescript
/**
 * MCP客户端管理器接口
 */
interface IMCPClientManager {
  /**
   * 初始化MCP客户端
   * @param config MCP配置
   */
  initialize(config: MCPConfig): Promise<void>;
  
  /**
   * 连接到MCP服务器
   * @param serverConfig 服务器配置
   */
  connect(serverConfig: MCPServerConfig): Promise<void>;
  
  /**
   * 断开MCP连接
   */
  disconnect(): Promise<void>;
  
  /**
   * 执行工作流
   * @param workflowId 工作流ID
   * @param params 执行参数
   */
  executeWorkflow(workflowId: string, params: WorkflowParams): Promise<WorkflowResult>;
  
  /**
   * 调用MCP工具
   * @param toolName 工具名称
   * @param params 工具参数
   */
  callTool(toolName: string, params: ToolParams): Promise<ToolResult>;
  
  /**
   * 获取可用工具列表
   */
  getAvailableTools(): Promise<MCPToolInfo[]>;
  
  /**
   * 获取连接状态
   */
  getConnectionStatus(): Promise<MCPConnectionStatus>;
  
  /**
   * 监听MCP事件
   * @param event 事件类型
   * @param callback 回调函数
   */
  on(event: MCPEvent, callback: MCPEventCallback): void;
}

/**
 * MCP配置接口
 */
interface MCPConfig {
  /** 服务器配置 */
  servers: Record<string, MCPServerConfig>;
  /** 客户端配置 */
  client: MCPClientConfig;
  /** 安全配置 */
  security: MCPSecurityConfig;
  /** 日志配置 */
  logging: MCPLoggingConfig;
}

/**
 * MCP服务器配置接口
 */
interface MCPServerConfig {
  /** 服务器名称 */
  name: string;
  /** 启动命令 */
  command: string;
  /** 命令参数 */
  args?: string[];
  /** 工作目录 */
  cwd?: string;
  /** 环境变量 */
  env?: Record<string, string>;
  /** 传输方式 */
  transport: MCPTransport;
  /** 连接超时 */
  timeout?: number;
  /** 是否自动重连 */
  autoReconnect?: boolean;
}

/**
 * MCP客户端配置接口
 */
interface MCPClientConfig {
  /** 客户端名称 */
  name: string;
  /** 客户端版本 */
  version: string;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试间隔 */
  retryInterval: number;
  /** 心跳间隔 */
  heartbeatInterval: number;
}

/**
 * MCP安全配置接口
 */
interface MCPSecurityConfig {
  /** 是否启用TLS */
  enableTLS: boolean;
  /** 证书路径 */
  certPath?: string;
  /** 私钥路径 */
  keyPath?: string;
  /** CA证书路径 */
  caPath?: string;
  /** 是否验证证书 */
  verifyTLS: boolean;
}

/**
 * MCP日志配置接口
 */
interface MCPLoggingConfig {
  /** 日志级别 */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** 是否记录协议消息 */
  logProtocolMessages: boolean;
  /** 是否记录工具调用 */
  logToolCalls: boolean;
  /** 日志文件路径 */
  logFile?: string;
}

/**
 * MCP传输方式枚举
 */
enum MCPTransport {
  STDIO = 'stdio',
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  TCP = 'tcp'
}

/**
 * MCP连接状态接口
 */
interface MCPConnectionStatus {
  /** 是否已连接 */
  connected: boolean;
  /** 服务器信息 */
  serverInfo?: MCPServerInfo;
  /** 连接时间 */
  connectedAt?: Date;
  /** 最后心跳时间 */
  lastHeartbeat?: Date;
  /** 错误信息 */
  error?: string;
}

/**
 * MCP服务器信息接口
 */
interface MCPServerInfo {
  /** 服务器名称 */
  name: string;
  /** 服务器版本 */
  version: string;
  /** 协议版本 */
  protocolVersion: string;
  /** 支持的功能 */
  capabilities: MCPCapabilities;
}

/**
 * MCP功能接口
 */
interface MCPCapabilities {
  /** 支持的工具 */
  tools?: MCPToolCapability[];
  /** 支持的资源 */
  resources?: MCPResourceCapability[];
  /** 支持的提示 */
  prompts?: MCPPromptCapability[];
}

/**
 * MCP工具功能接口
 */
interface MCPToolCapability {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 参数模式 */
  inputSchema: ParameterSchema;
}

/**
 * MCP工具信息接口
 */
interface MCPToolInfo {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 参数模式 */
  inputSchema: ParameterSchema;
  /** 是否可用 */
  available: boolean;
}

/**
 * MCP事件类型枚举
 */
enum MCPEvent {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  TOOL_CALL = 'tool_call',
  WORKFLOW_START = 'workflow_start',
  WORKFLOW_END = 'workflow_end'
}

/**
 * MCP事件回调类型
 */
type MCPEventCallback = (data: any) => void;

/**
 * 工作流参数类型
 */
type WorkflowParams = Record<string, any>;

/**
 * MCP资源功能接口
 */
interface MCPResourceCapability {
  /** 资源名称 */
  name: string;
  /** 资源描述 */
  description: string;
  /** 资源类型 */
  type: string;
}

/**
 * MCP提示功能接口
 */
interface MCPPromptCapability {
  /** 提示名称 */
  name: string;
  /** 提示描述 */
  description: string;
  /** 参数模式 */
  inputSchema: ParameterSchema;
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