import { useState, useCallback } from 'react'
import { ErrorHandler, ErrorLogger, RetryManager, AppError } from '@/utils/errorHandler'

// 错误边界Hook
export function useErrorHandler() {
  const [error, setError] = useState<AppError | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  
  const handleError = useCallback((error: Error | any) => {
    const appError = ErrorHandler.handle(error)
    setError(appError)
    ErrorLogger.log(appError)
  }, [])
  
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  const retry = useCallback(async (operation: () => Promise<any>) => {
    if (!error) return
    
    setIsRetrying(true)
    try {
      await RetryManager.withRetry(operation)
      clearError()
    } catch (retryError) {
      handleError(retryError)
    } finally {
      setIsRetrying(false)
    }
  }, [error, handleError, clearError])
  
  return {
    error,
    isRetrying,
    handleError,
    clearError,
    retry
  }
}
