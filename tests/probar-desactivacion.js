import { desactivarCuenta, login } from '../src/controllers/auth.controller.js';
import { prisma, pool } from '../src/config/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

async function test() {
  try {
    console.log('Probando flujo de borrado lógico (desactivación de cuenta)...');

    // 1. Limpiar base de datos primero
    await prisma.usuario.deleteMany({
      where: { correo: 'test_desactivar@correo.com' }
    });

    // 2. Crear usuario de prueba (activo)
    const salt = await bcrypt.genSalt(10);
    const passwordEncriptado = await bcrypt.hash('clave_secreta_123', salt);

    const usuarioCreado = await prisma.usuario.create({
      data: {
        nombre_usuario: 'usuario_desactivar_test',
        correo: 'test_desactivar@correo.com',
        password: passwordEncriptado,
        proveedor: 'LOCAL',
        rol: 'USER',
        estado: 'ACTIVE'
      }
    });
    console.log(`Usuario creado con estado: ${usuarioCreado.estado}`);

    // 3. Generar token de sesión (lo que haría el middleware al validar)
    const token = jwt.sign(
      { id: usuarioCreado.id, nombre_usuario: usuarioCreado.nombre_usuario, rol: usuarioCreado.rol },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 4. Simular petición DELETE /mi-cuenta pasándole el req.usuario inyectado
    console.log('\n--- Ejecutando desactivarCuenta (Borrado Lógico) ---');
    const mockReqDelete = {
      usuario: { id: usuarioCreado.id, nombre_usuario: usuarioCreado.nombre_usuario, rol: usuarioCreado.rol }
    };
    const mockResDelete = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; }
    };

    await desactivarCuenta(mockReqDelete, mockResDelete);
    console.log('Resultado del servidor:', mockResDelete.statusCode);
    console.log('Mensaje:', mockResDelete.body.mensaje);
    console.log('Estado actual del usuario devuelto:', mockResDelete.body.usuario.estado);

    if (mockResDelete.statusCode === 200 && mockResDelete.body.usuario.estado === 'INACTIVE') {
      console.log('✔ ¡Desactivación exitosa en base de datos!');
    } else {
      console.error('✘ Falló la desactivación.');
    }

    // 5. Intentar hacer Login con el usuario ya desactivado
    console.log('\n--- Probando Login con cuenta inactiva ---');
    const mockReqLogin = {
      body: {
        correo: 'test_desactivar@correo.com',
        password: 'clave_secreta_123'
      }
    };
    const mockResLogin = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; }
    };

    await login(mockReqLogin, mockResLogin);
    console.log('Resultado obtenido (debería ser 401):', mockResLogin.statusCode);
    console.log('Error devuelto:', mockResLogin.body.error);

    if (mockResLogin.statusCode === 401 && mockResLogin.body.error === 'Credenciales incorrectas') {
      console.log('✔ ¡Bloqueo de cuenta inactiva funcionando con éxito!');
    } else {
      console.error('✘ Falló el bloqueo de cuenta inactiva.');
    }

    // 6. Limpieza final
    await prisma.usuario.deleteMany({
      where: { correo: 'test_desactivar@correo.com' }
    });
    console.log('\nBase de datos limpia.');

  } catch (err) {
    console.error('Error durante el test:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
