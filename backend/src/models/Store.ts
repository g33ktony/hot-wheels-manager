import mongoose, { Schema, Document } from 'mongoose'

export interface Store extends Document {
  _id: string
  name: string // Nombre de la tienda
  description?: string
  storeAdminId?: string // ID del usuario admin principal (sys_admin puede cambiar)
  isArchived: boolean // Estado de archivación
  archivedAt?: Date // Fecha de archivación
  archivedBy?: string // ID del usuario que archivó
  archivedUsers?: any[] // Usuarios guardados cuando se archiva
  createdAt: Date
  updatedAt: Date
}

const StoreSchema = new Schema<Store>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    storeAdminId: {
      type: String,
      index: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    archivedAt: {
      type: Date
    },
    archivedBy: {
      type: String
    },
    archivedUsers: [{
      _id: String,
      name: String,
      email: String,
      role: String,
      status: String,
      phone: String,
      storeId: String,
      approvedAt: Date
    }]
  },
  { timestamps: true }
)

// Index for store queries
StoreSchema.index({ name: 1 })

export default mongoose.model<Store>('Store', StoreSchema)
