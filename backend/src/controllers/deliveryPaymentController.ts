import { Request, Response } from 'express'
import { DeliveryModel } from '../models/Delivery'

/**
 * Add a payment to a delivery
 */
export const addPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { amount, paymentMethod, notes } = req.body

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'El monto del pago debe ser mayor a 0' 
      })
    }

    // Find delivery
    const delivery = await DeliveryModel.findById(id)
    if (!delivery) {
      return res.status(404).json({ 
        success: false, 
        message: 'Entrega no encontrada' 
      })
    }

    // Check if payment exceeds remaining amount
    const remainingAmount = delivery.totalAmount - delivery.paidAmount
    if (amount > remainingAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `El monto del pago ($${amount}) excede el monto pendiente ($${remainingAmount.toFixed(2)})` 
      })
    }

    // Add payment
    delivery.payments.push({
      amount,
      paymentDate: new Date(),
      paymentMethod: paymentMethod || 'cash',
      notes
    } as any)

    // Update paid amount
    delivery.paidAmount += amount

    // Update payment status
    if (delivery.paidAmount >= delivery.totalAmount) {
      delivery.paymentStatus = 'paid'
    } else if (delivery.paidAmount > 0) {
      delivery.paymentStatus = 'partial'
    } else {
      delivery.paymentStatus = 'pending'
    }

    await delivery.save()

    res.json({ 
      success: true, 
      message: 'Pago registrado exitosamente',
      data: delivery 
    })
  } catch (error) {
    console.error('Error adding payment:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al registrar el pago',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Delete a payment from a delivery
 */
export const deletePayment = async (req: Request, res: Response) => {
  try {
    const { id, paymentId } = req.params

    // Find delivery
    const delivery = await DeliveryModel.findById(id)
    if (!delivery) {
      return res.status(404).json({ 
        success: false, 
        message: 'Entrega no encontrada' 
      })
    }

    // Find payment
    const paymentIndex = delivery.payments.findIndex(p => p._id?.toString() === paymentId)
    if (paymentIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pago no encontrado' 
      })
    }

    const payment = delivery.payments[paymentIndex]

    // Update paid amount
    delivery.paidAmount -= payment.amount

    // Remove payment
    delivery.payments.splice(paymentIndex, 1)

    // Update payment status
    if (delivery.paidAmount >= delivery.totalAmount) {
      delivery.paymentStatus = 'paid'
    } else if (delivery.paidAmount > 0) {
      delivery.paymentStatus = 'partial'
    } else {
      delivery.paymentStatus = 'pending'
    }

    await delivery.save()

    res.json({ 
      success: true, 
      message: 'Pago eliminado exitosamente',
      data: delivery 
    })
  } catch (error) {
    console.error('Error deleting payment:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar el pago',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Get payment history for a delivery
 */
export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const delivery = await DeliveryModel.findById(id)
    if (!delivery) {
      return res.status(404).json({ 
        success: false, 
        message: 'Entrega no encontrada' 
      })
    }

    res.json({ 
      success: true, 
      data: {
        totalAmount: delivery.totalAmount,
        paidAmount: delivery.paidAmount,
        remainingAmount: delivery.totalAmount - delivery.paidAmount,
        paymentStatus: delivery.paymentStatus,
        payments: delivery.payments
      }
    })
  } catch (error) {
    console.error('Error getting payment history:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener el historial de pagos',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
