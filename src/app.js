import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.routes.js';
import bibliotecaRouter from './routes/biblioteca.routes.js';
import logrosRouter from './routes/logros.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/biblioteca', bibliotecaRouter);
app.use('/api/logros', logrosRouter);

app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor de Constelación de Libros activo' });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
