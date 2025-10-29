# Pre-Sale System - Code Examples & Implementation Guide

## Backend Implementation Examples

### 1. Database Models

#### 1.1 Update Purchase Model

```typescript
// backend/src/models/Purchase.ts

import mongoose, { Document, Schema } from 'mongoose'

export interface IPurchase extends Document {
  items: PurchaseItem[];
  supplierId: mongoose.Types.ObjectId;
  totalCost: number;
  shippingCost: number;
  trackingNumber?: string;
  purchaseDate: Date;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  status: 'pending' | 'paid' | 'shipped' | 'received' | 'cancelled';
  notes?: string;
  isReceived: boolean;
  receivedDate?: Date;
  
  // NEW: Pre-sale fields
  isPresale?: boolean;
  preSaleScheduledDate?: Date;  // Expected release date if coming-soon
  preSaleStatus?: 'coming-soon' | 'purchased' | 'shipped' | 'received' | 'archived';
  
  createdAt: Date;
  updatedAt: Date;
}

interface PurchaseItem {
  carId: string;
  quantity: number;
  unitPrice: number;
  condition: 'mint' | 'good' | 'fair' | 'poor';
  brand?: string;
  pieceType?: 'basic' | 'premium' | 'rlc';
  photos?: string[];
  notes?: string;
}

const PurchaseItemSchema = new Schema<PurchaseItem>({
  carId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  condition: { type: String, enum: ['mint', 'good', 'fair', 'poor'], required: true },
  brand: String,
  pieceType: { type: String, enum: ['basic', 'premium', 'rlc'] },
  photos: [String],
  notes: String
})

const PurchaseSchema = new Schema<IPurchase>(
  {
    items: [PurchaseItemSchema],
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    totalCost: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    trackingNumber: String,
    purchaseDate: { type: Date, required: true },
    estimatedDelivery: Date,
    actualDelivery: Date,
    status: {
      type: String,
      enum: ['pending', 'paid', 'shipped', 'received', 'cancelled'],
      default: 'pending'
    },
    notes: String,
    isReceived: { type: Boolean, default: false },
    receivedDate: Date,
    
    // NEW: Pre-sale fields
    isPresale: { type: Boolean, default: false },
    preSaleScheduledDate: Date,
    preSaleStatus: {
      type: String,
      enum: ['coming-soon', 'purchased', 'shipped', 'received', 'archived'],
      default: 'coming-soon'
    }
  },
  { timestamps: true }
)

// Add validation
PurchaseSchema.pre('save', function(next) {
  // If isPresale is true, ensure preSaleStatus exists
  if (this.isPresale && !this.preSaleStatus) {
    this.preSaleStatus = 'coming-soon'
  }
  next()
})

export const Purchase = mongoose.model<IPurchase>('Purchase', PurchaseSchema)
```

#### 1.2 Create PreSaleItem Model

```typescript
// backend/src/models/PreSaleItem.ts

import mongoose, { Document, Schema } from 'mongoose'

export interface DeliveryAssignment {
  deliveryId: mongoose.Types.ObjectId;
  quantity: number;
  units: Array<{
    unitId: string;
    status: 'assigned' | 'pending-delivery' | 'delivered';
  }>;
}

export interface IPreSaleItem extends Document {
  carId: string;
  linkedPurchaseIds: mongoose.Types.ObjectId[];
  
  totalQuantity: number;
  assignedQuantity: number;
  availableQuantity: number;
  
  preSaleStatus: 'coming-soon' | 'purchased' | 'shipped' | 'received' | 'archived';
  scheduledDate?: Date;
  purchasedDate: Date;
  shippedDate?: Date;
  receivedDate?: Date;
  archivedDate?: Date;
  
  purchasePrice: number;
  baseSalePrice: number;
  defaultMarkupPercentage: number;
  suggestedSalePrice: number;
  customSalePrice?: number;
  finalSalePrice: number;
  
  deliveryAssignments: DeliveryAssignment[];
  
  brand?: string;
  pieceType?: 'basic' | 'premium' | 'rlc';
  condition: 'mint' | 'good' | 'fair' | 'poor';
  photos?: string[];
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  getAvailableQuantity(): number;
  recalculatePricing(markupPercentage: number): void;
  addDeliveryAssignment(deliveryId: mongoose.Types.ObjectId, quantity: number): void;
  removeDeliveryAssignment(deliveryId: mongoose.Types.ObjectId): void;
}

const DeliveryAssignmentSchema = new Schema<DeliveryAssignment>({
  deliveryId: { type: Schema.Types.ObjectId, ref: 'Delivery', required: true },
  quantity: { type: Number, required: true, min: 1 },
  units: [{
    unitId: { type: String, required: true },
    status: {
      type: String,
      enum: ['assigned', 'pending-delivery', 'delivered'],
      default: 'assigned'
    }
  }]
}, { _id: false })

const PreSaleItemSchema = new Schema<IPreSaleItem>(
  {
    carId: { type: String, required: true, index: true },
    linkedPurchaseIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Purchase',
      required: true
    },
    
    totalQuantity: { type: Number, required: true, min: 0 },
    assignedQuantity: { type: Number, default: 0, min: 0 },
    availableQuantity: { type: Number, required: true, min: 0 },
    
    preSaleStatus: {
      type: String,
      enum: ['coming-soon', 'purchased', 'shipped', 'received', 'archived'],
      default: 'coming-soon',
      index: true
    },
    scheduledDate: Date,
    purchasedDate: { type: Date, required: true },
    shippedDate: Date,
    receivedDate: Date,
    archivedDate: Date,
    
    purchasePrice: { type: Number, required: true },
    baseSalePrice: { type: Number, required: true },
    defaultMarkupPercentage: { type: Number, default: 15 },
    suggestedSalePrice: { type: Number, required: true },
    customSalePrice: Number,
    finalSalePrice: { type: Number, required: true },
    
    deliveryAssignments: [DeliveryAssignmentSchema],
    
    brand: String,
    pieceType: { type: String, enum: ['basic', 'premium', 'rlc'] },
    condition: { type: String, enum: ['mint', 'good', 'fair', 'poor'] },
    photos: [String]
  },
  { timestamps: true }
)

// Methods
PreSaleItemSchema.methods.getAvailableQuantity = function() {
  return this.totalQuantity - this.assignedQuantity
}

PreSaleItemSchema.methods.recalculatePricing = function(markupPercentage: number) {
  this.defaultMarkupPercentage = markupPercentage
  this.suggestedSalePrice = this.baseSalePrice * (1 + (markupPercentage / 100))
  this.finalSalePrice = this.customSalePrice || this.suggestedSalePrice
}

PreSaleItemSchema.methods.addDeliveryAssignment = function(
  deliveryId: mongoose.Types.ObjectId,
  quantity: number
) {
  // Generate unique unit IDs
  const newUnits = Array.from({ length: quantity }, (_, i) => ({
    unitId: `${this._id}-unit-${Date.now()}-${i}`,
    status: 'assigned' as const
  }))
  
  this.deliveryAssignments.push({
    deliveryId,
    quantity,
    units: newUnits
  })
  
  this.assignedQuantity += quantity
  this.availableQuantity = this.totalQuantity - this.assignedQuantity
}

PreSaleItemSchema.methods.removeDeliveryAssignment = function(deliveryId: mongoose.Types.ObjectId) {
  const assignment = this.deliveryAssignments.find(
    a => a.deliveryId.toString() === deliveryId.toString()
  )
  if (assignment) {
    this.assignedQuantity -= assignment.quantity
    this.availableQuantity = this.totalQuantity - this.assignedQuantity
    this.deliveryAssignments = this.deliveryAssignments.filter(
      a => a.deliveryId.toString() !== deliveryId.toString()
    )
  }
}

export const PreSaleItem = mongoose.model<IPreSaleItem>('PreSaleItem', PreSaleItemSchema)
```

#### 1.3 Create PreSalePaymentPlan Model

```typescript
// backend/src/models/PreSalePaymentPlan.ts

import mongoose, { Document, Schema } from 'mongoose'

export interface PreSalePayment {
  _id?: mongoose.Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'cash' | 'transfer' | 'card' | 'other';
  notes?: string;
  createdAt: Date;
}

export interface IPreSalePaymentPlan extends Document {
  deliveryId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  preSaleItemId: mongoose.Types.ObjectId;
  
  totalAmount: number;
  numberOfPayments: number;
  firstPaymentDate: Date;
  limitDate: Date;
  fixedPaymentAmount: number;
  
  paidAmount: number;
  remainingBalance: number;
  nextDueDate?: Date;
  payments: PreSalePayment[];
  
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  recordPayment(amount: number, method: string, notes?: string): void;
  calculateNextDueDate(): Date;
  checkIfOverdue(): boolean;
  getPaymentSummary(): any;
}

const PreSalePaymentSchema = new Schema<PreSalePayment>({
  amount: { type: Number, required: true, min: 0 },
  paymentDate: { type: Date, required: true },
  paymentMethod: {
    type: String,
    enum: ['cash', 'transfer', 'card', 'other'],
    required: true
  },
  notes: String,
  createdAt: { type: Date, default: Date.now }
})

const PreSalePaymentPlanSchema = new Schema<IPreSalePaymentPlan>(
  {
    deliveryId: { type: Schema.Types.ObjectId, ref: 'Delivery', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    preSaleItemId: { type: Schema.Types.ObjectId, ref: 'PreSaleItem', required: true },
    
    totalAmount: { type: Number, required: true, min: 0 },
    numberOfPayments: { type: Number, required: true, min: 1 },
    firstPaymentDate: { type: Date, required: true },
    limitDate: { type: Date, required: true },
    fixedPaymentAmount: { type: Number, required: true, min: 0 },
    
    paidAmount: { type: Number, default: 0, min: 0 },
    remainingBalance: { type: Number, required: true, min: 0 },
    nextDueDate: Date,
    payments: [PreSalePaymentSchema],
    
    status: {
      type: String,
      enum: ['active', 'completed', 'overdue', 'cancelled'],
      default: 'active'
    },
    notes: String
  },
  { timestamps: true }
)

// Methods
PreSalePaymentPlanSchema.methods.recordPayment = function(
  amount: number,
  method: string,
  notes?: string
) {
  if (amount <= 0) throw new Error('Payment amount must be positive')
  if (this.status === 'completed') throw new Error('Payment plan already completed')
  
  // Record payment
  this.payments.push({
    amount,
    paymentDate: new Date(),
    paymentMethod: method as any,
    notes,
    createdAt: new Date()
  })
  
  // Update totals
  this.paidAmount += amount
  this.remainingBalance = Math.max(0, this.totalAmount - this.paidAmount)
  
  // Check if completed
  if (this.remainingBalance <= 0) {
    this.status = 'completed'
    this.nextDueDate = undefined
  } else {
    // Calculate next due date
    this.nextDueDate = this.calculateNextDueDate()
  }
  
  // Check if overdue
  if (this.checkIfOverdue() && this.status !== 'completed') {
    this.status = 'overdue'
  }
}

PreSalePaymentPlanSchema.methods.calculateNextDueDate = function(): Date {
  // Find number of payments made
  const paymentsMade = this.payments.length
  
  // Calculate days between first and next payment
  // Assuming equal intervals between payments
  const totalDays = Math.floor(
    (this.limitDate.getTime() - this.firstPaymentDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  const daysBetweenPayments = Math.floor(totalDays / (this.numberOfPayments - 1))
  
  // Calculate next due date
  const nextDue = new Date(this.firstPaymentDate)
  nextDue.setDate(nextDue.getDate() + daysBetweenPayments * (paymentsMade + 1))
  
  return nextDue
}

PreSalePaymentPlanSchema.methods.checkIfOverdue = function(): boolean {
  return new Date() > this.limitDate && this.remainingBalance > 0
}

PreSalePaymentPlanSchema.methods.getPaymentSummary = function() {
  return {
    totalAmount: this.totalAmount,
    paidAmount: this.paidAmount,
    remainingBalance: this.remainingBalance,
    numberOfPayments: this.numberOfPayments,
    paymentsMade: this.payments.length,
    paymentsRemaining: this.numberOfPayments - this.payments.length,
    fixedPaymentAmount: this.fixedPaymentAmount,
    nextDueDate: this.nextDueDate,
    isOverdue: this.checkIfOverdue(),
    status: this.status
  }
}

export const PreSalePaymentPlan = mongoose.model<IPreSalePaymentPlan>(
  'PreSalePaymentPlan',
  PreSalePaymentPlanSchema
)
```

---

### 2. Backend Services

#### 2.1 PreSaleItemService

```typescript
// backend/src/services/PreSaleItemService.ts

import { PreSaleItem, IPreSaleItem } from '../models/PreSaleItem'
import { Purchase } from '../models/Purchase'
import mongoose from 'mongoose'

export class PreSaleItemService {
  /**
   * Create or update pre-sale item when purchase is received
   */
  static async createOrUpdatePreSaleItem(
    purchaseId: string | mongoose.Types.ObjectId,
    defaultMarkupPercentage: number = 15
  ): Promise<IPreSaleItem[]> {
    try {
      const purchase = await Purchase.findById(purchaseId)
      if (!purchase) throw new Error('Purchase not found')
      if (!purchase.isPresale) throw new Error('Purchase is not marked as pre-sale')

      const createdItems: IPreSaleItem[] = []

      for (const item of purchase.items) {
        // Find existing pre-sale item or create new
        let preSaleItem = await PreSaleItem.findOne({ carId: item.carId })

        if (!preSaleItem) {
          // Create new pre-sale item
          preSaleItem = new PreSaleItem({
            carId: item.carId,
            linkedPurchaseIds: [purchase._id],
            totalQuantity: item.quantity,
            assignedQuantity: 0,
            availableQuantity: item.quantity,
            purchasePrice: item.unitPrice,
            baseSalePrice: item.unitPrice,
            defaultMarkupPercentage,
            suggestedSalePrice: item.unitPrice * (1 + defaultMarkupPercentage / 100),
            finalSalePrice: item.unitPrice * (1 + defaultMarkupPercentage / 100),
            preSaleStatus: purchase.preSaleStatus || 'coming-soon',
            purchasedDate: new Date(),
            scheduledDate: purchase.preSaleScheduledDate,
            brand: item.brand,
            pieceType: item.pieceType,
            condition: item.condition,
            photos: item.photos
          })
        } else {
          // Update existing item
          if (!preSaleItem.linkedPurchaseIds.includes(purchase._id)) {
            preSaleItem.linkedPurchaseIds.push(purchase._id)
          }

          // Recalculate totals
          preSaleItem.totalQuantity += item.quantity
          preSaleItem.availableQuantity = 
            preSaleItem.totalQuantity - preSaleItem.assignedQuantity

          // Recalculate pricing (weighted average)
          const oldCost = preSaleItem.purchasePrice * (preSaleItem.totalQuantity - item.quantity)
          const newCost = oldCost + item.unitPrice * item.quantity
          preSaleItem.purchasePrice = newCost / preSaleItem.totalQuantity
          preSaleItem.baseSalePrice = preSaleItem.purchasePrice
          
          preSaleItem.recalculatePricing(defaultMarkupPercentage)
        }

        await preSaleItem.save()
        createdItems.push(preSaleItem)
      }

      return createdItems
    } catch (error) {
      console.error('Error creating/updating pre-sale item:', error)
      throw error
    }
  }

  /**
   * Get pre-sale item with full details
   */
  static async getPreSaleItem(id: string | mongoose.Types.ObjectId): Promise<IPreSaleItem | null> {
    return PreSaleItem.findById(id)
      .populate('linkedPurchaseIds')
      .populate('deliveryAssignments.deliveryId')
  }

  /**
   * List pre-sale items with pagination and filters
   */
  static async listPreSaleItems(
    filters: any = {},
    sort: any = { createdAt: -1 },
    page: number = 1,
    limit: number = 20
  ): Promise<{ items: IPreSaleItem[]; total: number; pages: number }> {
    const skip = (page - 1) * limit

    const query: any = {}
    if (filters.status) query.preSaleStatus = filters.status
    if (filters.archived === false) query.archivedDate = { $exists: false }
    if (filters.archived === true) query.archivedDate = { $exists: true }
    if (filters.hasAvailable === true) query.availableQuantity = { $gt: 0 }

    const total = await PreSaleItem.countDocuments(query)
    const items = await PreSaleItem.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('linkedPurchaseIds')

    return {
      items,
      total,
      pages: Math.ceil(total / limit)
    }
  }

  /**
   * Update pre-sale item status
   */
  static async updatePreSaleItemStatus(
    id: string | mongoose.Types.ObjectId,
    newStatus: string,
    statusDate: Date = new Date()
  ): Promise<IPreSaleItem | null> {
    const preSaleItem = await PreSaleItem.findById(id)
    if (!preSaleItem) throw new Error('Pre-sale item not found')

    preSaleItem.preSaleStatus = newStatus as any
    
    // Update status dates
    switch (newStatus) {
      case 'purchased':
        preSaleItem.purchasedDate = statusDate
        break
      case 'shipped':
        preSaleItem.shippedDate = statusDate
        break
      case 'received':
        preSaleItem.receivedDate = statusDate
        break
      case 'archived':
        preSaleItem.archivedDate = statusDate
        break
    }

    return preSaleItem.save()
  }

  /**
   * Update pre-sale item pricing
   */
  static async updatePreSaleItemPricing(
    id: string | mongoose.Types.ObjectId,
    markupPercentage?: number,
    customPrice?: number
  ): Promise<IPreSaleItem | null> {
    const preSaleItem = await PreSaleItem.findById(id)
    if (!preSaleItem) throw new Error('Pre-sale item not found')

    if (markupPercentage !== undefined) {
      preSaleItem.recalculatePricing(markupPercentage)
    }

    if (customPrice !== undefined) {
      preSaleItem.customSalePrice = customPrice
      preSaleItem.finalSalePrice = customPrice
    }

    return preSaleItem.save()
  }

  /**
   * Archive pre-sale item
   */
  static async archivePreSaleItem(
    id: string | mongoose.Types.ObjectId
  ): Promise<IPreSaleItem | null> {
    return this.updatePreSaleItemStatus(id, 'archived')
  }

  /**
   * Get deliveries for pre-sale item
   */
  static async getDeliveriesForItem(
    id: string | mongoose.Types.ObjectId
  ): Promise<any[]> {
    const preSaleItem = await PreSaleItem.findById(id)
      .populate({
        path: 'deliveryAssignments.deliveryId',
        populate: { path: 'customerId' }
      })

    if (!preSaleItem) throw new Error('Pre-sale item not found')

    return preSaleItem.deliveryAssignments.map(assignment => ({
      delivery: assignment.deliveryId,
      quantity: assignment.quantity,
      units: assignment.units
    }))
  }
}
```

---

### 3. Backend API Routes

#### 3.1 Pre-Sale Items Routes

```typescript
// backend/src/routes/presaleItems.ts

import express from 'express'
import { PreSaleItemService } from '../services/PreSaleItemService'

const router = express.Router()

// GET all pre-sale items
router.get('/', async (req, res) => {
  try {
    const { status, archived, hasAvailable, page = 1, limit = 20, sort = 'createdAt' } = req.query

    const filters: any = {}
    if (status) filters.status = status
    if (archived !== undefined) filters.archived = archived === 'true'
    if (hasAvailable !== undefined) filters.hasAvailable = hasAvailable === 'true'

    const sortObj: any = {}
    sortObj[sort as string] = -1

    const result = await PreSaleItemService.listPreSaleItems(
      filters,
      sortObj,
      parseInt(page as string),
      parseInt(limit as string)
    )

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

// GET single pre-sale item
router.get('/:id', async (req, res) => {
  try {
    const item = await PreSaleItemService.getPreSaleItem(req.params.id)
    if (!item) return res.status(404).json({ error: 'Pre-sale item not found' })
    res.json(item)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

// CREATE pre-sale item (triggered by purchase)
router.post('/', async (req, res) => {
  try {
    const { purchaseId, defaultMarkupPercentage = 15 } = req.body

    if (!purchaseId) {
      return res.status(400).json({ error: 'purchaseId is required' })
    }

    const items = await PreSaleItemService.createOrUpdatePreSaleItem(
      purchaseId,
      defaultMarkupPercentage
    )

    res.status(201).json(items)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

// UPDATE pre-sale item status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, statusDate } = req.body

    if (!status) {
      return res.status(400).json({ error: 'status is required' })
    }

    const item = await PreSaleItemService.updatePreSaleItemStatus(
      req.params.id,
      status,
      statusDate ? new Date(statusDate) : new Date()
    )

    res.json(item)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

// UPDATE pre-sale item pricing
router.patch('/:id/pricing', async (req, res) => {
  try {
    const { defaultMarkupPercentage, customSalePrice } = req.body

    const item = await PreSaleItemService.updatePreSaleItemPricing(
      req.params.id,
      defaultMarkupPercentage,
      customSalePrice
    )

    res.json(item)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

// ARCHIVE pre-sale item
router.post('/:id/archive', async (req, res) => {
  try {
    const item = await PreSaleItemService.archivePreSaleItem(req.params.id)
    res.json(item)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

// GET deliveries for item
router.get('/:id/deliveries', async (req, res) => {
  try {
    const deliveries = await PreSaleItemService.getDeliveriesForItem(req.params.id)
    res.json(deliveries)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

export default router
```

---

## Frontend Implementation Examples

### 4. Frontend Components

#### 4.1 Pre-Sale Dashboard Component

```typescript
// frontend/src/pages/PreSale.tsx

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PreSalePurchasesTab from '@/components/PreSale/PreSalePurchasesTab'
import PreSaleItemsTab from '@/components/PreSale/PreSaleItemsTab'

export default function PreSalePage() {
  const [activeTab, setActiveTab] = useState('items')

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Pre-Sale Management</h1>
        <p className="text-gray-600 mt-2">
          Manage pre-sale purchases, items, and payment plans
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="purchases">Pre-Sale Purchases</TabsTrigger>
          <TabsTrigger value="items">Items to Receive</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases">
          <PreSalePurchasesTab />
        </TabsContent>

        <TabsContent value="items">
          <PreSaleItemsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

#### 4.2 Pre-Sale Items Table Component

```typescript
// frontend/src/components/PreSale/PreSaleItemsTab.tsx

import React, { useState, useEffect } from 'react'
import { presaleService } from '@/services/presaleService'
import { Badge, Button, Input, Select } from '@/components/ui'
import PreSaleItemDetails from './PreSaleItemDetails'

interface PreSaleItem {
  _id: string
  carId: string
  totalQuantity: number
  assignedQuantity: number
  availableQuantity: number
  preSaleStatus: string
  finalSalePrice: number
  defaultMarkupPercentage: number
  photos?: string[]
}

export default function PreSaleItemsTab() {
  const [items, setItems] = useState<PreSaleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', archived: false })
  const [selectedItem, setSelectedItem] = useState<PreSaleItem | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    loadItems()
  }, [filters])

  const loadItems = async () => {
    try {
      setLoading(true)
      const result = await presaleService.getPreSaleItems(filters, { createdAt: -1 })
      setItems(result.items)
    } catch (error) {
      console.error('Error loading pre-sale items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (status: string) => {
    setFilters(prev => ({ ...prev, status }))
  }

  const handleViewDetails = (item: PreSaleItem) => {
    setSelectedItem(item)
    setShowDetails(true)
  }

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case 'coming-soon':
        return 'bg-blue-100 text-blue-800'
      case 'purchased':
        return 'bg-yellow-100 text-yellow-800'
      case 'shipped':
        return 'bg-purple-100 text-purple-800'
      case 'received':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="mb-6 flex gap-4">
        <Select value={filters.status} onValueChange={handleStatusChange}>
          <option value="">All Statuses</option>
          <option value="coming-soon">Coming Soon</option>
          <option value="purchased">Purchased</option>
          <option value="shipped">Shipped</option>
          <option value="received">Received</option>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-3 text-left">Product</th>
              <th className="border p-3 text-center">Qty</th>
              <th className="border p-3 text-center">Assigned</th>
              <th className="border p-3 text-center">Available</th>
              <th className="border p-3 text-center">Status</th>
              <th className="border p-3 text-right">Price</th>
              <th className="border p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="border p-3">
                  {item.photos && item.photos[0] && (
                    <img 
                      src={item.photos[0]} 
                      alt={item.carId}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <span className="ml-2 font-medium">{item.carId}</span>
                </td>
                <td className="border p-3 text-center font-semibold">
                  {item.totalQuantity}
                </td>
                <td className="border p-3 text-center">
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {item.assignedQuantity}
                  </Badge>
                </td>
                <td className="border p-3 text-center">
                  <Badge className="bg-green-100 text-green-800">
                    {item.availableQuantity}
                  </Badge>
                </td>
                <td className="border p-3 text-center">
                  <Badge className={statusBadgeColor(item.preSaleStatus)}>
                    {item.preSaleStatus}
                  </Badge>
                </td>
                <td className="border p-3 text-right font-semibold">
                  ${item.finalSalePrice.toFixed(2)}
                  <span className="text-sm text-gray-600 ml-2">
                    (+{item.defaultMarkupPercentage}%)
                  </span>
                </td>
                <td className="border p-3 text-center">
                  <Button 
                    onClick={() => handleViewDetails(item)}
                    className="text-sm"
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <PreSaleItemDetails 
          item={selectedItem} 
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  )
}
```

---

## Summary

This implementation provides:

1. **Full database schema** with all necessary models and relationships
2. **Complete business logic** for aggregation, payment plans, and quantity tracking
3. **Backend API endpoints** following REST conventions
4. **Frontend components** with proper state management
5. **Validation and error handling** throughout

Next steps:
1. Register the new routes in `backend/src/index.ts`
2. Test the backend endpoints with Postman/Thunder Client
3. Build and test frontend components incrementally
4. Implement remaining components following the same pattern

