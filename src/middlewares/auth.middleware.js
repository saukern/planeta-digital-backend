import jwt from 'jsonwebtoken';

export const autenticarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, usuarioDecodificado) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado.' });
    }

    req.usuario = usuarioDecodificado;
    return next();
  });
};
