import { Request, Response } from 'express';
import { SupplierModel } from '../models/Supplier';

// Get all suppliers
export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'User ID not found in request'
      });
    }

    const suppliers = await SupplierModel.find({ userId }).sort({ name: 1 });

    res.json({
      success: true,
      data: suppliers,
      message: 'Suppliers retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener los proveedores'
    });
  }
};

// Get supplier by ID
export const getSupplierById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'User ID not found in request'
      });
    }

    const supplier = await SupplierModel.findOne({ _id: id, userId });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Proveedor no encontrado o no pertenece al usuario'
      });
    }

    res.json({
      success: true,
      data: supplier,
      message: 'Supplier retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener el proveedor'
    });
  }
};

// Create a new supplier
export const createSupplier = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, website, contactMethod, address, notes } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'User ID not found in request'
      });
    }

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'El nombre es requerido'
      });
    }

    // Check if supplier with same email already exists for this user
    if (email) {
      const existingSupplier = await SupplierModel.findOne({ email, userId });
      if (existingSupplier) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Ya existe un proveedor con este email'
        });
      }
    }

    const supplier = new SupplierModel({
      userId,
      name,
      email,
      phone,
      website,
      contactMethod: contactMethod || 'email',
      address,
      notes
    });

    await supplier.save();

    res.status(201).json({
      success: true,
      data: supplier,
      message: 'Proveedor creado exitosamente'
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al crear el proveedor'
    });
  }
};

// Update supplier
export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, website, contactMethod, address, notes } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'User ID not found in request'
      });
    }

    const supplier = await SupplierModel.findOne({ _id: id, userId });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Proveedor no encontrado o no pertenece al usuario'
      });
    }

    // Check if email is being changed and if it already exists for this user
    if (email && email !== supplier.email) {
      const existingSupplier = await SupplierModel.findOne({ email, userId });
      if (existingSupplier) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Ya existe un proveedor con este email'
        });
      }
    }

    supplier.name = name || supplier.name;
    supplier.email = email || supplier.email;
    supplier.phone = phone || supplier.phone;
    supplier.website = website || supplier.website;
    supplier.contactMethod = contactMethod || supplier.contactMethod;
    supplier.address = address || supplier.address;
    supplier.notes = notes || supplier.notes;

    await supplier.save();

    res.json({
      success: true,
      data: supplier,
      message: 'Proveedor actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al actualizar el proveedor'
    });
  }
};

// Delete supplier
export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'User ID not found in request'
      });
    }

    const supplier = await SupplierModel.findOne({ _id: id, userId });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Proveedor no encontrado o no pertenece al usuario'
      });
    }

    await SupplierModel.findOneAndDelete({ _id: id, userId });

    res.json({
      success: true,
      data: null,
      message: 'Proveedor eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al eliminar el proveedor'
    });
  }
};
