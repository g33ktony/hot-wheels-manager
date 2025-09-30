import { Request, Response } from 'express'

const notFoundHandler = (req: Request, res: Response): void => {
  const error = {
    success: false,
    message: `Route ${req.originalUrl} not found`,
  }
  
  res.status(404).json(error)
}

export default notFoundHandler
