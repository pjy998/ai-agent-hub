/**
 * 统一错误处理机制
 * 提供标准化的错误类型和错误处理工具
 */

import { outputManager } from './output-manager';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  PARTICIPANT_ERROR = 'PARTICIPANT_ERROR',
  FLOW_EXECUTION_ERROR = 'FLOW_EXECUTION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * 标准化错误接口
 */
export interface IStandardError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
  stack?: string;
}

/**
 * 自定义错误基类
 */
export class StandardError extends Error implements IStandardError {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code?: string;
  public readonly details?: any;
  public readonly timestamp: Date;

  constructor(
    type: ErrorType,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    code?: string,
    details?: any
  ) {
    super(message);
    this.name = 'StandardError';
    this.type = type;
    this.severity = severity;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();

    // 确保错误堆栈正确显示
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StandardError);
    }
  }

  /**
   * 转换为JSON格式
   */
  toJSON(): IStandardError {
    return {
      type: this.type,
      severity: this.severity,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * 验证错误
 */
export class ValidationError extends StandardError {
  constructor(message: string, details?: any) {
    super(ErrorType.VALIDATION_ERROR, message, ErrorSeverity.MEDIUM, 'VALIDATION_001', details);
    this.name = 'ValidationError';
  }
}

/**
 * 网络错误
 */
export class NetworkError extends StandardError {
  constructor(message: string, details?: any) {
    super(ErrorType.NETWORK_ERROR, message, ErrorSeverity.HIGH, 'NETWORK_001', details);
    this.name = 'NetworkError';
  }
}

/**
 * 文件系统错误
 */
export class FileSystemError extends StandardError {
  constructor(message: string, details?: any) {
    super(ErrorType.FILE_SYSTEM_ERROR, message, ErrorSeverity.MEDIUM, 'FS_001', details);
    this.name = 'FileSystemError';
  }
}

/**
 * AI服务错误
 */
export class AIServiceError extends StandardError {
  constructor(message: string, details?: any) {
    super(ErrorType.AI_SERVICE_ERROR, message, ErrorSeverity.HIGH, 'AI_001', details);
    this.name = 'AIServiceError';
  }
}

/**
 * 配置错误
 */
export class ConfigurationError extends StandardError {
  constructor(message: string, details?: any) {
    super(ErrorType.CONFIGURATION_ERROR, message, ErrorSeverity.HIGH, 'CONFIG_001', details);
    this.name = 'ConfigurationError';
  }
}

/**
 * 参与者错误
 */
export class ParticipantError extends StandardError {
  constructor(message: string, details?: any) {
    super(ErrorType.PARTICIPANT_ERROR, message, ErrorSeverity.MEDIUM, 'PARTICIPANT_001', details);
    this.name = 'ParticipantError';
  }
}

/**
 * 流程执行错误
 */
export class FlowExecutionError extends StandardError {
  constructor(message: string, details?: any) {
    super(ErrorType.FLOW_EXECUTION_ERROR, message, ErrorSeverity.HIGH, 'FLOW_001', details);
    this.name = 'FlowExecutionError';
  }
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Array<(error: IStandardError) => void> = [];

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 添加错误监听器
   */
  public addErrorListener(listener: (error: IStandardError) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * 移除错误监听器
   */
  public removeErrorListener(listener: (error: IStandardError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * 处理错误
   */
  public handleError(error: Error | StandardError): IStandardError {
    let standardError: IStandardError;

    if (error instanceof StandardError) {
      standardError = error.toJSON();
    } else {
      // 将普通错误转换为标准错误
      standardError = {
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: error.message || 'Unknown error occurred',
        timestamp: new Date(),
        stack: error.stack,
      };
    }

    // 通知所有监听器
    this.errorListeners.forEach(listener => {
      try {
        listener(standardError);
      } catch (listenerError) {
        outputManager.logError(
          'Error in error listener:',
          listenerError instanceof Error ? listenerError : new Error(String(listenerError))
        );
      }
    });

    return standardError;
  }

  /**
   * 记录错误到控制台
   */
  public logError(error: IStandardError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.type}] ${error.message}`;
    const logDetails = {
      code: error.code,
      details: error.details,
      timestamp: error.timestamp,
      stack: error.stack,
    };

    switch (logLevel) {
      case 'error':
        outputManager.logError(logMessage, new Error(JSON.stringify(logDetails)));
        break;
      case 'warn':
        outputManager.logWarning(logMessage);
        break;
      case 'info':
        outputManager.logInfo(logMessage, JSON.stringify(logDetails));
        break;
      default:
        outputManager.logInfo(logMessage, JSON.stringify(logDetails));
    }
  }

  /**
   * 根据错误严重级别获取日志级别
   */
  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'log';
    }
  }
}

/**
 * 全局错误处理器实例
 */
export const globalErrorHandler = ErrorHandler.getInstance();

/**
 * 错误处理装饰器
 */
export function HandleErrors(errorType: ErrorType = ErrorType.UNKNOWN_ERROR) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        const standardError = new StandardError(
          errorType,
          error instanceof Error ? error.message : 'Unknown error',
          ErrorSeverity.MEDIUM,
          undefined,
          { originalError: error, methodName: propertyName, args }
        );
        globalErrorHandler.handleError(standardError);
        throw standardError;
      }
    };
  };
}

/**
 * 安全执行函数，捕获并处理错误
 */
export async function safeExecute<T>(
  fn: () => Promise<T> | T,
  errorType: ErrorType = ErrorType.UNKNOWN_ERROR,
  defaultValue?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    const standardError = new StandardError(
      errorType,
      error instanceof Error ? error.message : 'Unknown error',
      ErrorSeverity.MEDIUM,
      undefined,
      { originalError: error }
    );
    globalErrorHandler.handleError(standardError);
    return defaultValue;
  }
}
