import { Router } from 'express';
import multer from 'multer';
import {
	subirArchivoPersonal,
	obtenerBiblioteca,
	editarArchivo,
	eliminarDeBiblioteca
} from '../controllers/biblioteca.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';

const router = Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 30 * 1024 * 1024
	}
});

router.use(autenticarToken);

router.get('/', obtenerBiblioteca);
router.post('/subir', upload.fields([
	{ name: 'archivo', maxCount: 1 },
	{ name: 'portada', maxCount: 1 }
]), subirArchivoPersonal);
router.put('/archivo/:id', editarArchivo);
router.delete('/:id', eliminarDeBiblioteca);

export default router;
