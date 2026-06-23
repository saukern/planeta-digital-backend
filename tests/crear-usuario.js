import { prisma, pool } from '../src/config/db.js';
import bcrypt from 'bcryptjs';

async function main() {
  const correo = 'test@correo.com';
  const nombre_usuario = 'usuario_test';
  const password = 'password123';

  // Verificar si el usuario ya existe
  const existing = await prisma.usuario.findUnique({ where: { correo } });
  if (existing) {
    console.log(`El usuario con correo "${correo}" ya existe en la base de datos.`);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordEncriptado = await bcrypt.hash(password, salt);

  const nuevoUsuario = await prisma.usuario.create({
    data: {
      nombre_usuario,
      correo,
      password: passwordEncriptado,
      proveedor: 'LOCAL',
      rol: 'USER',
      estado: 'ACTIVE'
    }
  });

  console.log('==================================================');
  console.log('¡Usuario de prueba creado con éxito!');
  console.log(`Correo: ${nuevoUsuario.correo}`);
  console.log(`Contraseña: ${password}`);
  console.log('==================================================');
}

main()
  .catch(err => console.error('Error al crear el usuario:', err))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
