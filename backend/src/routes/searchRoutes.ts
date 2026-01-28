import { Router } from 'express';
import { globalSearch } from '../controllers/searchController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Búsqueda global
router.get('/', authMiddleware, globalSearch);

export default router;
