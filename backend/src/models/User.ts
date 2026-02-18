import { Schema, model, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  password: string
  name: string
  role: 'sys_admin' | 'admin' | 'editor' | 'analyst'
  storeId: string  // Cada usuario pertenece a una tienda
  createdAt: Date
  lastLogin?: Date
  permissions?: string[]
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['sys_admin', 'admin', 'editor', 'analyst'],
    default: 'editor'
  },
  storeId: {
    type: String,
    required: true,
    index: true
  },
  permissions: {
    type: [String],
    default: []
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
})

// Índices para queries por tienda
userSchema.index({ storeId: 1, role: 1 })
userSchema.index({ storeId: 1, email: 1 })

export const UserModel = model<IUser>('User', userSchema)
