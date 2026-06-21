import { Router } from 'express'; //Sirve para enlazar rutas que pertenezcan a la misma categoria
import { registro, autenticacionGoogle, login, desactivarCuenta } from '../controllers/auth.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/registro', registro);
router.post('/google', autenticacionGoogle);
router.post('/login', login);
router.delete('/mi-cuenta', autenticarToken, desactivarCuenta);

export default router;
