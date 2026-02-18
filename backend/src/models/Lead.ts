import mongoose, { Document, Schema } from 'mongoose'

export interface ILead extends Document {
  name: string
  email: string
  phone?: string
  estado: string // State
  municipio: string // Municipality
  source: string
  registeredAt: Date
  interestedInItem?: {
    catalogId: string
    carModel: string
    requestType: 'availability' | 'notify' // 'availability' for in-stock, 'notify' for out-of-stock
  }
  message?: string
  viewedItems: Array<{
    catalogId: string
    carModel: string
    viewedAt: Date
  }>
  metadata: {
    ipAddress?: string
    userAgent?: string
    referrer?: string
  }
  contactStatus: 'new' | 'contacted' | 'converted' | 'not_interested'
  notes?: string
  lastContactedAt?: Date
  storeId: string
}

const leadSchema = new Schema<ILead>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  phone: {
    type: String,
    trim: true
  },
  estado: {
    type: String,
    required: true,
    trim: true
  },
  municipio: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    default: 'public-catalog'
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  interestedInItem: {
    catalogId: String,
    carModel: String,
    requestType: {
      type: String,
      enum: ['availability', 'notify']
    }
  },
  message: {
    type: String,
    trim: true
  },
  viewedItems: [{
    catalogId: String,
    carModel: String,
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    ipAddress: String,
    userAgent: String,
    referrer: String
  },
  contactStatus: {
    type: String,
    enum: ['new', 'contacted', 'converted', 'not_interested'],
    default: 'new'
  },
  notes: {
    type: String,
    trim: true
  },
  lastContactedAt: {
    type: Date
  },
  // Multi-tenancy field
  storeId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
})

// Indexes for performance
leadSchema.index({ email: 1 }, { unique: true })
leadSchema.index({ registeredAt: -1 })
leadSchema.index({ estado: 1 })
leadSchema.index({ contactStatus: 1 })
leadSchema.index({ 'interestedInItem.catalogId': 1 })
leadSchema.index({ storeId: 1 })
leadSchema.index({ storeId: 1, contactStatus: 1 })

const Lead = mongoose.model<ILead>('Lead', leadSchema)

export default Lead
