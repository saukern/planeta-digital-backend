import { Router } from 'express'; //Sirve para enlazar rutas que pertenezcan a la misma categoria
import { registro } from '../controllers/auth.controller.js';

const router = Router();

router.post('/registro', registro);

export default router;
