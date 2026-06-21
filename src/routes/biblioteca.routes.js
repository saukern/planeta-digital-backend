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
    fileSize: 10 * 1024 * 1024 // Limitar archivos a 10MB
  }
});

router.use(autenticarToken);

router.get('/', obtenerBiblioteca);
router.post('/subir', upload.single('archivo'), subirArchivoPersonal);
router.put('/archivo/:id', editarArchivo);
router.delete('/:id', eliminarDeBiblioteca);

export default router;
