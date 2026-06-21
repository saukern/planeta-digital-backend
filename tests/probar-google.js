import { autenticacionGoogle } from '../src/controllers/auth.controller.js';
import { prisma, pool } from '../src/config/db.js';
import { OAuth2Client } from 'google-auth-library';

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
  try {
    console.log('Probando controlador de autenticación Google con mockeo...');

    OAuth2Client.prototype.verifyIdToken = async function({ idToken }) {
      if (idToken === 'un_token_invalido') {
        throw new Error('Invalid token signature');
      }
      return {
        getPayload() {
          return {
            email: 'usuario_google_test@gmail.com',
            name: 'Kevin Test Google',
            given_name: 'Kevin',
            sub: '12345678901234567890'
          };
        }
      };
    };

    await prisma.usuario.deleteMany({
      where: { correo: 'usuario_google_test@gmail.com' }
    });

    const mockReq = {
      body: {
        idToken: 'un_token_valido_mockeado'
      }
    };

    console.log('\n--- Probando Registro de nuevo usuario con Google ---');
    await autenticacionGoogle(mockReq, mockRes);
    console.log('Resultado del servidor:', mockRes.statusCode);
    console.log('Mensaje:', mockRes.body.mensaje);
    console.log('Usuario creado:', mockRes.body.usuario);
    console.log('JWT generado:', mockRes.body.token);

    if (mockRes.statusCode === 200 && mockRes.body.usuario.proveedor === 'GOOGLE') {
      console.log('✔ ¡Registro con Google exitoso!');
    } else {
      console.error('✘ Falló la prueba de registro.');
    }

    console.log('\n--- Probando Login de usuario existente con Google ---');
    const mockResLogin = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; }
    };
    await autenticacionGoogle(mockReq, mockResLogin);
    console.log('Resultado del servidor:', mockResLogin.statusCode);
    console.log('Mensaje:', mockResLogin.body.mensaje);
    console.log('Usuario logueado ID:', mockResLogin.body.usuario.id);

    if (mockResLogin.statusCode === 200 && mockResLogin.body.usuario.id === mockRes.body.usuario.id) {
      console.log('✔ ¡Login con Google exitoso!');
    } else {
      console.error('✘ Falló la prueba de login.');
    }

    await prisma.usuario.deleteMany({
      where: { correo: 'usuario_google_test@gmail.com' }
    });
    console.log('\nBase de datos limpia.');

  } catch (err) {
    console.error('Error en test:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
