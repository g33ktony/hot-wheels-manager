import { Router } from 'express';
import { globalSearch } from '../controllers/searchController';

const router = Router();

// Búsqueda global (requiere autenticación, manejada por middleware en index.ts)
router.get('/', globalSearch);

export default router;
