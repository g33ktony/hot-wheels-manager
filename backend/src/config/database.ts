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
    // Get the base URI (remove any existing database name)
    const baseURI = mongoURI || process.env.MONGODB_URI || 'mongodb://localhost:27017'
    
    // Ensure we connect to the correct database name
    let uri: string
    if (baseURI.includes('mongodb://localhost') || baseURI.includes('mongodb://127.0.0.1')) {
      // Local MongoDB
      uri = 'mongodb://localhost:27017/hot-wheels-manager'
    } else {
      // Remote MongoDB (Atlas, etc.) - replace or add database name
      const uriParts = baseURI.split('/')
      const baseWithoutDb = uriParts.slice(0, -1).join('/') // Remove last part (database name)
      uri = `${baseWithoutDb}/hot-wheels-manager`
    }
    
    console.log('🔗 Connecting to database: hot-wheels-manager')
    await mongoose.connect(uri)
    console.log('✅ MongoDB connected successfully to hot-wheels-manager database')
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
