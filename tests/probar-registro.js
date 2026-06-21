import { registro } from '../src/controllers/auth.controller.js';
import { prisma, pool } from '../src/config/db.js';

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
		console.log('Probando controlador de registro...');

		await prisma.usuario.deleteMany({
			where: { correo: 'test_registro@correo.com' }
		});

		const mockReq = {
			body: {
				nombre_usuario: 'test_registro_user',
				correo: 'test_registro@correo.com',
				password: 'contrasena_segura_123'
			}
		};

		await registro(mockReq, mockRes);

		console.log('Resultado del registro:', mockRes.statusCode);
		console.log('Datos del usuario creado:', mockRes.body.usuario);

		if (mockRes.statusCode === 201) {
			console.log('\n==================================================');
			console.log('Jwt:');
			console.log(mockRes.body.token);
			console.log('==================================================\n');
			console.log('¡Prueba de registro exitosa!');
		} else {
			console.error('La prueba falló con el código:', mockRes.statusCode, mockRes.body);
		}

		await prisma.usuario.deleteMany({
			where: { correo: 'test_registro@correo.com' }
		});
		console.log('Base de datos limpia.');

	} catch (err) {
		console.error('Error en test:', err);
	} finally {
		await prisma.$disconnect();
		await pool.end();
	}
}

test();
