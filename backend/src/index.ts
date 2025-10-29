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
import authRoutes from './routes/auth.routes'
import hotWheelsRoutes from './routes/hotWheelsRoutes'
import inventoryRoutes from './routes/inventoryRoutes'
import salesRoutes from './routes/salesRoutes'
import purchasesRoutes from './routes/purchasesRoutes'
import deliveriesRoutes from './routes/deliveriesRoutes'
import customersRoutes from './routes/customersRoutes'
import suppliersRoutes from './routes/suppliersRoutes'
import marketPricesRoutes from './routes/marketPricesRoutes'
import dashboardRoutes from './routes/dashboardRoutes'
import customBrandRoutes from './routes/customBrandRoutes'
import boxesRoutes from './routes/boxes'
import pendingItemsRoutes from './routes/pendingItemsRoutes'
import facebookRoutes from './routes/facebookRoutes'
import deliveryLocationsRoutes from './routes/deliveryLocations'
import presaleItemsRoutes from './routes/presaleItemsRoutes' // Fixed: Route ordering 2025-10-28
import presalePaymentsRoutes from './routes/presalePaymentsRoutes'

// Import middleware
import { authMiddleware } from './middleware/auth'
import errorHandler from './middleware/errorHandler'
import notFoundHandler from './middleware/notFoundHandler'
import { performanceLogger, responseSizeLogger } from './middleware/performance'

// Load environment variables
dotenv.config()

// Force Railway redeploy - Updated: 2025-10-28 - Fixed presale routes

const app = express()
const PORT = parseInt(process.env.PORT || '3001')

// Trust proxy - configure for Railway (more secure than 'true')
// Railway uses specific proxy patterns, this is more secure than trust proxy: true
app.set('trust proxy', 1)

// Rate limiting - MUY permisivo para desarrollo
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute (or from .env)
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requests per minute (or from .env)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for auth routes and common paths
  skip: (req) => {
    // Skip rate limiting for auth, health check, and durante desarrollo
    return req.path.startsWith('/api/auth') || 
           req.path === '/health' ||
           process.env.NODE_ENV === 'development'
  }
})

// Middleware
app.use(helmet()) // Security headers
app.use(compression({
  filter: (req, res) => {
    // Don't compress if client doesn't accept encoding
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  },
  level: 6, // Balance between compression and CPU (0-9, 6 is default)
  threshold: 1024 // Only compress responses > 1KB
})) // Gzip compression
app.use(performanceLogger) // Performance monitoring
app.use(responseSizeLogger) // Response size tracking
app.use(limiter) // Rate limiting (skips auth routes)
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173']
    console.log('🔍 CORS Check - Origin:', origin, 'Allowed:', allowedOrigins)
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true)
    
    // Check if origin matches exactly or is a subdomain of allowed domains
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      return origin === allowedOrigin || 
             origin === allowedOrigin + '/' ||
             origin.startsWith(allowedOrigin + '/') ||
             (allowedOrigin.includes('vercel.app') && origin.includes('vercel.app'))
    })
    
    if (isAllowed) {
      callback(null, true)
    } else {
      console.error('❌ CORS blocked:', origin)
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
// Auth routes (sin protección)
app.use('/api/auth', authRoutes)

// Rutas protegidas (requieren autenticación)
app.use('/api/hotwheels', authMiddleware, hotWheelsRoutes)
app.use('/api/inventory', authMiddleware, inventoryRoutes)
app.use('/api/sales', authMiddleware, salesRoutes)
app.use('/api/purchases', authMiddleware, purchasesRoutes)
app.use('/api/deliveries', authMiddleware, deliveriesRoutes)
app.use('/api/customers', authMiddleware, customersRoutes)
app.use('/api/suppliers', authMiddleware, suppliersRoutes)
app.use('/api/market-prices', authMiddleware, marketPricesRoutes)
app.use('/api/dashboard', authMiddleware, dashboardRoutes)
app.use('/api/custom-brands', authMiddleware, customBrandRoutes)
app.use('/api/boxes', authMiddleware, boxesRoutes)
app.use('/api/pending-items', authMiddleware, pendingItemsRoutes)
app.use('/api/facebook', authMiddleware, facebookRoutes)
app.use('/api/delivery-locations', authMiddleware, deliveryLocationsRoutes)
app.use('/api/presale/items', authMiddleware, presaleItemsRoutes)
app.use('/api/presale/payments', authMiddleware, presalePaymentsRoutes)

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
      // startup logs
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
