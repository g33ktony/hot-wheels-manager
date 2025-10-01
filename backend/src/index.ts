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
const PORT = parseInt(process.env.PORT || '3001')

// Trust proxy - configure for Railway (more secure than 'true')
// Railway uses specific proxy patterns, this is more secure than trust proxy: true
app.set('trust proxy', 1)

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
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173']
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true)
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
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
    const mongoURI = process.env.MONGODB_URI
    
    if (!mongoURI) {
      console.log('⚠️  MONGODB_URI not found - skipping database connection')
      return false
    }
    
    console.log('🔌 Connecting to MongoDB Atlas...')
    
    // Set a connection timeout to prevent hanging
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000,
      family: 4 // Use IPv4, skip trying IPv6
    })
    
    mongoose.set('strictPopulate', false)
    console.log('✅ MongoDB Atlas connected successfully')
    return true
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    console.log('⚠️  Database unavailable - API will work with limited functionality')
    return false
  }
}

// Start server
const startServer = async () => {
  try {
    // Try to connect to database (non-blocking, don't fail if DB unavailable)
    const dbConnected = await connectDB()
    
    // Start server regardless of DB connection status
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`)
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`📊 Database: ${dbConnected ? '✅ Connected' : '❌ Disconnected'}`)
      if (process.env.FRONTEND_URL) {
        console.log(`🎯 Frontend URL: ${process.env.FRONTEND_URL}`)
      }
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
