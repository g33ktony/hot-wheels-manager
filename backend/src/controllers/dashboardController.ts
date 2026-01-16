import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { HotWheelsCarModel } from '../models/HotWheelsCar';
import { InventoryItemModel } from '../models/InventoryItem';
import { SaleModel } from '../models/Sale';
import { DeliveryModel } from '../models/Delivery';
import Purchase from '../models/Purchase';
import { RecentActivity } from '../shared/types';

// Helper function to get recent activity data
async function getRecentActivityData(totalCatalogCars: number, totalSales: number): Promise<RecentActivity[]> {
  console.log('📋 Getting recent activity...');
  const recentActivity: RecentActivity[] = [];

  // Recent deliveries (completed)
  const recentDeliveries = await DeliveryModel.find({ status: 'completed' })
    .populate('customerId')
    .sort({ updatedAt: -1 })
    .limit(3)
    .select('customerId totalAmount completedDate updatedAt');

  recentDeliveries.forEach(delivery => {
    recentActivity.push({
      id: `delivery-${delivery._id}`,
      type: 'delivery',
      description: `Entrega completada para ${(delivery.customerId as any)?.name || 'cliente'}`,
      date: delivery.completedDate || delivery.updatedAt,
      amount: delivery.totalAmount,
      resourceId: delivery._id?.toString()
    });
  });

  // Recent purchases
  const recentPurchases = await Purchase.find()
    .populate('supplierId')
    .sort({ purchaseDate: -1 })
    .limit(3)
    .select('supplierId totalCost purchaseDate items');

  recentPurchases.forEach(purchase => {
    recentActivity.push({
      id: `purchase-${purchase._id}`,
      type: 'purchase',
      description: `Compra realizada de ${purchase.items?.length || 0} items`,
      date: purchase.purchaseDate,
      amount: purchase.totalCost,
      resourceId: purchase._id?.toString()
    });
  });

  // Recent inventory additions
  const recentInventory = await InventoryItemModel.find()
    .sort({ dateAdded: -1 })
    .limit(2)
    .select('carId quantity dateAdded');

  recentInventory.forEach(item => {
    recentActivity.push({
      id: `inventory-${item._id}`,
      type: 'inventory',
      description: `${item.quantity} ${item.carId} agregado${item.quantity > 1 ? 's' : ''} al inventario`,
      date: item.dateAdded,
      resourceId: item._id?.toString()
    });
  });

  // Recent sales (only direct sales, not from deliveries to avoid duplication)
  const recentSales = await SaleModel.find({ deliveryId: { $exists: false } })
    .sort({ saleDate: -1 })
    .limit(3)
    .select('totalAmount saleDate items');

  recentSales.forEach(sale => {
    recentActivity.push({
      id: `sale-${sale._id}`,
      type: 'sale',
      description: `Venta directa de ${sale.items?.length || 0} items`,
      date: sale.saleDate,
      amount: sale.totalAmount,
      resourceId: sale._id?.toString()
    });
  });

  // Sort all activities by date and take the most recent ones
  recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const limitedActivity = recentActivity.slice(0, 5);

  // Add system activity if no other activities exist
  if (limitedActivity.length === 0) {
    limitedActivity.push({
      id: 'system-1',
      type: 'system',
      description: `Base de datos cargada con ${totalCatalogCars} Hot Wheels`,
      date: new Date()
    });
  }

  return limitedActivity;
}

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
          dailyRevenue: 0,
          unpaidDeliveries: 0,
          itemsToPrepare: 0,
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
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const monthlyRevenue = await SaleModel.aggregate([
      { $match: { saleDate: { $gte: currentMonth } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Calculate daily revenue from all sources
    console.log('💸 Calculating daily revenue...');
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Daily revenue from completed sales (POS)
    const dailySalesRevenue = await SaleModel.aggregate([
      { 
        $match: { 
          saleDate: { $gte: startOfToday, $lte: endOfToday },
          status: 'completed'
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Daily revenue from delivery payments made today
    const dailyDeliveryPayments = await DeliveryModel.aggregate([
      {
        $match: {
          'paymentHistory.date': { $gte: startOfToday, $lte: endOfToday }
        }
      },
      { $unwind: '$paymentHistory' },
      {
        $match: {
          'paymentHistory.date': { $gte: startOfToday, $lte: endOfToday }
        }
      },
      { $group: { _id: null, total: { $sum: '$paymentHistory.amount' } } }
    ]);

    const dailyRevenue = (dailySalesRevenue[0]?.total || 0) + (dailyDeliveryPayments[0]?.total || 0);

    // Calculate REAL profit by looking up purchase prices from inventory
    console.log('💵 Calculating profits...');
    
    // Get all sales with their items and populate inventory data
    const allSales = await SaleModel.find({ status: 'completed' })
      .populate({
        path: 'items.inventoryItemId',
        select: 'purchasePrice'
      });

    const monthlySalesData = await SaleModel.find({
      status: 'completed',
      saleDate: { $gte: currentMonth }
    }).populate({
      path: 'items.inventoryItemId',
      select: 'purchasePrice'
    });

    // Calculate total profit
    let totalProfit = 0;
    allSales.forEach(sale => {
      sale.items.forEach((item: any) => {
        const salePrice = item.unitPrice * item.quantity;
        const purchasePrice = (item.inventoryItemId?.purchasePrice || 0) * item.quantity;
        totalProfit += (salePrice - purchasePrice);
      });
    });

    // Calculate monthly profit
    let monthlyProfit = 0;
    monthlySalesData.forEach(sale => {
      sale.items.forEach((item: any) => {
        const salePrice = item.unitPrice * item.quantity;
        const purchasePrice = (item.inventoryItemId?.purchasePrice || 0) * item.quantity;
        monthlyProfit += (salePrice - purchasePrice);
      });
    });

    // Get delivery metrics
    console.log('� Getting delivery metrics...');
    const pendingDeliveries = await DeliveryModel.countDocuments({
      status: { $in: ['scheduled', 'prepared'] }
    });
    // Get unpaid deliveries (pending or partial payment)
    const unpaidDeliveries = await DeliveryModel.countDocuments({
      paymentStatus: { $in: ['pending', 'partial'] }
    });

    // Get items to prepare (scheduled deliveries that are not yet prepared)
    const itemsToPrepare = await DeliveryModel.aggregate([
      { $match: { status: 'scheduled' } },
      { $unwind: '$items' },
      { $group: { _id: null, total: { $sum: '$items.quantity' } } }
    ]);
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
      dailyRevenue,
      unpaidDeliveries,
      itemsToPrepare: itemsToPrepare[0]?.total || 0,
      todaysDeliveries: todaysDeliveries.map(delivery => ({
        id: delivery._id,
        customerName: (delivery.customerId as any)?.name || 'Cliente desconocido',
        location: delivery.location,
        scheduledTime: delivery.scheduledTime,
        totalAmount: delivery.totalAmount,
        itemCount: delivery.items?.length || 0
      })),
      recentActivity: await getRecentActivityData(totalCatalogCars, totalSales)
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
