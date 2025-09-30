import { Request, Response } from 'express';
import { InventoryItemModel } from '../models/InventoryItem';
import { HotWheelsCarModel } from '../models/HotWheelsCar';
import { IHotWheelsCar } from '../models/HotWheelsCar';

// Get inventory items
export const getInventoryItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // First check if we have any inventory items
    const inventoryCount = await InventoryItemModel.countDocuments();
    
    if (inventoryCount === 0) {
      // If no inventory, show some sample Hot Wheels from our catalog
      const sampleCars = await HotWheelsCarModel.find()
        .limit(limit)
        .skip(skip)
        .sort({ year: -1 });
      
      const total = await HotWheelsCarModel.countDocuments();
      
      // Transform catalog items to look like inventory items
      const inventoryItems = sampleCars.map((car: IHotWheelsCar) => ({
        _id: car._id,
        carId: car.toy_num,
        quantity: 0,
        reservedQuantity: 0,
        purchasePrice: 0,
        suggestedPrice: 5.00,
        condition: 'mint',
        notes: 'From catalog - not yet in inventory',
        dateAdded: new Date(),
        hotWheelsCar: {
          toy_num: car.toy_num,
          model: car.carModel,
          series: car.series,
          year: car.year,
          color: car.color,
          photo_url: car.photo_url
        }
      }));

      res.json({
        success: true,
        data: {
          items: inventoryItems,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: limit
          }
        },
        message: 'Showing catalog items (no inventory yet)'
      });
      return;
    }

    // Get actual inventory items
    const inventoryItems = await InventoryItemModel.find()
      .limit(limit)
      .skip(skip)
      .sort({ dateAdded: -1 });

    const total = await InventoryItemModel.countDocuments();

    res.json({
      success: true,
      data: {
        items: inventoryItems,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Error getting inventory items:', error);
    res.status(500).json({ error: 'Error fetching inventory items' });
  }
};

// Add inventory item
export const addInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { carId, quantity, purchasePrice, suggestedPrice, condition, notes } = req.body;

    // Validate required fields
    if (!carId || quantity === undefined || purchasePrice === undefined || suggestedPrice === undefined) {
      res.status(400).json({ 
        success: false,
        error: 'Missing required fields: carId, quantity, purchasePrice, suggestedPrice' 
      });
      return;
    }

    // Check if this car is already in inventory
    const existingItem = await InventoryItemModel.findOne({ carId });
    
    if (existingItem) {
      // Update existing item quantity
      existingItem.quantity += quantity;
      if (notes) {
        existingItem.notes = notes;
      }
      await existingItem.save();
      
      res.json({
        success: true,
        data: existingItem
      });
    } else {
      // Create new inventory item
      const inventoryItem = new InventoryItemModel({
        carId,
        quantity,
        purchasePrice,
        suggestedPrice,
        condition: condition || 'mint',
        notes: notes || '',
        dateAdded: new Date()
      });

      await inventoryItem.save();
      
      res.status(201).json({
        success: true,
        data: inventoryItem
      });
    }
  } catch (error) {
    console.error('Error adding inventory item:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error adding inventory item' 
    });
  }
};

// Update inventory item
export const updateInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const inventoryItem = await InventoryItemModel.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );

    if (!inventoryItem) {
      res.status(404).json({ 
        success: false,
        error: 'Inventory item not found' 
      });
      return;
    }

    res.json({
      success: true,
      data: inventoryItem
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error updating inventory item' 
    });
  }
};

// Delete inventory item
export const deleteInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const inventoryItem = await InventoryItemModel.findByIdAndDelete(id);

    if (!inventoryItem) {
      res.status(404).json({ 
        success: false,
        error: 'Inventory item not found' 
      });
      return;
    }

    res.json({ 
      success: true,
      message: 'Inventory item deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error deleting inventory item' 
    });
  }
};

// Search Hot Wheels catalog
export const searchHotWheelsCatalog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q: query, year, series, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const searchFilter: any = {};
    
    if (query) {
      searchFilter.$or = [
        { model: { $regex: query, $options: 'i' } },
        { series: { $regex: query, $options: 'i' } },
        { color: { $regex: query, $options: 'i' } },
        { toy_num: { $regex: query, $options: 'i' } }
      ];
    }
    
    if (year) {
      searchFilter.year = year as string;
    }
    
    if (series) {
      searchFilter.series = { $regex: series, $options: 'i' };
    }

    const cars = await HotWheelsCarModel.find(searchFilter)
      .limit(parseInt(limit as string))
      .skip(skip)
      .sort({ year: -1, model: 1 });

    const total = await HotWheelsCarModel.countDocuments(searchFilter);

    res.json({
      success: true,
      data: {
        cars,
        pagination: {
          currentPage: parseInt(page as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
          totalItems: total,
          itemsPerPage: parseInt(limit as string)
        }
      }
    });
  } catch (error) {
    console.error('Error searching catalog:', error);
    res.status(500).json({ error: 'Error searching Hot Wheels catalog' });
  }
};
