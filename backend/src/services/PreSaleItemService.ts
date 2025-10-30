import PreSaleItem, { PreSaleItem as PreSaleItemType } from '../models/PreSaleItem'
import Purchase from '../models/Purchase'
import { HotWheelsCarModel } from '../models/HotWheelsCar'

/**
 * PreSaleItemService
 *
 * Manages pre-sale product aggregation, unit tracking, and assignment logic.
 * Handles:
 * - Creating pre-sale items from purchases
 * - Aggregating multiple purchases into single product
 * - Unit assignment to deliveries
 * - Quantity and pricing calculations
 * - Profit tracking
 */

class PreSaleItemService {
  /**
   * Create a new pre-sale item from a purchase
   * or add to existing pre-sale item if car already exists
   */
  async createOrUpdatePreSaleItem(
    purchaseId: string,
    carId: string,
    quantity: number,
    unitPrice: number,
    markupPercentage?: number,
    finalPrice?: number,
    photo?: string | null
  ): Promise<PreSaleItemType> {
    // Check if pre-sale item already exists for this car
    let preSaleItem = await PreSaleItem.findOne({ carId })

    if (preSaleItem) {
      // Add to existing pre-sale item
      preSaleItem.totalQuantity += quantity
      preSaleItem.availableQuantity = preSaleItem.totalQuantity - preSaleItem.assignedQuantity

      // Update purchase IDs if not already included
      if (!preSaleItem.purchaseIds.includes(purchaseId)) {
        preSaleItem.purchaseIds.push(purchaseId)
      }

      // If a custom finalPrice is provided, update it (takes precedence over markup)
      if (finalPrice && finalPrice > 0) {
        preSaleItem.finalPricePerUnit = finalPrice
        preSaleItem.markupPercentage = 
          preSaleItem.basePricePerUnit === 0 
            ? 0 
            : ((finalPrice - preSaleItem.basePricePerUnit) / preSaleItem.basePricePerUnit) * 100
      } else if (markupPercentage !== undefined && markupPercentage !== null) {
        // Update markup if provided
        preSaleItem.markupPercentage = markupPercentage
        preSaleItem.finalPricePerUnit = preSaleItem.basePricePerUnit * (1 + markupPercentage / 100)
      }

      // Update photo if provided
      if (photo) {
        preSaleItem.photo = photo
      }

      // Recalculate totals
      preSaleItem.totalSaleAmount = preSaleItem.finalPricePerUnit * preSaleItem.totalQuantity
      preSaleItem.totalCostAmount = preSaleItem.basePricePerUnit * preSaleItem.totalQuantity
      preSaleItem.totalProfit = preSaleItem.totalSaleAmount - preSaleItem.totalCostAmount
    } else {
      // Create new pre-sale item
      const defaultMarkup = markupPercentage ?? 15
      
      // Use provided finalPrice if available, otherwise calculate from markup
      let calculatedFinalPrice: number
      let calculatedMarkup: number
      
      if (finalPrice && finalPrice > 0) {
        calculatedFinalPrice = finalPrice
        // Recalculate markup percentage based on custom final price
        calculatedMarkup = unitPrice === 0 
          ? 0 
          : ((finalPrice - unitPrice) / unitPrice) * 100
      } else {
        calculatedMarkup = defaultMarkup
        calculatedFinalPrice = unitPrice * (1 + defaultMarkup / 100)
      }

      preSaleItem = new PreSaleItem({
        carId,
        totalQuantity: quantity,
        assignedQuantity: 0,
        availableQuantity: quantity,
        basePricePerUnit: unitPrice,
        markupPercentage: calculatedMarkup,
        finalPricePerUnit: calculatedFinalPrice,
        status: 'active',
        startDate: new Date(),
        purchaseIds: [purchaseId],
        units: [], // Empty until first assignment
        deliveryAssignments: [],
        totalSaleAmount: calculatedFinalPrice * quantity,
        totalCostAmount: unitPrice * quantity,
        totalProfit: calculatedFinalPrice * quantity - unitPrice * quantity,
        photo: photo || undefined
      })

      // Try to get car metadata
      try {
        const carData = await HotWheelsCarModel.findOne({ toy_num: carId })
        if (carData) {
          preSaleItem.carModel = (carData as any).carModel
          preSaleItem.brand = 'Hot Wheels' // Default brand
        }
      } catch (err) {
        // Car metadata not found, continue with basic data
      }
    }

    await preSaleItem.save()
    return preSaleItem
  }

  /**
   * Get all pre-sale items with filters
   */
  async getPreSaleItems(filters?: {
    status?: string
    carId?: string
    onlyActive?: boolean
  }): Promise<PreSaleItemType[]> {
    const query: any = {}

    if (filters?.status) {
      query.status = filters.status
    }

    if (filters?.carId) {
      query.carId = filters.carId
    }

    if (filters?.onlyActive !== undefined && filters.onlyActive) {
      query.status = 'active'
    }

    return PreSaleItem.find(query).sort({ startDate: -1 })
  }

  /**
   * Get a specific pre-sale item with all details
   */
  async getPreSaleItem(id: string): Promise<PreSaleItemType | null> {
    return PreSaleItem.findById(id)
  }

  /**
   * Get pre-sale item by car ID
   */
  async getPreSaleItemByCarId(carId: string): Promise<PreSaleItemType | null> {
    return PreSaleItem.findOne({ carId })
  }

  /**
   * Assign units to a delivery
   * Creates unit records and updates quantities
   */
  async assignUnitsToDelivery(
    preSaleItemId: string,
    deliveryId: string,
    quantity: number,
    purchaseId: string
  ): Promise<{ unitIds: string[]; preSaleItem: PreSaleItemType }> {
    const preSaleItem = await PreSaleItem.findById(preSaleItemId)

    if (!preSaleItem) {
      throw new Error(`PreSaleItem ${preSaleItemId} not found`)
    }

    if (!preSaleItem.canAssignUnits(quantity)) {
      throw new Error(
        `Cannot assign ${quantity} units. Only ${preSaleItem.getAvailableQuantity()} available`
      )
    }

    const unitIds: string[] = []

    // Assign each unit individually
    for (let i = 0; i < quantity; i++) {
      const unitId = preSaleItem.assignUnit(deliveryId, purchaseId)
      unitIds.push(unitId)
    }

    await preSaleItem.save()

    return {
      unitIds,
      preSaleItem
    }
  }

  /**
   * Unassign units from a delivery
   */
  async unassignUnitsFromDelivery(
    preSaleItemId: string,
    unitIds: string[]
  ): Promise<PreSaleItemType> {
    const preSaleItem = await PreSaleItem.findById(preSaleItemId)

    if (!preSaleItem) {
      throw new Error(`PreSaleItem ${preSaleItemId} not found`)
    }

    for (const unitId of unitIds) {
      preSaleItem.unassignUnit(unitId)
    }

    await preSaleItem.save()

    return preSaleItem
  }

  /**
   * Update markup percentage and recalculate pricing
   */
  async updateMarkup(preSaleItemId: string, markupPercentage: number): Promise<PreSaleItemType> {
    const preSaleItem = await PreSaleItem.findById(preSaleItemId)

    if (!preSaleItem) {
      throw new Error(`PreSaleItem ${preSaleItemId} not found`)
    }

    if (markupPercentage < 0 || markupPercentage > 100) {
      throw new Error('Markup percentage must be between 0 and 100')
    }

    preSaleItem.markupPercentage = markupPercentage
    preSaleItem.finalPricePerUnit = preSaleItem.basePricePerUnit * (1 + markupPercentage / 100)
    preSaleItem.totalSaleAmount = preSaleItem.finalPricePerUnit * preSaleItem.totalQuantity
    preSaleItem.totalProfit = preSaleItem.totalSaleAmount - preSaleItem.totalCostAmount

    await preSaleItem.save()

    return preSaleItem
  }

  /**
   * Update final price per unit and recalculate derived values
   */
  async updateFinalPrice(preSaleItemId: string, finalPrice: number): Promise<PreSaleItemType> {
    const preSaleItem = await PreSaleItem.findById(preSaleItemId)

    if (!preSaleItem) {
      throw new Error(`PreSaleItem ${preSaleItemId} not found`)
    }

    if (finalPrice < 0) {
      throw new Error('Final price cannot be negative')
    }

    if (finalPrice < preSaleItem.basePricePerUnit) {
      throw new Error('Final price cannot be less than the base price')
    }

    preSaleItem.finalPricePerUnit = finalPrice
    // Recalculate markup percentage based on new final price
    preSaleItem.markupPercentage = 
      preSaleItem.basePricePerUnit === 0 
        ? 0 
        : ((finalPrice - preSaleItem.basePricePerUnit) / preSaleItem.basePricePerUnit) * 100

    preSaleItem.totalSaleAmount = preSaleItem.finalPricePerUnit * preSaleItem.totalQuantity
    preSaleItem.totalProfit = preSaleItem.totalSaleAmount - preSaleItem.totalCostAmount

    await preSaleItem.save()

    return preSaleItem
  }
  async getUnitsForDelivery(
    preSaleItemId: string,
    deliveryId: string
  ): Promise<any[]> {
    const preSaleItem = await PreSaleItem.findById(preSaleItemId)

    if (!preSaleItem) {
      throw new Error(`PreSaleItem ${preSaleItemId} not found`)
    }

    return preSaleItem.getUnitsForDelivery(deliveryId)
  }

  /**
   * Get profit analytics for pre-sale item
   */
  async getProfitAnalytics(preSaleItemId: string): Promise<{
    totalQuantity: number
    assignedQuantity: number
    availableQuantity: number
    basePricePerUnit: number
    finalPricePerUnit: number
    markupPercentage: number
    totalCostAmount: number
    totalSaleAmount: number
    totalProfit: number
    profitPerUnit: number
    profitMargin: number
  }> {
    const preSaleItem = await PreSaleItem.findById(preSaleItemId)

    if (!preSaleItem) {
      throw new Error(`PreSaleItem ${preSaleItemId} not found`)
    }

    const profitPerUnit = preSaleItem.finalPricePerUnit - preSaleItem.basePricePerUnit
    const profitMargin =
      (preSaleItem.totalProfit / preSaleItem.totalSaleAmount) * 100

    return {
      totalQuantity: preSaleItem.totalQuantity,
      assignedQuantity: preSaleItem.assignedQuantity,
      availableQuantity: preSaleItem.getAvailableQuantity(),
      basePricePerUnit: preSaleItem.basePricePerUnit,
      finalPricePerUnit: preSaleItem.finalPricePerUnit,
      markupPercentage: preSaleItem.markupPercentage,
      totalCostAmount: preSaleItem.totalCostAmount,
      totalSaleAmount: preSaleItem.totalSaleAmount,
      totalProfit: preSaleItem.totalProfit,
      profitPerUnit,
      profitMargin
    }
  }

  /**
   * Update pre-sale item status
   */
  async updateStatus(
    preSaleItemId: string,
    status: 'purchased' | 'shipped' | 'received' | 'reserved' | 'payment-plan' | 'payment-pending' | 'ready' | 'delivered' | 'cancelled'
  ): Promise<PreSaleItemType> {
    const preSaleItem = await PreSaleItem.findById(preSaleItemId)

    if (!preSaleItem) {
      throw new Error(`PreSaleItem ${preSaleItemId} not found`)
    }

    preSaleItem.status = status

    if (status === 'delivered' || status === 'cancelled') {
      preSaleItem.endDate = new Date()
    }

    await preSaleItem.save()

    return preSaleItem
  }

  /**
   * Update pre-sale item photo
   */
  async updatePhoto(
    preSaleItemId: string,
    photo: string
  ): Promise<PreSaleItemType> {
    const preSaleItem = await PreSaleItem.findById(preSaleItemId)

    if (!preSaleItem) {
      throw new Error(`PreSaleItem ${preSaleItemId} not found`)
    }

    preSaleItem.photo = photo
    await preSaleItem.save()

    return preSaleItem
  }

  /**
   * Get summary statistics for all active pre-sales
   */
  async getActiveSalesSummary(): Promise<{
    totalActiveItems: number
    totalQuantityAvailable: number
    totalQuantityAssigned: number
    totalPotentialRevenue: number
    totalCostAmount: number
    totalPotentialProfit: number
    averageMarkupPercentage: number
  }> {
    const activeItems = await PreSaleItem.find({ status: 'active' })

    let totalQuantityAvailable = 0
    let totalQuantityAssigned = 0
    let totalPotentialRevenue = 0
    let totalCostAmount = 0
    let totalPotentialProfit = 0
    let totalMarkup = 0

    activeItems.forEach((item) => {
      totalQuantityAvailable += item.getAvailableQuantity()
      totalQuantityAssigned += item.assignedQuantity
      totalPotentialRevenue += item.totalSaleAmount
      totalCostAmount += item.totalCostAmount
      totalPotentialProfit += item.totalProfit
      totalMarkup += item.markupPercentage
    })

    const averageMarkup = activeItems.length > 0 ? totalMarkup / activeItems.length : 0

    return {
      totalActiveItems: activeItems.length,
      totalQuantityAvailable,
      totalQuantityAssigned,
      totalPotentialRevenue,
      totalCostAmount,
      totalPotentialProfit,
      averageMarkupPercentage: averageMarkup
    }
  }

  /**
   * Cancel a pre-sale item and unassign all units
   */
  async cancelPreSaleItem(preSaleItemId: string): Promise<PreSaleItemType> {
    const preSaleItem = await PreSaleItem.findById(preSaleItemId)

    if (!preSaleItem) {
      throw new Error(`PreSaleItem ${preSaleItemId} not found`)
    }

    // Clear all unit assignments
    preSaleItem.units = []
    preSaleItem.assignedQuantity = 0
    preSaleItem.availableQuantity = preSaleItem.totalQuantity
    preSaleItem.deliveryAssignments = []
    preSaleItem.status = 'cancelled'
    preSaleItem.endDate = new Date()

    await preSaleItem.save()

    return preSaleItem
  }
}

export default new PreSaleItemService()
