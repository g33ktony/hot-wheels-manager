import mongoose, { Document, Schema } from 'mongoose'

export interface IDataReport extends Document {
  catalogItemId: string
  carModel: string
  series: string
  year: string
  reportType: 'error_info' | 'missing_photo' | 'wrong_photo' | 'other'
  note: string
  status: 'pending' | 'reviewed' | 'resolved'
  adminNotes?: string
  reviewedAt?: Date
  metadata: {
    ipAddress?: string
    userAgent?: string
  }
  createdAt: Date
  updatedAt: Date
}

const dataReportSchema = new Schema<IDataReport>({
  catalogItemId: {
    type: String,
    required: true,
    index: true
  },
  carModel: {
    type: String,
    required: true,
    trim: true
  },
  series: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: String,
    required: true,
    trim: true
  },
  reportType: {
    type: String,
    required: true,
    enum: ['error_info', 'missing_photo', 'wrong_photo', 'other']
  },
  note: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending',
    index: true
  },
  adminNotes: {
    type: String,
    trim: true
  },
  reviewedAt: {
    type: Date
  },
  metadata: {
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
})

// Index for efficient queries
dataReportSchema.index({ status: 1, createdAt: -1 })

export default mongoose.model<IDataReport>('DataReport', dataReportSchema)
