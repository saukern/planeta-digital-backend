import { autenticarToken } from '../src/middlewares/auth.middleware.js';
import jwt from 'jsonwebtoken';

const mockRes = {
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    this.body = data;
    return this;
  }
};

async function test() {
  console.log('Probando middleware de autenticación (autenticarToken)...');

  const usuarioPrueba = { id: 1, nombre_usuario: 'saukern', rol: 'USER' };
  const tokenValido = jwt.sign(usuarioPrueba, process.env.JWT_SECRET, { expiresIn: '1h' });
  const tokenInvalido = 'un_token_falso_y_mal_formado';

  // Prueba 1: Petición con Token Válido
  console.log('\n--- Prueba 1: Petición con Token Válido ---');
  let nextLlamado = false;
  const mockReqValida = {
    headers: {
      authorization: `Bearer ${tokenValido}`
    }
  };
  const mockResValida = { ...mockRes };

  autenticarToken(mockReqValida, mockResValida, () => {
    nextLlamado = true;
  });

  console.log('¿Se llamó a next()?:', nextLlamado);
  console.log('Usuario decodificado en req.usuario:', mockReqValida.usuario);

  if (nextLlamado && mockReqValida.usuario.nombre_usuario === 'saukern') {
    console.log('✔ ¡Prueba 1 exitosa! (El usuario pasó el filtro)');
  } else {
    console.error('✘ Falló la prueba 1.');
  }

  // Prueba 2: Petición sin Token
  console.log('\n--- Prueba 2: Petición sin Token ---');
  let nextLlamadoSinToken = false;
  const mockReqSinToken = {
    headers: {}
  };
  const mockResSinToken = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
  };

  autenticarToken(mockReqSinToken, mockResSinToken, () => {
    nextLlamadoSinToken = true;
  });

  console.log('Resultado esperado: 401 | Resultado obtenido:', mockResSinToken.statusCode);
  console.log('Error devuelto:', mockResSinToken.body.error);
  console.log('¿Se llamó a next()?:', nextLlamadoSinToken);

  if (mockResSinToken.statusCode === 401 && !nextLlamadoSinToken) {
    console.log('✔ ¡Prueba 2 exitosa! (Se bloqueó el acceso correctamente)');
  } else {
    console.error('✘ Falló la prueba 2.');
  }

  // Prueba 3: Petición con Token Inválido
  console.log('\n--- Prueba 3: Petición con Token Inválido ---');
  let nextLlamadoTokenInvalido = false;
  const mockReqTokenInvalido = {
    headers: {
      authorization: `Bearer ${tokenInvalido}`
    }
  };
  const mockResTokenInvalido = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
  };

  autenticarToken(mockReqTokenInvalido, mockResTokenInvalido, () => {
    nextLlamadoTokenInvalido = true;
  });

  console.log('Resultado esperado: 403 | Resultado obtenido:', mockResTokenInvalido.statusCode);
  console.log('Error devuelto:', mockResTokenInvalido.body.error);
  console.log('¿Se llamó a next()?:', nextLlamadoTokenInvalido);

  if (mockResTokenInvalido.statusCode === 403 && !nextLlamadoTokenInvalido) {
    console.log('✔ ¡Prueba 3 exitosa! (Se rechazó el token inválido correctamente)');
  } else {
    console.error('✘ Falló la prueba 3.');
  }
}

test();
