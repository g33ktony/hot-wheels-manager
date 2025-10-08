import { Request, Response } from 'express';
import { CustomBrandModel } from '../models/CustomBrand';

// Get all custom brands
export const getCustomBrands = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User ID not found in request'
      });
      return;
    }

    const brands = await CustomBrandModel.find({ userId }).sort({ name: 1 });
    
    res.json({
      success: true,
      data: brands
    });
  } catch (error) {
    console.error('Error fetching custom brands:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching custom brands',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create a new custom brand
export const createCustomBrand = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User ID not found in request'
      });
      return;
    }

    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        message: 'Brand name is required'
      });
      return;
    }

    // Check if brand already exists for this user
    const existingBrand = await CustomBrandModel.findOne({ 
      userId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingBrand) {
      // Return existing brand instead of error
      res.json({
        success: true,
        data: existingBrand,
        message: 'Brand already exists'
      });
      return;
    }

    const brand = new CustomBrandModel({
      userId,
      name: name.trim()
    });

    await brand.save();

    res.status(201).json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error('Error creating custom brand:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating custom brand',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete a custom brand
export const deleteCustomBrand = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User ID not found in request'
      });
      return;
    }

    const brand = await CustomBrandModel.findOneAndDelete({ _id: id, userId });

    if (!brand) {
      res.status(404).json({
        success: false,
        message: 'Brand not found or does not belong to user'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Brand deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting custom brand:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting custom brand',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
