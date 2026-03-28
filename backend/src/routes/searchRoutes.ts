import { Router } from 'express';
import { globalSearch, predictiveSearch } from '../controllers/searchController';

const router = Router();

// Búsqueda global (requiere autenticación, manejada por middleware en index.ts)
router.get('/', globalSearch);

// Búsqueda predictiva (requiere autenticación)
router.get('/predictive', predictiveSearch);

export default router;
