import mongoose, { Schema, Document } from 'mongoose'
import { Purchase, PurchaseItem } from '@shared/types'

const PurchaseItemSchema = new Schema<PurchaseItem>({
  carId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  condition: {
    type: String,
    required: true,
    enum: ['mint', 'good', 'fair', 'poor'],
    default: 'mint'
  }
}, { _id: false })

const PurchaseSchema = new Schema<Purchase & Document>({
  items: [PurchaseItemSchema],
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  supplier: {
    type: Schema.Types.Mixed // Populated supplier data
  },
  totalCost: { type: Number, required: true, min: 0 },
  shippingCost: { type: Number, default: 0, min: 0 },
  trackingNumber: { type: String },
  purchaseDate: { type: Date, required: true },
  estimatedDelivery: { type: Date },
  actualDelivery: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'paid', 'shipped', 'received', 'cancelled'],
    default: 'pending'
  },
  notes: { type: String },
  isReceived: { type: Boolean, default: false },
  receivedDate: { type: Date }
}, {
  timestamps: true,
  collection: 'purchases'
})

// Indexes for better query performance
PurchaseSchema.index({ supplierId: 1 })
PurchaseSchema.index({ status: 1 })
PurchaseSchema.index({ purchaseDate: -1 })
PurchaseSchema.index({ 'items.carId': 1 })

export default mongoose.model<Purchase & Document>('Purchase', PurchaseSchema)
