/**
 * 通用参与者基类
 * 提供所有参与者的共同功能和模式
 */

import * as vscode from 'vscode';
import { outputManager } from '../../utils/output-manager';
import {
  globalErrorHandler,
  ParticipantError,
  HandleErrors,
  ErrorType,
} from '../../utils/error-handler';

/**
 * 参与者配置接口
 */
export interface BaseParticipantConfig {
  /** 参与者ID */
  id: string;
  /** 参与者名称 */
  name: string;
  /** 参与者描述 */
  description: string;
  /** 是否启用日志记录 */
  enableLogging?: boolean;
  /** 是否启用错误处理 */
  enableErrorHandling?: boolean;
}

/**
 * 执行上下文接口
 */
export interface ExecutionContext {
  request: vscode.ChatRequest;
  context: vscode.ChatContext;
  stream: vscode.ChatResponseStream;
  token: vscode.CancellationToken;
  startTime: Date;
}

/**
 * 参与者状态枚举
 */
export enum ParticipantStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
  ERROR = 'error',
  COMPLETED = 'completed',
}

/**
 * 通用参与者基类
 */
export abstract class BaseParticipant {
  protected readonly config: BaseParticipantConfig;
  protected status: ParticipantStatus = ParticipantStatus.IDLE;
  protected currentExecution?: ExecutionContext;
  protected readonly enableLogging: boolean;
  protected readonly enableErrorHandling: boolean;

  constructor(config: BaseParticipantConfig) {
    this.config = config;
    this.enableLogging = config.enableLogging ?? true;
    this.enableErrorHandling = config.enableErrorHandling ?? true;

    // 注册错误处理器
    if (this.enableErrorHandling) {
      this.setupErrorHandling();
    }

    // 初始化参与者
    this.initialize();
  }

  /**
   * 获取参与者ID
   */
  public get id(): string {
    return this.config.id;
  }

  /**
   * 获取参与者名称
   */
  public get name(): string {
    return this.config.name;
  }

  /**
   * 获取参与者描述
   */
  public get description(): string {
    return this.config.description;
  }

  /**
   * 获取当前状态
   */
  public get currentStatus(): ParticipantStatus {
    return this.status;
  }

  /**
   * 初始化参与者 - 子类可以覆盖
   */
  protected initialize(): void {
    this.log('参与者初始化完成');
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    globalErrorHandler.addErrorListener(error => {
      if (error.details?.participantId === this.config.id) {
        this.handleParticipantError(error);
      }
    });
  }

  /**
   * 处理参与者错误
   */
  protected handleParticipantError(error: any): void {
    this.status = ParticipantStatus.ERROR;
    this.log(`参与者错误: ${error.message}`, 'error');

    if (this.currentExecution) {
      this.currentExecution.stream.markdown(`❌ ${this.config.name}处理请求时发生错误`);
    }
  }

  /**
   * 主要请求处理方法
   */
  @HandleErrors(ErrorType.PARTICIPANT_ERROR)
  public async handleRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    // 检查取消状态
    if (token.isCancellationRequested) {
      return;
    }

    // 设置执行上下文
    this.currentExecution = {
      request,
      context,
      stream,
      token,
      startTime: new Date(),
    };

    try {
      this.status = ParticipantStatus.PROCESSING;
      this.log(`开始处理请求: ${request.prompt}`);

      // 验证请求
      await this.validateRequest(request, context);

      // 预处理
      await this.preProcess(this.currentExecution);

      // 执行主要逻辑
      await this.executeRequest(this.currentExecution);

      // 后处理
      await this.postProcess(this.currentExecution);

      this.status = ParticipantStatus.COMPLETED;
      this.log('请求处理完成');
    } catch (error) {
      this.status = ParticipantStatus.ERROR;
      const participantError = new ParticipantError(
        `${this.config.name}处理请求失败: ${error instanceof Error ? error.message : String(error)}`,
        { participantId: this.config.id, originalError: error }
      );
      throw participantError;
    } finally {
      this.currentExecution = undefined;
    }
  }

  /**
   * 验证请求 - 子类可以覆盖
   */
  protected async validateRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext
  ): Promise<void> {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new ParticipantError('请求内容不能为空');
    }
  }

  /**
   * 预处理 - 子类可以覆盖
   */
  protected async preProcess(execution: ExecutionContext): Promise<void> {
    // 默认实现为空
  }

  /**
   * 执行请求 - 子类必须实现
   */
  protected abstract executeRequest(execution: ExecutionContext): Promise<void>;

  /**
   * 后处理 - 子类可以覆盖
   */
  protected async postProcess(execution: ExecutionContext): Promise<void> {
    const duration = Date.now() - execution.startTime.getTime();
    this.log(`请求处理耗时: ${duration}ms`);
  }

  /**
   * 检查取消状态
   */
  protected checkCancellation(token: vscode.CancellationToken): void {
    if (token.isCancellationRequested) {
      throw new ParticipantError('请求已被取消');
    }
  }

  /**
   * 发送进度消息
   */
  protected sendProgress(
    stream: vscode.ChatResponseStream,
    message: string,
    showSpinner: boolean = true
  ): void {
    if (showSpinner) {
      stream.progress(message);
    } else {
      stream.markdown(`ℹ️ ${message}`);
    }
  }

  /**
   * 发送成功消息
   */
  protected sendSuccess(stream: vscode.ChatResponseStream, message: string): void {
    stream.markdown(`✅ ${message}`);
  }

  /**
   * 发送警告消息
   */
  protected sendWarning(stream: vscode.ChatResponseStream, message: string): void {
    stream.markdown(`⚠️ ${message}`);
  }

  /**
   * 发送错误消息
   */
  protected sendError(stream: vscode.ChatResponseStream, message: string): void {
    stream.markdown(`❌ ${message}`);
  }

  /**
   * 记录日志
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.enableLogging) {
      return;
    }

    const logMessage = `[${this.config.name}] ${message}`;

    switch (level) {
      case 'error':
        outputManager.logError(logMessage, new Error(message));
        break;
      case 'warn':
        outputManager.logWarning(logMessage);
        break;
      default:
        outputManager.logInfo(logMessage);
    }
  }

  /**
   * 获取执行统计信息
   */
  public getExecutionStats(): {
    participantId: string;
    status: ParticipantStatus;
    isProcessing: boolean;
    executionStartTime?: Date;
  } {
    return {
      participantId: this.config.id,
      status: this.status,
      isProcessing: this.status === ParticipantStatus.PROCESSING,
      executionStartTime: this.currentExecution?.startTime,
    };
  }

  /**
   * 重置参与者状态
   */
  public reset(): void {
    this.status = ParticipantStatus.IDLE;
    this.currentExecution = undefined;
    this.log('参与者状态已重置');
  }

  /**
   * 销毁参与者
   */
  public dispose(): void {
    this.reset();
    this.log('参与者已销毁');
  }
}

/**
 * 参与者工厂接口
 */
export interface ParticipantFactory<T extends BaseParticipant> {
  create(config: BaseParticipantConfig): T;
}

/**
 * 参与者注册表
 */
export class ParticipantRegistry {
  private static instance: ParticipantRegistry;
  private participants: Map<string, BaseParticipant> = new Map();

  private constructor() {}

  public static getInstance(): ParticipantRegistry {
    if (!ParticipantRegistry.instance) {
      ParticipantRegistry.instance = new ParticipantRegistry();
    }
    return ParticipantRegistry.instance;
  }

  /**
   * 注册参与者
   */
  public register(participant: BaseParticipant): void {
    this.participants.set(participant.id, participant);
  }

  /**
   * 获取参与者
   */
  public get(id: string): BaseParticipant | undefined {
    return this.participants.get(id);
  }

  /**
   * 获取所有参与者
   */
  public getAll(): BaseParticipant[] {
    return Array.from(this.participants.values());
  }

  /**
   * 移除参与者
   */
  public unregister(id: string): boolean {
    const participant = this.participants.get(id);
    if (participant) {
      participant.dispose();
      return this.participants.delete(id);
    }
    return false;
  }

  /**
   * 清空注册表
   */
  public clear(): void {
    this.participants.forEach(participant => participant.dispose());
    this.participants.clear();
  }
}
