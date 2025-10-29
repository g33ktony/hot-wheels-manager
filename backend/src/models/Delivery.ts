import mongoose, { Document, Schema } from 'mongoose'

export interface IDelivery extends Document {
  saleId?: string;
  customerId: mongoose.Types.ObjectId;
  customer: any; // Populated customer data
  items: DeliveryItem[];
  scheduledDate: Date;
  scheduledTime?: string; // HH:MM format
  location: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  payments: Payment[];
  notes?: string;
  status: 'scheduled' | 'prepared' | 'completed' | 'cancelled' | 'rescheduled';
  completedDate?: Date;
  // Pre-sale fields
  hasPresaleItems?: boolean; // true if delivery includes pre-sale items
  preSalePaymentPlanId?: string; // Reference to PreSalePaymentPlan if applicable
  preSaleStatus?: 'pending' | 'in-progress' | 'completed' | 'overdue' | 'paused' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  _id?: mongoose.Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod?: 'cash' | 'transfer' | 'card' | 'other';
  notes?: string;
}

export interface DeliveryItem {
  inventoryItemId?: mongoose.Types.ObjectId | string; // ObjectId for inventory items, string for presale items (presale_xxx)
  hotWheelsCarId?: mongoose.Types.ObjectId; // For catalog items
  carId: string;
  carName: string;
  quantity: number;
  unitPrice: number;
  // Pre-sale fields
  isPresaleItem?: boolean; // true if this item comes from a pre-sale
  preSaleItemId?: string; // Reference to PreSaleItem
  unitIds?: string[]; // Array of specific unit IDs from PreSaleItem
}

const DeliveryItemSchema = new Schema<DeliveryItem>({
  inventoryItemId: {
    type: Schema.Types.Mixed, // Can be ObjectId or string (for presale items)
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
  // Pre-sale fields
  isPresaleItem: {
    type: Boolean,
    default: false
  },
  preSaleItemId: {
    type: String
  },
  unitIds: [String]
}, { _id: false })

const PaymentSchema = new Schema<Payment>({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'transfer', 'card', 'other'],
    default: 'cash'
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: true, timestamps: true })

const DeliverySchema = new Schema<IDelivery>({
  saleId: {
    type: String
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customer: {
    type: Object // Populated customer data
  },
  items: [DeliveryItemSchema],
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format validation
    default: '09:00' // Default to 9:00 AM
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  payments: [PaymentSchema],
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'prepared', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  completedDate: {
    type: Date
  },
  // Pre-sale fields
  hasPresaleItems: {
    type: Boolean,
    default: false
  },
  preSalePaymentPlanId: {
    type: String
  },
  preSaleStatus: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'overdue', 'paused', 'cancelled']
  }
}, {
  timestamps: true,
  collection: 'deliveries'
})

// Indexes for better query performance
DeliverySchema.index({ customerId: 1 })
DeliverySchema.index({ status: 1 })
DeliverySchema.index({ scheduledDate: -1 })
DeliverySchema.index({ hasPresaleItems: 1 })
DeliverySchema.index({ preSalePaymentPlanId: 1 })
DeliverySchema.index({ preSaleStatus: 1 })

export const DeliveryModel = mongoose.model<IDelivery>('Delivery', DeliverySchema)
