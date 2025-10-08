import { Schema, model, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  password: string
  name: string
  businessName?: string // Nombre del negocio del usuario
  role: 'admin' | 'user'
  status: 'pending' | 'active' | 'inactive' | 'suspended'
  subscriptionStartDate?: Date
  subscriptionEndDate?: Date
  subscriptionType?: 'monthly' | 'annual'
  approvedBy?: string // userId del admin que aprobó
  approvedAt?: Date
  createdAt: Date
  lastLogin?: Date
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
  businessName: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive', 'suspended'],
    default: 'pending'
  },
  subscriptionStartDate: {
    type: Date
  },
  subscriptionEndDate: {
    type: Date
  },
  subscriptionType: {
    type: String,
    enum: ['monthly', 'annual']
  },
  approvedBy: {
    type: String
  },
  approvedAt: {
    type: Date
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
})

// Índices
userSchema.index({ email: 1 })
userSchema.index({ status: 1 })
userSchema.index({ role: 1 })

export const UserModel = model<IUser>('User', userSchema)
