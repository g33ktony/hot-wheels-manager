import { Schema, model, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  password: string
  name: string
  role: 'admin'
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
  role: {
    type: String,
    enum: ['admin'],
    default: 'admin'
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
