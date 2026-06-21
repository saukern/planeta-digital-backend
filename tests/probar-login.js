import { login } from '../src/controllers/auth.controller.js';
import { prisma, pool } from '../src/config/db.js';
import bcrypt from 'bcryptjs';

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
    console.log('Probando controlador de inicio de sesión (Login)...');

    // 1. Limpiar base de datos primero
    await prisma.usuario.deleteMany({
      where: { correo: 'test_login@correo.com' }
    });

    // 2. Crear un usuario de prueba directamente en la base de datos
    const salt = await bcrypt.genSalt(10);
    const passwordEncriptado = await bcrypt.hash('mi_clave_secreta_123', salt);

    await prisma.usuario.create({
      data: {
        nombre_usuario: 'usuario_login_test',
        correo: 'test_login@correo.com',
        password: passwordEncriptado,
        proveedor: 'LOCAL',
        rol: 'USER',
        estado: 'ACTIVE'
      }
    });
    console.log('Usuario de prueba creado para el login.');

    // 3. Prueba 1: Login Exitoso
    console.log('\n--- Prueba 1: Login con credenciales válidas ---');
    const mockReqExitoso = {
      body: {
        correo: 'test_login@correo.com',
        password: 'mi_clave_secreta_123'
      }
    };
    const resExitoso = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; }
    };

    await login(mockReqExitoso, resExitoso);
    console.log('Resultado:', resExitoso.statusCode);
    console.log('Mensaje:', resExitoso.body.mensaje);
    console.log('Usuario devuelto:', resExitoso.body.usuario);
    console.log('JWT generado:', resExitoso.body.token ? 'Sí (Token presente)' : 'No');

    if (resExitoso.statusCode === 200 && resExitoso.body.token) {
      console.log('✔ ¡Prueba 1 exitosa!');
    } else {
      console.error('✘ Falló la prueba 1.');
    }

    // 4. Prueba 2: Contraseña Incorrecta
    console.log('\n--- Prueba 2: Login con contraseña incorrecta ---');
    const mockReqPasswordErroneo = {
      body: {
        correo: 'test_login@correo.com',
        password: 'clave_incorrecta'
      }
    };
    const resPasswordErroneo = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; }
    };

    await login(mockReqPasswordErroneo, resPasswordErroneo);
    console.log('Resultado esperado: 401 | Resultado obtenido:', resPasswordErroneo.statusCode);
    console.log('Mensaje de error:', resPasswordErroneo.body.error);

    if (resPasswordErroneo.statusCode === 401 && resPasswordErroneo.body.error === 'Credenciales incorrectas') {
      console.log('✔ ¡Prueba 2 exitosa! (Acceso denegado correctamente)');
    } else {
      console.error('✘ Falló la prueba 2.');
    }

    // 5. Limpieza
    await prisma.usuario.deleteMany({
      where: { correo: 'test_login@correo.com' }
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
