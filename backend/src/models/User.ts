import { Schema, model, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  password: string
  name: string
  role: 'sys_admin' | 'admin' | 'editor' | 'analyst'
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

// Índices
userSchema.index({ email: 1 })

export const UserModel = model<IUser>('User', userSchema)
