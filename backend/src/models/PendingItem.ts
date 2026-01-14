import { Schema, model, Document } from 'mongoose'

export interface IPendingItem extends Document {
  originalPurchaseId: string
  
  // Detalles del item
  carId: string
  quantity: number
  unitPrice: number
  condition: 'mint' | 'good' | 'fair' | 'poor'
  brand?: string
  pieceType?: 'basic' | 'premium' | 'rlc'
  isTreasureHunt?: boolean
  isSuperTreasureHunt?: boolean
  isChase?: boolean
  photos?: string[]
  
  // Tracking
  status: 'pending-reshipment' | 'requesting-refund' | 'refunded' | 'cancelled'
  reportedDate: Date
  notes?: string
  
  // Reenvío
  linkedToPurchaseId?: string
  
  // Reembolso
  refundAmount?: number
  refundDate?: Date
  refundMethod?: string
  
  createdAt: Date
  updatedAt: Date
}

const pendingItemSchema = new Schema<IPendingItem>({
  originalPurchaseId: {
    type: String,
    required: true,
    ref: 'Purchase'
  },
  
  // Detalles del item
  carId: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  condition: {
    type: String,
    required: true,
    enum: ['mint', 'good', 'fair', 'poor']
  },
  brand: {
    type: String
  },
  pieceType: {
    type: String,
    enum: {
      values: ['basic', 'premium', 'rlc'],
      message: 'pieceType debe ser uno de: basic, premium, rlc'
    },
    default: null,
    sparse: true
  },
  isTreasureHunt: {
    type: Boolean,
    default: false
  },
  isSuperTreasureHunt: {
    type: Boolean,
    default: false
  },
  isChase: {
    type: Boolean,
    default: false
  },
  photos: [{
    type: String
  }],
  
  // Tracking
  status: {
    type: String,
    required: true,
    enum: ['pending-reshipment', 'requesting-refund', 'refunded', 'cancelled'],
    default: 'pending-reshipment'
  },
  reportedDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  notes: {
    type: String
  },
  
  // Reenvío
  linkedToPurchaseId: {
    type: String,
    ref: 'Purchase'
  },
  
  // Reembolso
  refundAmount: {
    type: Number,
    min: 0
  },
  refundDate: {
    type: Date
  },
  refundMethod: {
    type: String
  }
}, {
  timestamps: true
})

// Índices para búsquedas eficientes
pendingItemSchema.index({ originalPurchaseId: 1 })
pendingItemSchema.index({ status: 1 })
pendingItemSchema.index({ linkedToPurchaseId: 1 })
pendingItemSchema.index({ reportedDate: -1 })

export const PendingItemModel = model<IPendingItem>('PendingItem', pendingItemSchema)
