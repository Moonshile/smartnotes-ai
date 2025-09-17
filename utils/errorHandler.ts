// 错误类型定义
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  API = 'API_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  OPENAI = 'OPENAI_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

export interface AppError {
  type: ErrorType
  message: string
  details?: any
  timestamp: number
}

// 错误处理类
export class ErrorHandler {
  static handle(error: Error | any): AppError {
    const timestamp = Date.now()
    
    // 网络错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        type: ErrorType.NETWORK,
        message: '网络连接失败，请检查网络设置',
        details: error.message,
        timestamp
      }
    }
    
    // API错误
    if (error.status || error.response) {
      const status = error.status || error.response?.status
      let message = '请求失败'
      
      switch (status) {
        case 400:
          message = '请求参数错误'
          break
        case 401:
          message = '未授权访问'
          break
        case 403:
          message = '访问被拒绝'
          break
        case 404:
          message = '请求的资源不存在'
          break
        case 429:
          message = '请求过于频繁，请稍后再试'
          break
        case 500:
          message = '服务器内部错误'
          break
        case 502:
          message = '网关错误'
          break
        case 503:
          message = '服务暂时不可用'
          break
        default:
          message = `请求失败 (${status})`
      }
      
      return {
        type: ErrorType.API,
        message,
        details: error.response?.data || error.message,
        timestamp
      }
    }
    
    // OpenAI API错误
    if (error.message?.includes('OpenAI') || error.message?.includes('API key')) {
      return {
        type: ErrorType.OPENAI,
        message: 'AI服务暂时不可用，请检查API配置',
        details: error.message,
        timestamp
      }
    }
    
    // 验证错误
    if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      return {
        type: ErrorType.VALIDATION,
        message: '输入数据格式错误',
        details: error.message,
        timestamp
      }
    }
    
    // 未知错误
    return {
      type: ErrorType.UNKNOWN,
      message: error.message || '未知错误',
      details: error,
      timestamp
    }
  }
  
  static getErrorMessage(error: AppError): string {
    return error.message
  }
  
  static getErrorDetails(error: AppError): string {
    if (typeof error.details === 'string') {
      return error.details
    }
    if (typeof error.details === 'object') {
      return JSON.stringify(error.details, null, 2)
    }
    return String(error.details)
  }
  
  static shouldRetry(error: AppError): boolean {
    return error.type === ErrorType.NETWORK || 
           (error.type === ErrorType.API && error.details?.status >= 500)
  }
  
  static getRetryDelay(attempt: number): number {
    // 指数退避：1s, 2s, 4s, 8s, 16s
    return Math.min(1000 * Math.pow(2, attempt), 16000)
  }
}

// 错误日志记录
export class ErrorLogger {
  private static logs: AppError[] = []
  private static maxLogs = 100
  
  static log(error: AppError) {
    this.logs.unshift(error)
    
    // 保持日志数量在限制内
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }
    
    // 在开发环境下打印到控制台
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', error)
    }
    
    // 可以在这里添加发送到错误监控服务的逻辑
    // 例如：Sentry, LogRocket, 等
  }
  
  static getLogs(): AppError[] {
    return [...this.logs]
  }
  
  static clearLogs() {
    this.logs = []
  }
  
  static getRecentErrors(count: number = 10): AppError[] {
    return this.logs.slice(0, count)
  }
}

// 重试机制
export class RetryManager {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: AppError | null = null
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = ErrorHandler.handle(error)
        ErrorLogger.log(lastError)
        
        // 如果是最后一次尝试，抛出错误
        if (attempt === maxAttempts - 1) {
          throw lastError
        }
        
        // 如果不应该重试，立即抛出错误
        if (!ErrorHandler.shouldRetry(lastError)) {
          throw lastError
        }
        
        // 等待后重试
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError || ErrorHandler.handle(new Error('Max retry attempts exceeded'))
  }
}

// 全局错误处理
export function setupGlobalErrorHandling() {
  // 捕获未处理的Promise拒绝
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      const error = ErrorHandler.handle(event.reason)
      ErrorLogger.log(error)
      
      // 在开发环境下阻止默认行为以便调试
      if (process.env.NODE_ENV === 'development') {
        console.error('Unhandled promise rejection:', event.reason)
      }
    })
    
    // 捕获未处理的JavaScript错误
    window.addEventListener('error', (event) => {
      const error = ErrorHandler.handle(event.error)
      ErrorLogger.log(error)
      
      // 在开发环境下阻止默认行为以便调试
      if (process.env.NODE_ENV === 'development') {
        console.error('Unhandled error:', event.error)
      }
    })
  }
}