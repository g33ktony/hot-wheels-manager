import mongoose, { Schema, Document } from 'mongoose'

export interface Store extends Document {
  _id: string
  name: string // Nombre de la tienda
  description?: string
  storeAdminId?: string // ID del usuario admin principal (sys_admin puede cambiar)
  createdAt: Date
  updatedAt: Date
}

const StoreSchema = new Schema<Store>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    storeAdminId: {
      type: String,
      index: true
    }
  },
  { timestamps: true }
)

// Index for store queries
StoreSchema.index({ name: 1 })

export default mongoose.model<Store>('Store', StoreSchema)
