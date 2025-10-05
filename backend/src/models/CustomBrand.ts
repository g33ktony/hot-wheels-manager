import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomBrand extends Document {
  name: string;
  createdAt: Date;
  userId?: string;
}

const CustomBrandSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: String,
    required: false
  }
});

export const CustomBrandModel = mongoose.model<ICustomBrand>('CustomBrand', CustomBrandSchema);
