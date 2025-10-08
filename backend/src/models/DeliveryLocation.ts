import mongoose, { Schema, Document } from 'mongoose'

export interface IDeliveryLocation extends Document {
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryLocationSchema = new Schema<IDeliveryLocation>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
})

// Compound index for userId + name (unique per user)
DeliveryLocationSchema.index({ userId: 1, name: 1 }, { unique: true })

export const DeliveryLocationModel = mongoose.model<IDeliveryLocation>('DeliveryLocation', DeliveryLocationSchema)
