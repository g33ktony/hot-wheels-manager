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
  notes?: string;
  status: 'scheduled' | 'prepared' | 'completed' | 'cancelled' | 'rescheduled';
  completedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryItem {
  inventoryItemId?: mongoose.Types.ObjectId; // Optional for catalog items
  hotWheelsCarId?: mongoose.Types.ObjectId; // For catalog items
  carId: string;
  carName: string;
  quantity: number;
  unitPrice: number;
}

const DeliveryItemSchema = new Schema<DeliveryItem>({
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
}, { _id: false })

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
  }
}, {
  timestamps: true,
  collection: 'deliveries'
})

// Indexes for better query performance
DeliverySchema.index({ customerId: 1 })
DeliverySchema.index({ status: 1 })
DeliverySchema.index({ scheduledDate: -1 })

export const DeliveryModel = mongoose.model<IDelivery>('Delivery', DeliverySchema)
