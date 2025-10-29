import mongoose, { Schema, Document } from 'mongoose'

/**
 * PreSaleItem Model
 *
 * Aggregates multiple pre-sale purchases of the same car into a single product.
 * Tracks quantity allocation, pricing, and delivery assignments.
 *
 * Key Design:
 * - Groups all pre-sale purchases by carId
 * - Maintains separate quantity counters (total, assigned, available)
 * - Tracks unit-level allocation to prevent over-allocation
 * - Stores base pricing inherited from first purchase (can be adjusted with markup)
 */

export interface PreSaleUnitAssignment {
  unitId: string; // Unique identifier for this unit
  purchaseId: string; // Which purchase this unit came from
  deliveryId?: string; // Which delivery this unit is assigned to
  assignedDate?: Date;
  notes?: string;
}

export interface PreSaleItem extends Document {
  carId: string; // Reference to HotWheels car model
  totalQuantity: number; // Total units available from all purchases
  assignedQuantity: number; // Units assigned to deliveries
  availableQuantity: number; // Calculated: totalQuantity - assignedQuantity

  // Pricing - inherited from first purchase, adjustable with markup
  basePricePerUnit: number; // Price from original purchase(s)
  markupPercentage: number; // Default: 15%
  finalPricePerUnit: number; // Calculated: basePricePerUnit * (1 + markupPercentage/100)

  // Status & Lifecycle
  status: 'active' | 'completed' | 'cancelled' | 'paused'
  startDate: Date; // When pre-sale collection started
  endDate?: Date; // When pre-sale ended or completed
  notes?: string;

  // Unit-level tracking (prevents over-allocation)
  units: PreSaleUnitAssignment[] // Array of all units with their assignments

  // Product metadata (denormalized from HotWheels for faster lookups)
  carModel?: string;
  brand?: string;
  pieceType?: 'basic' | 'premium' | 'rlc';
  condition?: 'mint' | 'good' | 'fair' | 'poor';

  // Related purchases
  purchaseIds: string[] // Array of Purchase IDs that contribute to this item

  // Delivery assignments - tracks which deliveries include units from this pre-sale
  deliveryAssignments: {
    deliveryId: string;
    unitsCount: number;
    assignedDate: Date;
  }[]

  // Profit tracking
  totalSaleAmount: number; // finalPricePerUnit * totalQuantity
  totalCostAmount: number; // basePricePerUnit * totalQuantity
  totalProfit: number; // Calculated: totalSaleAmount - totalCostAmount

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getAvailableQuantity(): number;
  assignUnit(deliveryId: string, purchaseId: string): string; // Returns unitId
  unassignUnit(unitId: string): void;
  getUnitsForDelivery(deliveryId: string): PreSaleUnitAssignment[];
  canAssignUnits(count: number): boolean;
  calculateProfit(): number;
}

const PreSaleUnitAssignmentSchema = new Schema<PreSaleUnitAssignment>(
  {
    unitId: { type: String, required: true },
    purchaseId: { type: String, required: true },
    deliveryId: { type: String },
    assignedDate: { type: Date },
    notes: { type: String }
  },
  { _id: false }
)

const DeliveryAssignmentSchema = new Schema(
  {
    deliveryId: { type: String, required: true },
    unitsCount: { type: Number, required: true, min: 1 },
    assignedDate: { type: Date, required: true, default: Date.now }
  },
  { _id: false }
)

const PreSaleItemSchema = new Schema<PreSaleItem>(
  {
    carId: {
      type: String,
      required: true,
      index: true
    },
    totalQuantity: {
      type: Number,
      required: true,
      min: 1
    },
    assignedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    availableQuantity: {
      type: Number,
      required: true,
      default: function(this: any) {
        return this.totalQuantity - this.assignedQuantity
      }
    },

    // Pricing
    basePricePerUnit: {
      type: Number,
      required: true,
      min: 0
    },
    markupPercentage: {
      type: Number,
      required: true,
      default: 15,
      min: 0,
      max: 100
    },
    finalPricePerUnit: {
      type: Number,
      required: true,
      default: function(this: any) {
        return this.basePricePerUnit * (1 + this.markupPercentage / 100)
      }
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'paused'],
      default: 'active'
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    notes: {
      type: String
    },

    // Unit tracking
    units: [PreSaleUnitAssignmentSchema],

    // Product metadata
    carModel: { type: String },
    brand: { type: String },
    pieceType: {
      type: String,
      enum: ['basic', 'premium', 'rlc']
    },
    condition: {
      type: String,
      enum: ['mint', 'good', 'fair', 'poor']
    },

    // Related purchases
    purchaseIds: {
      type: [String],
      required: true,
      default: []
    },

    // Delivery assignments
    deliveryAssignments: [DeliveryAssignmentSchema],

    // Profit tracking
    totalSaleAmount: {
      type: Number,
      required: true,
      default: function(this: any) {
        return this.finalPricePerUnit * this.totalQuantity
      }
    },
    totalCostAmount: {
      type: Number,
      required: true,
      default: function(this: any) {
        return this.basePricePerUnit * this.totalQuantity
      }
    },
    totalProfit: {
      type: Number,
      required: true,
      default: function(this: any) {
        return this.totalSaleAmount - this.totalCostAmount
      }
    }
  },
  {
    timestamps: true
  }
)

// Indexes for better query performance
PreSaleItemSchema.index({ carId: 1 })
PreSaleItemSchema.index({ status: 1 })
PreSaleItemSchema.index({ 'units.deliveryId': 1 })
PreSaleItemSchema.index({ 'units.purchaseId': 1 })
PreSaleItemSchema.index({ 'deliveryAssignments.deliveryId': 1 })

// Instance methods
PreSaleItemSchema.methods.getAvailableQuantity = function(this: PreSaleItem): number {
  return this.totalQuantity - this.assignedQuantity
}

PreSaleItemSchema.methods.canAssignUnits = function(
  this: PreSaleItem,
  count: number
): boolean {
  return this.getAvailableQuantity() >= count
}

PreSaleItemSchema.methods.assignUnit = function(
  this: PreSaleItem,
  deliveryId: string,
  purchaseId: string
): string {
  // Generate unique unit ID
  const unitId = `${this._id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Add unit to tracking
  this.units.push({
    unitId,
    purchaseId,
    deliveryId,
    assignedDate: new Date()
  })

  // Update quantities
  this.assignedQuantity += 1
  this.availableQuantity = this.totalQuantity - this.assignedQuantity

  // Update delivery assignment counts
  const existingAssignment = this.deliveryAssignments.find(
    (da) => da.deliveryId === deliveryId
  )
  if (existingAssignment) {
    existingAssignment.unitsCount += 1
  } else {
    this.deliveryAssignments.push({
      deliveryId,
      unitsCount: 1,
      assignedDate: new Date()
    })
  }

  return unitId
}

PreSaleItemSchema.methods.unassignUnit = function(this: PreSaleItem, unitId: string): void {
  const unitIndex = this.units.findIndex((u) => u.unitId === unitId)
  if (unitIndex === -1) {
    throw new Error(`Unit ${unitId} not found`)
  }

  const unit = this.units[unitIndex]
  const deliveryId = unit.deliveryId

  // Remove unit
  this.units.splice(unitIndex, 1)

  // Update quantities
  this.assignedQuantity -= 1
  this.availableQuantity = this.totalQuantity - this.assignedQuantity

  // Update delivery assignment
  if (deliveryId) {
    const assignment = this.deliveryAssignments.find((da) => da.deliveryId === deliveryId)
    if (assignment) {
      assignment.unitsCount -= 1
      if (assignment.unitsCount === 0) {
        // Remove assignment if no more units
        const index = this.deliveryAssignments.indexOf(assignment)
        this.deliveryAssignments.splice(index, 1)
      }
    }
  }
}

PreSaleItemSchema.methods.getUnitsForDelivery = function(
  this: PreSaleItem,
  deliveryId: string
): PreSaleUnitAssignment[] {
  return this.units.filter((u) => u.deliveryId === deliveryId)
}

PreSaleItemSchema.methods.calculateProfit = function(this: PreSaleItem): number {
  const totalSale = this.finalPricePerUnit * this.totalQuantity
  const totalCost = this.basePricePerUnit * this.totalQuantity
  return totalSale - totalCost
}

// Pre-save calculations
PreSaleItemSchema.pre('save', function(next) {
  const doc = this as PreSaleItem

  // Calculate derived fields
  doc.availableQuantity = doc.totalQuantity - doc.assignedQuantity
  doc.finalPricePerUnit = doc.basePricePerUnit * (1 + doc.markupPercentage / 100)
  doc.totalSaleAmount = doc.finalPricePerUnit * doc.totalQuantity
  doc.totalCostAmount = doc.basePricePerUnit * doc.totalQuantity
  doc.totalProfit = doc.totalSaleAmount - doc.totalCostAmount

  next()
})

export default mongoose.model<PreSaleItem>('PreSaleItem', PreSaleItemSchema)
