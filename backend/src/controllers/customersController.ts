import { Request, Response } from 'express';
import { CustomerModel } from '../models/Customer';

// Get all customers
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await CustomerModel.find().sort({ name: 1 });

    res.json({
      success: true,
      data: customers,
      message: 'Customers retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener los clientes'
    });
  }
};

// Get customer by ID
export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await CustomerModel.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: customer,
      message: 'Customer retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener el cliente'
    });
  }
};

// Create a new customer
export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, contactMethod, address, notes } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'El nombre es requerido'
      });
    }

    // Check if customer with same email already exists
    if (email) {
      const existingCustomer = await CustomerModel.findOne({ email });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Ya existe un cliente con este email'
        });
      }
    }

    const customer = new CustomerModel({
      name,
      email,
      phone,
      contactMethod: contactMethod || 'email',
      address,
      notes
    });

    await customer.save();

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Cliente creado exitosamente'
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al crear el cliente'
    });
  }
};

// Update customer
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, contactMethod, address, notes } = req.body;

    const customer = await CustomerModel.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Cliente no encontrado'
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== customer.email) {
      const existingCustomer = await CustomerModel.findOne({ email });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Ya existe un cliente con este email'
        });
      }
    }

    customer.name = name || customer.name;
    customer.email = email || customer.email;
    customer.phone = phone || customer.phone;
    customer.contactMethod = contactMethod || customer.contactMethod;
    customer.address = address || customer.address;
    customer.notes = notes || customer.notes;

    await customer.save();

    res.json({
      success: true,
      data: customer,
      message: 'Cliente actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al actualizar el cliente'
    });
  }
};

// Delete customer
export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const customer = await CustomerModel.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Cliente no encontrado'
      });
    }

    await CustomerModel.findByIdAndDelete(id);

    res.json({
      success: true,
      data: null,
      message: 'Cliente eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al eliminar el cliente'
    });
  }
};
