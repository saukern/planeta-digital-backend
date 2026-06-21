import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

export const registro = async (req, res) => {
	try {
		const { nombre_usuario, correo, password } = req.body;

		if (!nombre_usuario || !correo || !password) {
			return res.status(400).json({ error: 'Todos los campos son obligatorios' });
		}

		const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!correoRegex.test(correo)) {
			return res.status(400).json({ error: 'Formato de correo electrónico no válido' });
		}

		if (password.length < 6) {
			return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
		}

		const usuarioExistente = await prisma.usuario.findFirst({
			where: {
				OR: [
					{ nombre_usuario },
					{ correo }
				]
			}
		});

		if (usuarioExistente) {
			if (usuarioExistente.correo === correo) {
				return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
			}
			return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
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

		const { password: _, ...usuarioSinPassword } = nuevoUsuario;
		// jwt (header que dice su tipo de encriptacion, payload datos , firma)
		const token = jwt.sign(
			{
				id: nuevoUsuario.id,
				nombre_usuario: nuevoUsuario.nombre_usuario,
				rol: nuevoUsuario.rol
			},
			process.env.JWT_SECRET,
			{ expiresIn: '24h' }
		);

		return res.status(201).json({
			mensaje: 'Usuario registrado con éxito',
			usuario: usuarioSinPassword,
			token
		});

	} catch (error) {
		console.error('Error en registro:', error);
		return res.status(500).json({ error: 'Error interno del servidor al procesar el registro' });
	}
};
