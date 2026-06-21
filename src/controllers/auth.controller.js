import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/db.js';

const clientGoogle = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

export const autenticacionGoogle = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'El idToken de Google es obligatorio' });
    }

    let ticket;
    try {
      ticket = await clientGoogle.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (verifError) {
      console.error('Error al verificar token de Google:', verifError.message);
      return res.status(401).json({ error: 'Token de Google inválido o expirado' });
    }

    const payload = ticket.getPayload();
    const { email, name, given_name } = payload;

    let usuario = await prisma.usuario.findUnique({
      where: { correo: email }
    });

    let mensaje = 'Inicio de sesión exitoso con Google';

    if (!usuario) {
      const prefijoEmail = email.split('@')[0];
      let nombreUsuarioPropuesto = given_name || name || prefijoEmail;
      
      nombreUsuarioPropuesto = nombreUsuarioPropuesto.toLowerCase().replace(/[^a-z0-9_]/g, '');

      const existeNombre = await prisma.usuario.findUnique({
        where: { nombre_usuario: nombreUsuarioPropuesto }
      });

      if (existeNombre) {
        nombreUsuarioPropuesto = `${nombreUsuarioPropuesto}_${Math.floor(100 + Math.random() * 900)}`;
      }

      usuario = await prisma.usuario.create({
        data: {
          nombre_usuario: nombreUsuarioPropuesto,
          correo: email,
          password: null,
          proveedor: 'GOOGLE',
          rol: 'USER',
          estado: 'ACTIVE'
        }
      });

      mensaje = 'Usuario registrado con éxito mediante Google';
    } else {
      if (usuario.estado === 'INACTIVE') {
        usuario = await prisma.usuario.update({
          where: { id: usuario.id },
          data: { estado: 'ACTIVE' }
        });
      }
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nombre_usuario: usuario.nombre_usuario,
        rol: usuario.rol
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...usuarioSinPassword } = usuario;

    return res.status(200).json({
      mensaje,
      usuario: usuarioSinPassword,
      token
    });

  } catch (error) {
    console.error('Error en autenticación Google:', error);
    return res.status(500).json({ error: 'Error interno del servidor en autenticación Google' });
  }
};

export const login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ error: 'El correo y la contraseña son obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { correo }
    });

    if (!usuario || usuario.estado === 'INACTIVE') {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    if (usuario.proveedor === 'GOOGLE') {
      return res.status(400).json({ 
        error: 'Esta cuenta está registrada con Google. Por favor, inicia sesión con Google.' 
      });
    }

    const passwordCorrecto = await bcrypt.compare(password, usuario.password);
    if (!passwordCorrecto) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nombre_usuario: usuario.nombre_usuario,
        rol: usuario.rol
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...usuarioSinPassword } = usuario;

    return res.status(200).json({
      mensaje: 'Inicio de sesión exitoso',
      usuario: usuarioSinPassword,
      token
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor al procesar el inicio de sesión' });
  }
};

export const desactivarCuenta = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: { estado: 'INACTIVE' }
    });

    return res.status(200).json({
      mensaje: 'Cuenta desactivada con éxito (borrado lógico)',
      usuario: {
        id: usuarioActualizado.id,
        nombre_usuario: usuarioActualizado.nombre_usuario,
        estado: usuarioActualizado.estado
      }
    });

  } catch (error) {
    console.error('Error al desactivar cuenta:', error);
    return res.status(500).json({ error: 'Error interno del servidor al desactivar la cuenta' });
  }
};
