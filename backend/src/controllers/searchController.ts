import { Request, Response } from 'express';
import { SaleModel } from '../models/Sale';
import { DeliveryModel } from '../models/Delivery';
import { InventoryItemModel } from '../models/InventoryItem';
import { CustomerModel } from '../models/Customer';
import * as fs from 'fs';
import * as path from 'path';
import { getAllCars, fuzzyMatchCar } from '../services/hotWheelsCacheService';

interface SearchResult {
  _id: string;
  type: 'sale' | 'delivery' | 'inventory' | 'customer' | 'preventa' | 'catalog';
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
      .limit(50);

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
      // Only count completed sales (which represent actual money spent)
      // Don't count deliveries because when a delivery is completed, it creates a sale
      const customerSales = await SaleModel.find({
        customerId: customer._id,
        status: 'completed'
      });

      let totalSpent = 0;
      let totalOrders = customerSales.length;

      // Sum only completed sale amounts
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

    // 6. Buscar en CATÁLOGO HOT WHEELS (usando cache local en memoria)
    try {
      const allCars = getAllCars();
      const searchLower = searchTerm.toLowerCase();
      
      let count = 0;
      for (const car of allCars) {
        if (count >= 100) break; // Max 100 catalog results
        
        // Quick substring check first
        const model = (car.carModel || car.model || '').toLowerCase();
        const series = (car.series || '').toLowerCase();
        const year = (car.year || '').toString();
        const color = (car.color || '').toLowerCase();
        
        const matches = model.includes(searchLower) || 
                       series.includes(searchLower) || 
                       year.includes(searchLower) || 
                       color.includes(searchLower);
        
        if (matches) {
          // Verificar si este car ya está en el inventario
          const existsInInventory = await InventoryItemModel.findOne({
            carName: car.carModel || car.model
          });

          // Solo mostrar si NO está en el inventario
          if (!existsInInventory) {
            const catalogResult: SearchResult = {
              _id: `catalog-${car.carModel || car.model}-${count}`,
              type: 'catalog',
              title: car.carModel || car.model || '',
              subtitle: `${car.year} - ${car.series}`,
              description: `Año: ${car.year}${car.color ? ` | Color: ${car.color}` : ''}`,
              metadata: {
                model: car.carModel || car.model,
                year: car.year,
                series: car.series,
                color: car.color,
                photoUrl: car.photo_url,
                tampo: car.tampo,
                wheelType: car.wheel_type,
                carMake: car.car_make
              },
              inStock: false // Catálogo items no están en stock
            };
            results.push(catalogResult);
            count++;
          }
        }
      }
    } catch (error) {
      console.error('Error loading catalog from cache:', error);
      // Continuar sin resultados de catálogo si hay error
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
      data: sorted.slice(0, 200), // Aumentado de 50 a 200 resultados
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

export const predictiveSearch = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const limit = Math.min(parseInt((req.query.limit as string) || '10'), 10);

    if (!q || typeof q !== 'string' || q.trim().length < 3) {
      return res.json({
        success: true,
        data: [],
        message: 'Query must be at least 3 characters'
      });
    }

    const searchTerm = q.trim();
    const searchRegex = { $regex: searchTerm, $options: 'i' };
    const results: any[] = [];

    // 1. Inventario
    const inventoryItems = await InventoryItemModel.find({
      $or: [
        { 'carName': searchRegex },
        { 'carId': searchRegex },
        { 'brand': searchRegex },
        { 'location': searchRegex }
      ]
    })
      .select('carId carName brand suggestedPrice photos quantity')
      .limit(limit);

    for (const item of inventoryItems) {
      results.push({
        id: (item._id as any).toString(),
        type: 'inventory',
        name: item.carName || item.carId || 'Item sin nombre',
        price: item.suggestedPrice,
        photoUrl: item.photos?.[0],
        extra: `${item.brand} - Stock: ${item.quantity}`
      });
    }

    // 2. Ventas
    const sales = await SaleModel.find({
      status: 'completed',
      $or: [
        { 'customer.name': searchRegex },
        { 'items.carName': searchRegex }
      ]
    })
      .select('customerId totalAmount items saleDate')
      .limit(limit);

    for (const sale of sales) {
      const customerData = sale.customerId as any;
      const customerName = customerData?.name || 'Cliente POS';
      
      results.push({
        id: (sale._id as any).toString(),
        type: 'sale',
        name: `Venta a ${customerName}`,
        price: sale.totalAmount,
        extra: `${sale.items.length} pieza${sale.items.length !== 1 ? 's' : ''}`
      });
    }

    // 3. Entregas
    const deliveries = await DeliveryModel.find({
      status: { $in: ['scheduled', 'prepared', 'completed'] },
      $or: [
        { 'customer.name': searchRegex },
        { 'items.carName': searchRegex }
      ]
    })
      .select('customerId status items location')
      .limit(limit);

    for (const delivery of deliveries) {
      const customerData = delivery.customerId as any;
      const customerName = customerData?.name || 'Cliente';
      
      results.push({
        id: (delivery._id as any).toString(),
        type: 'delivery',
        name: `Entrega a ${customerName}`,
        extra: `Estado: ${delivery.status}`
      });
    }

    // 4. Clientes
    const customers = await CustomerModel.find({
      $or: [
        { 'name': searchRegex },
        { 'email': searchRegex },
        { 'phone': searchRegex }
      ]
    })
      .select('name email phone')
      .limit(limit);

    for (const customer of customers) {
      results.push({
        id: (customer._id as any).toString(),
        type: 'customer',
        name: customer.name,
        extra: customer.email || customer.phone || 'Cliente'
      });
    }

    // Return top results by type (balanced)
    const finalResults = results.slice(0, limit);

    return res.json({
      success: true,
      data: finalResults,
      message: 'Predictive search results'
    });
  } catch (error) {
    console.error('Error en búsqueda predictiva:', error);
    res.status(500).json({
      success: false,
      data: [],
      message: 'Error al realizar la búsqueda predictiva'
    });
  }
};
