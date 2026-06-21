import { Router } from 'express'; //Sirve para enlazar rutas que pertenezcan a la misma categoria
import { registro, autenticacionGoogle } from '../controllers/auth.controller.js';

const router = Router();

router.post('/registro', registro);
router.post('/google', autenticacionGoogle);

export default router;
