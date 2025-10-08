import mongoose, { Document, Schema } from 'mongoose'

export interface SaleItem {
  inventoryItemId?: mongoose.Types.ObjectId // Optional for catalog items
  hotWheelsCarId?: mongoose.Types.ObjectId // For catalog items
  carId: string
  carName: string
  quantity: number
  unitPrice: number
}

export interface ISale extends Document {
  userId: string // Multi-tenant: Owner of this sale
  customerId?: mongoose.Types.ObjectId
  customer?: any // Populated customer data
  items: SaleItem[]
  totalAmount: number
  saleDate: Date
  deliveryId?: mongoose.Types.ObjectId
  delivery?: any // Populated delivery data
  paymentMethod: 'cash' | 'transfer' | 'paypal' | 'mercadopago' | 'other'
  status: 'pending' | 'completed' | 'cancelled'
  notes: string
  createdAt: Date
  updatedAt: Date
}

const SaleItemSchema = new Schema<SaleItem>({
  inventoryItemId: {
    type: Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: false // Optional for catalog items
  },
  hotWheelsCarId: {
    type: Schema.Types.ObjectId,
    ref: 'HotWheelsCar',
    required: false // For catalog items
  },
  carId: {
    type: String,
    required: true
  },
  carName: {
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
  }
})

const SaleSchema = new Schema<ISale>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customer: {
    type: Object // Populated customer data
  },
  items: [SaleItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  saleDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  deliveryId: {
    type: Schema.Types.ObjectId,
    ref: 'Delivery'
  },
  delivery: {
    type: Object // Populated delivery data
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'transfer', 'paypal', 'mercadopago', 'other'],
    default: 'cash'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
})

// Multi-tenant indexes
SaleSchema.index({ userId: 1, saleDate: -1 })
SaleSchema.index({ userId: 1, status: 1 })
SaleSchema.index({ userId: 1, customerId: 1 })

export const SaleModel = mongoose.model<ISale>('Sale', SaleSchema)