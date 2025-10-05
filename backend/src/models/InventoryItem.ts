import { Schema, model, Document } from 'mongoose'
import { InventoryItem } from '@shared/types'

export interface IInventoryItem extends Omit<InventoryItem, '_id'>, Document {}

const inventoryItemSchema = new Schema<IInventoryItem>({
  carId: { type: String, required: true }, // Usará toy_num de HotWheelsCar
  quantity: { type: Number, required: true, min: 0 },
  reservedQuantity: { type: Number, required: true, min: 0, default: 0 }, // Cantidad reservada para entregas pendientes
  purchasePrice: { type: Number, required: true, min: 0 },
  suggestedPrice: { type: Number, required: true, min: 0 },
  actualPrice: { type: Number, min: 0 },
  condition: {
    type: String,
    required: true,
    enum: ['mint', 'good', 'fair', 'poor'],
    default: 'mint'
  },
  photos: [{ type: String }],
  location: { type: String },
  notes: { type: String },
  dateAdded: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  // Series fields
  seriesId: { type: String }, // Unique identifier for the series (e.g., "MARVEL-2024-001")
  seriesName: { type: String }, // Display name (e.g., "Marvel Series 2024")
  seriesSize: { type: Number, min: 1 }, // Total pieces in series (e.g., 5)
  seriesPosition: { type: Number, min: 1 }, // Position in series (1-5)
  seriesPrice: { type: Number, min: 0 }, // Price for complete series (editable)
  seriesDefaultPrice: { type: Number, min: 0 } // Auto-calculated price (85% of individual total)
}, {
  timestamps: true,
})

// Middleware para actualizar lastUpdated
inventoryItemSchema.pre('save', function(next) {
  this.lastUpdated = new Date()
  next()
})

// Índices
inventoryItemSchema.index({ carId: 1 })
inventoryItemSchema.index({ condition: 1 })
inventoryItemSchema.index({ quantity: 1 })
inventoryItemSchema.index({ dateAdded: -1 })
inventoryItemSchema.index({ seriesId: 1 }) // Para queries de series

export const InventoryItemModel = model<IInventoryItem>('InventoryItem', inventoryItemSchema)
