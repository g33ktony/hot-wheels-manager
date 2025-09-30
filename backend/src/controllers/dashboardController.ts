import { Request, Response } from 'express';
import { HotWheelsCarModel } from '../models/HotWheelsCar';
import { InventoryItemModel } from '../models/InventoryItem';
import { SaleModel } from '../models/Sale';

// Get dashboard metrics
export const getDashboardMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get inventory stats
    const totalInventoryItems = await InventoryItemModel.countDocuments();
    const totalQuantity = await InventoryItemModel.aggregate([
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    
    // Get catalog stats
    const totalCatalogCars = await HotWheelsCarModel.countDocuments();
    
    // Get unique series count
    const uniqueSeries = await HotWheelsCarModel.distinct('series');
    
    // Calculate total value estimate
    const inventoryValue = await InventoryItemModel.aggregate([
      { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$suggestedPrice'] } } } }
    ]);

    // Get sales metrics
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

    // Mock data for missing features (will be implemented later)
    const dashboardData = {
      totalInventoryValue: inventoryValue[0]?.total || 0,
      totalInventoryItems,
      totalQuantity: totalQuantity[0]?.total || 0,
      totalCatalogCars,
      uniqueSeries: uniqueSeries.length,
      pendingSales: 0, // TODO: Implement when delivery system is ready
      pendingDeliveries: 0, // TODO: Implement delivery tracking
      pendingPurchases: 0, // TODO: Implement purchase tracking
      monthlyProfit,
      totalProfit,
      totalSales,
      monthlySales,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
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

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching dashboard metrics' 
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
