import { Router } from 'express'
import * as customersController from '../controllers/customersController'
import { tenantContext } from '../middleware/tenant'

const router = Router()

// Apply tenant context middleware to all routes
router.use(tenantContext)

// GET /api/customers - Get all customers
router.get('/', customersController.getCustomers)

// GET /api/customers/:id - Get customer by ID
router.get('/:id', customersController.getCustomerById)

// POST /api/customers - Create a new customer
router.post('/', customersController.createCustomer)

// PUT /api/customers/:id - Update customer
router.put('/:id', customersController.updateCustomer)

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', customersController.deleteCustomer)

export default router
