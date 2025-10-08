import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomBrand extends Document {
  userId: string;
  name: string;
  createdAt: Date;
}

const CustomBrandSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index (userId + name) - each user can have unique brand names
CustomBrandSchema.index({ userId: 1, name: 1 }, { unique: true });

export const CustomBrandModel = mongoose.model<ICustomBrand>('CustomBrand', CustomBrandSchema);
