import { Request, Response, NextFunction } from 'express'

interface ErrorResponse {
  success: boolean
  message: string
  error?: string
  stack?: string
}

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err)

  // Default error response
  let error: ErrorResponse = {
    success: false,
    message: err.message || 'Internal Server Error',
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val: any) => val.message).join(', ')
    error = {
      success: false,
      message: `Validation Error: ${message}`,
    }
    res.status(400).json(error)
    return
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    error = {
      success: false,
      message: `Duplicate field value for ${field}. Please use another value.`,
    }
    res.status(400).json(error)
    return
  }

  // Mongoose CastError
  if (err.name === 'CastError') {
    error = {
      success: false,
      message: 'Resource not found',
    }
    res.status(404).json(error)
    return
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      success: false,
      message: 'Invalid token',
    }
    res.status(401).json(error)
    return
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      success: false,
      message: 'Token expired',
    }
    res.status(401).json(error)
    return
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      success: false,
      message: 'File too large',
    }
    res.status(400).json(error)
    return
  }

  // Default to 500 server error
  const statusCode = err.statusCode || 500

  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack
  }

  res.status(statusCode).json(error)
}

export default errorHandler
