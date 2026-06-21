import express from 'express';
import authRouter from './routes/auth.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/auth', authRouter);

app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor de Constelación de Libros activo' });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
