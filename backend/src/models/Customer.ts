import mongoose, { Document, Schema } from 'mongoose'

export interface ICustomer extends Document {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactMethod: 'phone' | 'email' | 'whatsapp' | 'facebook' | 'other';
  notes?: string;
  totalPurchases?: number;
  lastPurchaseDate?: Date;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  contactMethod: {
    type: String,
    enum: ['phone', 'email', 'whatsapp', 'facebook', 'other'],
    default: 'phone'
  },
  notes: {
    type: String,
    trim: true
  },
  totalPurchases: {
    type: Number,
    default: 0
  },
  lastPurchaseDate: {
    type: Date
  },
  // Multi-tenancy field
  storeId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'customers'
})

// Indexes for better query performance
CustomerSchema.index({ name: 1 })
CustomerSchema.index({ email: 1 })
CustomerSchema.index({ phone: 1 })
CustomerSchema.index({ storeId: 1 })
CustomerSchema.index({ storeId: 1, status: 1 })

export const CustomerModel = mongoose.model<ICustomer>('Customer', CustomerSchema)
