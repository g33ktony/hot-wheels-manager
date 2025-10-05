import express from 'express';
import { getCustomBrands, createCustomBrand, deleteCustomBrand } from '../controllers/customBrandController';

const router = express.Router();

router.get('/', getCustomBrands);
router.post('/', createCustomBrand);
router.delete('/:id', deleteCustomBrand);

export default router;
