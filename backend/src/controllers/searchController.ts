import { Request, Response } from 'express';
import { SaleModel } from '../models/Sale';
import { DeliveryModel } from '../models/Delivery';
import { InventoryItemModel } from '../models/InventoryItem';
import { CustomerModel } from '../models/Customer';

interface SearchResult {
  _id: string;
  type: 'sale' | 'delivery' | 'inventory' | 'customer' | 'preventa';
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  metadata?: any;
  inStock?: boolean;
  date?: Date;
}

export const globalSearch = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.json({
        success: true,
        data: [],
        message: 'Query must be at least 2 characters'
      });
    }

    const searchTerm = query.trim();
    const searchRegex = { $regex: searchTerm, $options: 'i' };
    const results: SearchResult[] = [];

    // 1. Buscar en VENTAS COMPLETADAS
    const sales = await SaleModel.find({
      status: 'completed',
      $or: [
        { 'customer.name': searchRegex },
        { 'items.carName': searchRegex },
        { 'notes': searchRegex }
      ]
    })
      .populate({
        path: 'items.inventoryItemId',
        select: 'brand carName'
      })
      .populate('customerId', 'name email')
      .limit(10);

    for (const sale of sales) {
      // Encontrar qué items coinciden
      const matchingItems = sale.items.filter((item: any) => {
        const inventory = item.inventoryItemId as any;
        return (
          item.carName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inventory?.carName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inventory?.brand?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });

      const customerData = sale.customerId as any;
      const customerName = customerData?.name || 'Cliente POS';

      if (matchingItems.length > 0 || customerName.toLowerCase().includes(searchTerm.toLowerCase())) {
        // Calcular profit: suma de (unitPrice - costPrice) * quantity para cada item
        const totalProfit = sale.items.reduce((sum: number, item: any) => {
          // Si el item ya tiene profit calculado, usarlo
          if (item.profit && item.profit > 0) {
            return sum + item.profit;
          }
          // Si no, calcular basado en costPrice
          const costPrice = item.costPrice || 0;
          const itemProfit = (item.unitPrice - costPrice) * item.quantity;
          return sum + (itemProfit || 0);
        }, 0);

        results.push({
          _id: (sale._id as any).toString(),
          type: 'sale',
          title: `Venta a ${customerName}`,
          subtitle: `$${sale.totalAmount.toFixed(2)} - ${sale.items.length} piezas`,
          description: matchingItems.map(i => (i as any).carName || i.carId).join(', '),
          metadata: {
            totalAmount: sale.totalAmount,
            profit: totalProfit,
            itemsCount: sale.items.length,
            saleType: sale.saleType,
            paymentMethod: sale.paymentMethod
          },
          date: sale.saleDate
        });
      }
    }

    // 2. Buscar en ENTREGAS
    const deliveries = await DeliveryModel.find({
      status: { $in: ['scheduled', 'prepared', 'completed'] },
      $or: [
        { 'customer.name': searchRegex },
        { 'customer.email': searchRegex },
        { 'items.carName': searchRegex },
        { 'location': searchRegex }
      ]
    })
      .populate('customerId', 'name email phone')
      .populate({
        path: 'items.inventoryItemId',
        select: 'brand carName'
      })
      .limit(10);

    for (const delivery of deliveries) {
      const customerData = delivery.customerId as any;
      const customerName = customerData?.name || 'Cliente';
      
      const matchingItems = delivery.items.filter((item: any) => {
        const inventory = item.inventoryItemId as any;
        return (
          item.carName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inventory?.carName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inventory?.brand?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });

      if (matchingItems.length > 0 || customerName.toLowerCase().includes(searchTerm.toLowerCase())) {
        results.push({
          _id: (delivery._id as any).toString(),
          type: 'delivery',
          title: `Entrega a ${customerName}`,
          subtitle: `Estado: ${delivery.status} - ${delivery.items.length} piezas`,
          description: delivery.location || 'Sin ubicación',
          metadata: {
            status: delivery.status,
            customerEmail: customerData?.email,
            customerPhone: customerData?.phone,
            itemsCount: delivery.items.length,
            location: delivery.location
          },
          date: delivery.createdAt
        });
      }
    }

    // 3. Buscar en INVENTARIO
    const inventoryItems = await InventoryItemModel.find({
      $or: [
        { 'carName': searchRegex },
        { 'carId': searchRegex },
        { 'brand': searchRegex },
        { 'pieceType': searchRegex }
      ]
    })
      .limit(20);

    for (const item of inventoryItems) {
      results.push({
        _id: (item._id as any).toString(),
        type: 'inventory',
        title: (item as any).carName || item.carId,
        subtitle: `${item.brand} - ${item.pieceType}`,
        description: `Precio: $${item.actualPrice || item.suggestedPrice} | Stock: ${item.quantity}`,
        inStock: item.quantity > 0,
        metadata: {
          quantity: item.quantity,
          actualPrice: item.actualPrice,
          suggestedPrice: item.suggestedPrice,
          brand: item.brand,
          pieceType: item.pieceType,
          purchasePrice: item.purchasePrice,
          carId: item.carId,
          photos: item.photos
        }
      });
    }

    // 4. Buscar en CLIENTES
    const customers = await CustomerModel.find({
      $or: [
        { 'name': searchRegex },
        { 'email': searchRegex },
        { 'phone': searchRegex }
      ]
    })
      .limit(10);

    for (const customer of customers) {
      // Calculate totalSpent and totalOrders for this customer
      const customerDeliveries = await DeliveryModel.find({
        customerId: customer._id
      });

      const customerSales = await SaleModel.find({
        customerId: customer._id,
        status: 'completed'
      });

      let totalSpent = 0;
      let totalOrders = customerDeliveries.length + customerSales.length;

      // Sum delivery amounts
      customerDeliveries.forEach((d: any) => {
        totalSpent += d.totalAmount || 0;
      });

      // Sum sale amounts
      customerSales.forEach((s: any) => {
        totalSpent += s.totalAmount || 0;
      });

      results.push({
        _id: (customer._id as any).toString(),
        type: 'customer',
        title: customer.name,
        subtitle: customer.email || customer.phone,
        description: customer.address || 'Sin dirección',
        metadata: {
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          totalSpent: totalSpent,
          totalOrders: totalOrders
        }
      });
    }

    // 5. Buscar en ENTREGAS - ITEMS PENDIENTES (PREVENTAS)
    const preventaItems = await DeliveryModel.find({
      status: { $in: ['scheduled', 'prepared'] },
      'items.carName': searchRegex,
      preSaleStatus: { $exists: true }
    })
      .populate('customerId', 'name email')
      .populate({
        path: 'items.inventoryItemId',
        select: 'brand carName'
      })
      .limit(10);

    for (const delivery of preventaItems) {
      const customerData = delivery.customerId as any;
      const customerName = customerData?.name || 'Cliente';

      const matchingItems = delivery.items.filter((item: any) => {
        const inventory = item.inventoryItemId as any;
        return (
          item.carName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inventory?.carName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });

      if (matchingItems.length > 0) {
        for (const item of matchingItems) {
          results.push({
            _id: `${delivery._id}-${item.carId}`,
            type: 'preventa',
            title: `Preventa: ${item.carName || item.carId}`,
            subtitle: `Cliente: ${customerName}`,
            description: `Cantidad: ${item.quantity} | Estado: ${delivery.preSaleStatus || delivery.status}`,
            metadata: {
              deliveryId: delivery._id,
              itemCarId: item.carId,
              customerName: customerName,
              quantity: item.quantity,
              status: delivery.status
            },
            date: delivery.createdAt
          });
        }
      }
    }

    // Ordenar por relevancia (exactas primero, luego por fecha)
    const sorted = results.sort((a, b) => {
      const aExact = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ? 0 : 1;
      const bExact = b.title.toLowerCase().includes(searchTerm.toLowerCase()) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    });

    res.json({
      success: true,
      data: sorted.slice(0, 50), // Limitar a 50 resultados
      message: `${sorted.length} resultados encontrados`
    });
  } catch (error) {
    console.error('Error en búsqueda global:', error);
    res.status(500).json({
      success: false,
      data: [],
      message: 'Error al realizar la búsqueda'
    });
  }
};
