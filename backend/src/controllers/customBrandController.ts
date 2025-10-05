import { Request, Response } from 'express';
import { CustomBrandModel } from '../models/CustomBrand';

// Get all custom brands
export const getCustomBrands = async (req: Request, res: Response): Promise<void> => {
  try {
    const brands = await CustomBrandModel.find().sort({ name: 1 });
    
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

    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        message: 'Brand name is required'
      });
      return;
    }

    // Check if brand already exists
    const existingBrand = await CustomBrandModel.findOne({ 
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

    const brand = await CustomBrandModel.findByIdAndDelete(id);

    if (!brand) {
      res.status(404).json({
        success: false,
        message: 'Brand not found'
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
