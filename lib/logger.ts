interface LogContext {
  userId?: string
  email?: string
  action?: string
  resource?: string
  method?: string
  path?: string
  statusCode?: number
  [key: string]: any
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? JSON.stringify(context) : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${contextStr}`
  }

  private writeLog(level: LogLevel, message: string, context?: LogContext) {
    const formattedMessage = this.formatMessage(level, message, context)

    // Log to console in development
    if (this.isDevelopment) {
      switch (level) {
        case 'error':
          console.error(formattedMessage)
          break
        case 'warn':
          console.warn(formattedMessage)
          break
        case 'debug':
          console.debug(formattedMessage)
          break
        default:
          console.log(formattedMessage)
      }
    }

    // In production, you could send logs to external service (e.g., Sentry, DataDog, etc.)
    // Example: sendToExternalLogger(level, message, context)
  }

  info(message: string, context?: LogContext) {
    this.writeLog('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.writeLog('warn', message, context)
  }

  error(message: string, context?: LogContext) {
    this.writeLog('error', message, context)
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.writeLog('debug', message, context)
    }
  }

  // Specific logging helpers

  logAuth(action: 'login' | 'signup' | 'logout', userId: string, email: string, success: boolean) {
    this.info(`User ${action}`, {
      action: `auth_${action}`,
      userId,
      email,
      success,
    })
  }

  logOrder(action: 'created' | 'updated' | 'cancelled', orderId: string, context?: LogContext) {
    this.info(`Order ${action}`, {
      action: `order_${action}`,
      resource: 'order',
      orderId,
      ...context,
    })
  }

  logPayment(action: 'initiated' | 'completed' | 'failed', orderId: string, context?: LogContext) {
    this.info(`Payment ${action}`, {
      action: `payment_${action}`,
      resource: 'payment',
      orderId,
      ...context,
    })
  }

  logProductAction(
    action: 'created' | 'updated' | 'deleted',
    productId: string,
    context?: LogContext
  ) {
    this.info(`Product ${action}`, {
      action: `product_${action}`,
      resource: 'product',
      productId,
      ...context,
    })
  }

  logReturn(action: 'requested' | 'approved' | 'rejected', returnId: string, context?: LogContext) {
    this.info(`Return ${action}`, {
      action: `return_${action}`,
      resource: 'return',
      returnId,
      ...context,
    })
  }

  logApiAccess(method: string, path: string, statusCode: number, context?: LogContext) {
    this.info(`API ${method} ${path}`, {
      method,
      path,
      statusCode,
      ...context,
    })
  }
}

export const logger = new Logger()
