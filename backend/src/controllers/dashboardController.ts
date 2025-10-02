import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { HotWheelsCarModel } from '../models/HotWheelsCar';
import { InventoryItemModel } from '../models/InventoryItem';
import { SaleModel } from '../models/Sale';
import { DeliveryModel } from '../models/Delivery';
import Purchase from '../models/Purchase';

// Get dashboard metrics
export const getDashboardMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 Fetching dashboard metrics...');
    
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  Database not connected, returning default metrics');
      res.json({
        success: true,
        data: {
          totalInventoryValue: 0,
          totalInventoryItems: 0,
          totalQuantity: 0,
          totalCatalogCars: 0,
          uniqueSeries: 0,
          pendingSales: 0,
          pendingDeliveries: 0,
          pendingPurchases: 0,
          monthlyProfit: 0,
          totalProfit: 0,
          totalSales: 0,
          monthlySales: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          recentActivity: [
            {
              id: 'activity1',
              description: 'Sistema iniciado - base de datos desconectada',
              date: new Date(),
              type: 'system'
            }
          ]
        },
        message: 'Database disconnected - showing default values'
      });
      return;
    }
    
    // Get inventory stats
    console.log('📊 Getting inventory stats...');
    const totalInventoryItems = await InventoryItemModel.countDocuments();
    const totalQuantity = await InventoryItemModel.aggregate([
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    
    // Get catalog stats
    console.log('📚 Getting catalog stats...');
    const totalCatalogCars = await HotWheelsCarModel.countDocuments();
    
    // Get unique series count
    const uniqueSeries = await HotWheelsCarModel.distinct('series');
    
    // Calculate total value estimate
    console.log('💰 Calculating inventory value...');
    const inventoryValue = await InventoryItemModel.aggregate([
      { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$suggestedPrice'] } } } }
    ]);

    // Get sales metrics
    console.log('📈 Getting sales metrics...');
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const totalSales = await SaleModel.countDocuments();
    const monthlySales = await SaleModel.countDocuments({
      saleDate: { $gte: currentMonth }
    });

    const totalRevenue = await SaleModel.aggregate([
      { $group: { _id: null, total: { $sum: '$salePrice' } } }
    ]);

    const monthlyRevenue = await SaleModel.aggregate([
      { $match: { saleDate: { $gte: currentMonth } } },
      { $group: { _id: null, total: { $sum: '$salePrice' } } }
    ]);

    // Calculate profit (sale price - purchase price from inventory)
    // For now, we'll use a simple profit calculation - this could be enhanced later
    const totalProfit = totalRevenue[0]?.total || 0;
    const monthlyProfit = monthlyRevenue[0]?.total || 0;

    // Get delivery metrics
    console.log('� Getting delivery metrics...');
    const pendingDeliveries = await DeliveryModel.countDocuments({
      status: { $in: ['scheduled', 'prepared'] }
    });

    // Get today's deliveries
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const todaysDeliveries = await DeliveryModel.find({
      scheduledDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['scheduled', 'prepared'] }
    })
    .populate('customerId')
    .select('customerId location scheduledTime totalAmount items')
    .limit(5);

    // Get purchase metrics
    console.log('📦 Getting purchase metrics...');
    const pendingPurchases = await Purchase.countDocuments({
      status: { $in: ['pending', 'paid', 'shipped'] }
    });

    console.log('📋 Compiling dashboard data...');
    // Enhanced dashboard data with real metrics
    const dashboardData = {
      totalInventoryValue: inventoryValue[0]?.total || 0,
      totalInventoryItems,
      totalQuantity: totalQuantity[0]?.total || 0,
      totalCatalogCars,
      uniqueSeries: uniqueSeries.length,
      pendingSales: 0, // TODO: Implement when delivery system is ready
      pendingDeliveries,
      pendingPurchases,
      monthlyProfit,
      totalProfit,
      totalSales,
      monthlySales,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      todaysDeliveries: todaysDeliveries.map(delivery => ({
        id: delivery._id,
        customerName: (delivery.customerId as any)?.name || 'Cliente desconocido',
        location: delivery.location,
        scheduledTime: delivery.scheduledTime,
        totalAmount: delivery.totalAmount,
        itemCount: delivery.items?.length || 0
      })),
      recentActivity: [
        {
          id: 'activity1',
          description: `Base de datos cargada con ${totalCatalogCars} Hot Wheels`,
          date: new Date(),
          type: 'system'
        },
        ...(totalSales > 0 ? [{
          id: 'activity2',
          description: `${totalSales} venta${totalSales === 1 ? '' : 's'} registrada${totalSales === 1 ? '' : 's'}`,
          date: new Date(),
          type: 'sale'
        }] : [])
      ]
    };

    console.log('✅ Dashboard metrics fetched successfully');
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('❌ Error getting dashboard metrics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching dashboard metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get recent activity
export const getRecentActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get recently added inventory items
    const recentInventory = await InventoryItemModel.find()
      .sort({ dateAdded: -1 })
      .limit(5)
      .select('carId quantity condition dateAdded');

    // Transform to activity format
    const activities = recentInventory.map(item => ({
      id: item._id,
      type: 'inventory_added',
      description: `Added ${item.quantity} ${item.carId} (${item.condition}) to inventory`,
      date: item.dateAdded,
      icon: 'plus'
    }));

    // Add some sample activities if no real data
    if (activities.length === 0) {
      activities.push(
        {
          id: 'sample1',
          type: 'system',
          description: 'Hot Wheels database loaded with 9,891 cars',
          date: new Date(),
          icon: 'database'
        },
        {
          id: 'sample2', 
          type: 'system',
          description: 'Inventory system initialized',
          date: new Date(),
          icon: 'settings'
        }
      );
    }

    res.json({ activities });
  } catch (error) {
    console.error('Error getting recent activity:', error);
    res.status(500).json({ error: 'Error fetching recent activity' });
  }
};
