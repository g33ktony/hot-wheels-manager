import { Request, Response, NextFunction } from 'express'

/**
 * Performance Monitoring Middleware
 * Logs slow endpoints and tracks response times
 */
export const performanceLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start
    const logMsg = `${req.method} ${req.path} - ${duration}ms - ${res.statusCode}`
    
    // Log all requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${logMsg}`)
    }
    
    // Warn about slow endpoints (>1s)
    if (duration > 1000) {
      console.warn(`⚠️  SLOW ENDPOINT: ${logMsg}`)
    }
    
    // Alert about very slow endpoints (>3s)
    if (duration > 3000) {
      console.error(`🚨 VERY SLOW ENDPOINT: ${logMsg}`)
    }
  })
  
  next()
}

/**
 * Response Size Logger
 * Tracks payload sizes to identify optimization opportunities
 */
export const responseSizeLogger = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send.bind(res)
  
  res.send = function(data: any) {
    if (data && typeof data === 'string') {
      const sizeKB = (Buffer.byteLength(data, 'utf8') / 1024).toFixed(2)
      
      // Warn about large payloads (>500KB)
      if (parseFloat(sizeKB) > 500) {
        console.warn(`⚠️  LARGE RESPONSE: ${req.path} - ${sizeKB} KB`)
      }
      
      // Alert about very large payloads (>1MB)
      if (parseFloat(sizeKB) > 1024) {
        console.error(`🚨 VERY LARGE RESPONSE: ${req.path} - ${sizeKB} KB`)
      }
    }
    
    return originalSend(data)
  }
  
  next()
}
