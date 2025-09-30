import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import dotenv from 'dotenv'
import path from 'path'

// Import routes
import hotWheelsRoutes from './routes/hotWheelsRoutes'
import inventoryRoutes from './routes/inventoryRoutes'
import salesRoutes from './routes/salesRoutes'
import purchasesRoutes from './routes/purchasesRoutes'
import deliveriesRoutes from './routes/deliveriesRoutes'
import customersRoutes from './routes/customersRoutes'
import suppliersRoutes from './routes/suppliersRoutes'
import marketPricesRoutes from './routes/marketPricesRoutes'
import dashboardRoutes from './routes/dashboardRoutes'

// Import middleware
import errorHandler from './middleware/errorHandler'
import notFoundHandler from './middleware/notFoundHandler'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

// Middleware
app.use(helmet()) // Security headers
app.use(compression()) // Gzip compression
app.use(limiter) // Rate limiting
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(morgan('combined')) // Logging
app.use(express.json({ limit: '10mb' })) // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })) // Parse URL-encoded bodies

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  })
})

// API routes
app.use('/api/hotwheels', hotWheelsRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/purchases', purchasesRoutes)
app.use('/api/deliveries', deliveriesRoutes)
app.use('/api/customers', customersRoutes)
app.use('/api/suppliers', suppliersRoutes)
app.use('/api/market-prices', marketPricesRoutes)
app.use('/api/dashboard', dashboardRoutes)

// Error handling middleware
app.use(notFoundHandler)
app.use(errorHandler)

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager'
    
    console.log(' Connecting to MongoDB Atlas...')
    await mongoose.connect(mongoURI)
    mongoose.set('strictPopulate', false)
    console.log('✅ MongoDB Atlas connected successfully')
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    console.log('⚠️  Database unavailable - API will work with limited functionality')
    // Don't exit, let server run without database for testing UI
  }
}

// Start server
const startServer = async () => {
  try {
    // Try to connect to database (non-blocking)
    await connectDB()
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`🎯 Frontend URL: http://localhost:5173`)
    })
  } catch (error) {
    console.error('❌ Server startup error:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})

// Start the server
startServer()

export default app
