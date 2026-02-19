import { Schema, model, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  password: string
  name: string
  phone?: string
  role: 'sys_admin' | 'admin' | 'editor' | 'analyst'
  storeId: string  // Cada usuario pertenece a una tienda
  status: 'pending' | 'approved' | 'rejected'  // Aprobación por sys_admin
  approvedBy?: string  // Email de quien aprobó
  approvedAt?: Date
  rejectionReason?: string  // Si fue rechazado, por qué
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
  phone: {
    type: String,
    trim: true
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: String,
    trim: true
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
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

// Índices para queries por tienda y estado
userSchema.index({ storeId: 1, role: 1 })
userSchema.index({ storeId: 1, email: 1 })
userSchema.index({ status: 1 })
userSchema.index({ storeId: 1, status: 1 })

export const UserModel = model<IUser>('User', userSchema)
