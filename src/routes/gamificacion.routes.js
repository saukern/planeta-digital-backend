import { Router } from 'express';
import { establecerMeta, obtenerMeta } from '../controllers/gamificacion.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(autenticarToken);

router.post('/meta', establecerMeta);
router.get('/meta', obtenerMeta);
router.get('/meta/:anio', obtenerMeta);

export default router;
