import express from 'express';
import { getCustomBrands, createCustomBrand, deleteCustomBrand } from '../controllers/customBrandController';
import { tenantContext } from '../middleware/tenant';

const router = express.Router();

// Apply tenant context middleware to all routes
router.use(tenantContext);

router.get('/', getCustomBrands);
router.post('/', createCustomBrand);
router.delete('/:id', deleteCustomBrand);

export default router;
