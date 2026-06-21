import pkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { PrismaClient } = pkg;
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
	try {
		console.log('Insertando usuario de prueba con Prisma...');
		const nuevoUsuario = await prisma.usuario.create({
			data: {
				nombre_usuario: 'usuario_prueba_temp',
				correo: 'prueba_temp@correo.com',
				password: 'mi_password_seguro',
				proveedor: 'LOCAL',
				rol: 'USER',
				estado: 'ACTIVE',
			},
		});
		console.log('¡Usuario creado con éxito!');
		console.log(`- ID: ${nuevoUsuario.id}`);
		console.log(`- Nombre: ${nuevoUsuario.nombre_usuario}`);
		console.log(`- Correo: ${nuevoUsuario.correo}`);

		console.log('Buscando al usuario por correo...');
		const usuarioBuscado = await prisma.usuario.findUnique({
			where: {
				correo: 'prueba_temp@correo.com',
			},
		});
		console.log(`¡Usuario encontrado! Nombre: ${usuarioBuscado.nombre_usuario}`);

		console.log('Eliminando al usuario de prueba para limpiar la base de datos...');
		//const usuarioEliminado = await prisma.usuario.delete({
		//where: {
		//correo: 'prueba_temp@correo.com',
		//},
		//});
		console.log(`¡Usuario eliminado con éxito! ID: ${usuarioEliminado.id}`);
		console.log('¡Prueba de Prisma completada exitosamente!');
	} catch (error) {
		console.error('Error durante la prueba de Prisma:', error.message);
	} finally {
		await prisma.$disconnect();
		await pool.end();
	}
}

main();
