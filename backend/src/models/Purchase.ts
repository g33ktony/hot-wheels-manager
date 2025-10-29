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
  },
  // Brand and type fields
  brand: { type: String },
  pieceType: { type: String, enum: ['basic', 'premium', 'rlc'] },
  isTreasureHunt: { type: Boolean, default: false },
  isSuperTreasureHunt: { type: Boolean, default: false },
  isChase: { type: Boolean, default: false },
  // Series fields
  seriesId: { type: String },
  seriesName: { type: String },
  seriesSize: { type: Number },
  seriesPosition: { type: Number },
  seriesPrice: { type: Number },
  // Box fields (for purchasing sealed boxes)
  isBox: { type: Boolean, default: false },
  boxName: { type: String },
  boxSize: { type: Number },
  boxPrice: { type: Number },
  // Photos and location
  photos: [{ type: String }],
  location: { type: String },
  notes: { type: String }
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
  receivedDate: { type: Date },
  // Pending items tracking
  hasPendingItems: { type: Boolean, default: false },
  pendingItemsCount: { type: Number, default: 0, min: 0 },
  // Pre-sale fields
  isPresale: { type: Boolean, default: false },
  preSaleScheduledDate: { type: Date },
  preSaleStatus: {
    type: String,
    enum: ['coming-soon', 'purchased', 'shipped', 'received', 'archived'],
    default: 'coming-soon'
  }
}, {
  timestamps: true,
  collection: 'purchases'
})

// Indexes for better query performance
PurchaseSchema.index({ supplierId: 1 })
PurchaseSchema.index({ status: 1 })
PurchaseSchema.index({ purchaseDate: -1 })
PurchaseSchema.index({ 'items.carId': 1 })
PurchaseSchema.index({ isPresale: 1 })
PurchaseSchema.index({ preSaleStatus: 1 })

// Pre-save validation
PurchaseSchema.pre('save', function(next) {
  // If isPresale is true, ensure preSaleStatus exists
  const doc = this as any
  if (doc.isPresale && !doc.preSaleStatus) {
    doc.preSaleStatus = 'coming-soon'
  }
  next()
})

export default mongoose.model<Purchase & Document>('Purchase', PurchaseSchema)
