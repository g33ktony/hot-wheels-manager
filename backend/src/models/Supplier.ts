import mongoose, { Document, Schema } from 'mongoose'

export interface ISupplier extends Document {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactMethod: 'phone' | 'email' | 'whatsapp' | 'other';
  website?: string;
  notes?: string;
  totalPurchases?: number;
  lastPurchaseDate?: Date;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>({
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
    enum: ['phone', 'email', 'whatsapp', 'other'],
    default: 'phone'
  },
  website: {
    type: String,
    trim: true
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
  collection: 'suppliers'
})

// Indexes for better query performance
SupplierSchema.index({ name: 1 })
SupplierSchema.index({ email: 1 })
SupplierSchema.index({ phone: 1 })
SupplierSchema.index({ storeId: 1 })

export const SupplierModel = mongoose.model<ISupplier>('Supplier', SupplierSchema)
