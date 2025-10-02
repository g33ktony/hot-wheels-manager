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
    const uri = mongoURI || `${process.env.MONGODB_URI}/hot-wheels-manager` || 'mongodb://localhost:27017/hot-wheels-manager'
    await mongoose.connect(uri)
    console.log('✅ MongoDB connected successfully')
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
