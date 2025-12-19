import mongoose, { Document, Schema } from 'mongoose'

export interface SaleItem {
  inventoryItemId?: mongoose.Types.ObjectId // Optional for catalog items
  hotWheelsCarId?: mongoose.Types.ObjectId // For catalog items
  carId: string
  carName: string
  quantity: number
  unitPrice: number // Precio final de venta (puede ser modificado en POS)
  originalPrice?: number // Precio original del inventario (para tracking)
}

export interface ISale extends Document {
  customerId?: mongoose.Types.ObjectId
  customer?: any // Populated customer data
  items: SaleItem[]
  totalAmount: number
  saleDate: Date
  deliveryId?: mongoose.Types.ObjectId
  delivery?: any // Populated delivery data
  paymentMethod: 'cash' | 'transfer' | 'paypal' | 'mercadopago' | 'other'
  status: 'pending' | 'completed' | 'cancelled'
  saleType: 'delivery' | 'pos' // delivery = venta con entrega, pos = venta en sitio
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
  },
  originalPrice: {
    type: Number,
    required: false,
    min: 0
  }
})

const SaleSchema = new Schema<ISale>({
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
  saleType: {
    type: String,
    enum: ['delivery', 'pos'],
    required: true,
    default: 'delivery'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
})

export const SaleModel = mongoose.model<ISale>('Sale', SaleSchema)