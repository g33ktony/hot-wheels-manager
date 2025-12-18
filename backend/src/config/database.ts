import mongoose from 'mongoose'

// In-memory MongoDB for development/testing
export const connectInMemoryDB = async () => {
  try {
    // Try to use MongoDB Memory Server for development
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    const mongoServer = await MongoMemoryServer.create()
    const mongoUri = mongoServer.getUri()
    
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to in-memory MongoDB for development')
    return mongoServer
  } catch (error) {
    console.warn('⚠️  MongoDB Memory Server not available, falling back to mock data')
    return null
  }
}

// Regular MongoDB connection
export const connectDB = async (mongoURI?: string) => {
  try {
    // Get the MongoDB URI from parameter or environment variable
    const uri = mongoURI || process.env.MONGODB_URI || 'mongodb://localhost:27017/hot-wheels-manager'
    console.log("🚀 ~ connectDB ~ uri:", uri)
    
    // Extract database name from URI for logging
    const dbNameMatch = uri.match(/\/([^/?]+)(\?|$)/)
    const dbName = dbNameMatch ? dbNameMatch[1] : 'unknown'
    
    console.log('🔗 Connecting to database:', dbName)
    await mongoose.connect(uri)
    console.log('✅ MongoDB connected successfully to', dbName, 'database')
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    
    // Try in-memory fallback for development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Attempting in-memory database fallback...')
      return await connectInMemoryDB()
    }
    
    throw error
  }
}
