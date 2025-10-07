import { Schema, model, Document } from 'mongoose'
import { InventoryItem } from '@shared/types'

// Extender la interfaz base con campos de Document
export interface IInventoryItem extends Omit<InventoryItem, '_id'>, Document {
  lastUpdated: Date;
}

const inventoryItemSchema = new Schema({
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
  // Brand and type fields
  brand: { type: String }, // Hot Wheels, Kaido House, Mini GT, M2, etc.
  pieceType: { type: String, enum: ['basic', 'premium', 'rlc'] }, // Basic, Premium, RLC
  isTreasureHunt: { type: Boolean, default: false }, // Only for Hot Wheels basic
  isSuperTreasureHunt: { type: Boolean, default: false }, // Only for Hot Wheels basic
  isChase: { type: Boolean, default: false }, // Only for Mini GT, Kaido House, M2
  // Series fields
  seriesId: { type: String }, // Unique identifier for the series (e.g., "MARVEL-2024-001")
  seriesName: { type: String }, // Display name (e.g., "Marvel Series 2024")
  seriesSize: { type: Number, min: 1 }, // Total pieces in series (e.g., 5)
  seriesPosition: { type: Number, min: 1 }, // Position in series (1-5)
  seriesPrice: { type: Number, min: 0 }, // Price for complete series (editable)
  seriesDefaultPrice: { type: Number, min: 0 }, // Auto-calculated price (85% of individual total)
  // Box fields (for sealed boxes like 72-piece cases)
  isBox: { type: Boolean, default: false }, // true if this is a sealed box
  boxName: { type: String }, // Display name (e.g., "Caja P", "Caja J")
  boxSize: { type: Number, min: 1 }, // Total pieces in box (e.g., 24, 72)
  boxPrice: { type: Number, min: 0 }, // Total price paid for the box
  boxStatus: { 
    type: String, 
    enum: ['sealed', 'unpacking', 'completed'],
    default: 'sealed'
  }, // Box unpacking status
  registeredPieces: { type: Number, default: 0, min: 0 }, // Number of pieces already registered
  // Source box tracking (for pieces that came from a box)
  sourceBox: { type: String }, // Name of source box (e.g., "Caja P")
  sourceBoxId: { type: String } // ID of source box for tracking
}, {
  timestamps: true,
})

// Middleware para actualizar lastUpdated
inventoryItemSchema.pre('save', function(next) {
  this.lastUpdated = new Date()
  next()
})

// Índices para performance
// Índice simple para queries básicas
inventoryItemSchema.index({ carId: 1 })
inventoryItemSchema.index({ condition: 1 })
inventoryItemSchema.index({ quantity: 1 })
inventoryItemSchema.index({ dateAdded: -1 })
inventoryItemSchema.index({ seriesId: 1 })

// Índice compuesto para filtros múltiples (NUEVO - Performance Boost)
inventoryItemSchema.index({ 
  brand: 1, 
  condition: 1, 
  pieceType: 1,
  dateAdded: -1 
})

// Índice para búsqueda de texto (NUEVO - Performance Boost)
inventoryItemSchema.index({ 
  carId: 'text', 
  notes: 'text' 
}, {
  weights: {
    carId: 10,  // Mayor peso a carId
    notes: 5
  },
  name: 'inventory_text_search'
})

// Índice para boxes (NUEVO - Performance Boost)
inventoryItemSchema.index({ 
  isBox: 1, 
  boxStatus: 1,
  dateAdded: -1
})

// Índice para source tracking
inventoryItemSchema.index({ sourceBoxId: 1 })

// Índice para treasure hunts y chase
inventoryItemSchema.index({ 
  brand: 1, 
  isTreasureHunt: 1, 
  isSuperTreasureHunt: 1,
  isChase: 1
})

export const InventoryItemModel = model<IInventoryItem>('InventoryItem', inventoryItemSchema)
