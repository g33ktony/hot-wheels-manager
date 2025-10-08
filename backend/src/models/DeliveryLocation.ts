import mongoose, { Schema, Document } from 'mongoose'

export interface IDeliveryLocation extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryLocationSchema = new Schema<IDeliveryLocation>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  }
}, {
  timestamps: true
})

export const DeliveryLocationModel = mongoose.model<IDeliveryLocation>('DeliveryLocation', DeliveryLocationSchema)
