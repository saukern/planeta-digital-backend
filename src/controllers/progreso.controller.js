import { prisma } from '../config/db.js';
import { evaluarYDesbloquearLogros } from './gamificacion.controller.js';

export const actualizarProgreso = async (req, res) => {
  try {
    const { id } = req.params;
    const { pagina_actual, estado_lectura, calificacion_personal, resena_personal } = req.body;

    const progresoId = Number(id);

    const progresoExistente = await prisma.progresoUsuario.findUnique({
      where: { id: progresoId }
    });

    if (!progresoExistente) {
      return res.status(404).json({ error: 'Registro de biblioteca no encontrado.' });
    }

    if (progresoExistente.usuario_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permisos para modificar este progreso.' });
    }

    const datosActualizar = {};
    if (pagina_actual !== undefined) datosActualizar.pagina_actual = Number(pagina_actual);
    if (estado_lectura !== undefined) datosActualizar.estado_lectura = estado_lectura;
    if (calificacion_personal !== undefined) datosActualizar.calificacion_personal = Number(calificacion_personal);
    if (resena_personal !== undefined) datosActualizar.resena_personal = resena_personal;

    const progresoActualizado = await prisma.progresoUsuario.update({
      where: { id: progresoId },
      data: datosActualizar,
      include: {
        archivo: {
          include: {
            libro: true,
            documento: true
          }
        }
      }
    });

    const nuevosLogros = await evaluarYDesbloquearLogros(req.usuario.id);

    return res.status(200).json({
      mensaje: 'Progreso de lectura actualizado con éxito.',
      progreso: progresoActualizado,
      logros_desbloqueados: nuevosLogros
    });

  } catch (error) {
    console.error('Error al actualizar progreso de lectura:', error);
    return res.status(500).json({ error: 'Error interno del servidor al actualizar progreso.' });
  }
};

export const registrarSesionLectura = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_sesion, duracion_minutos, paginas_leidas } = req.body;

    const progresoId = Number(id);

    if (duracion_minutos === undefined || paginas_leidas === undefined) {
      return res.status(400).json({ error: 'La duración en minutos y las páginas leídas son obligatorias.' });
    }

    const progreso = await prisma.progresoUsuario.findUnique({
      where: { id: progresoId }
    });

    if (!progreso) {
      return res.status(404).json({ error: 'Registro de biblioteca no encontrado.' });
    }

    if (progreso.usuario_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permisos para registrar sesiones en este progreso.' });
    }

    const nuevaSesion = await prisma.sesionLectura.create({
      data: {
        progreso_usuario_id: progresoId,
        fecha_sesion: fecha_sesion ? new Date(fecha_sesion) : new Date(),
        duracion_minutos: Number(duracion_minutos),
        paginas_leidas: Number(paginas_leidas)
      }
    });

    const nuevosLogros = await evaluarYDesbloquearLogros(req.usuario.id);

    return res.status(201).json({
      mensaje: 'Sesión de lectura registrada con éxito.',
      sesion: nuevaSesion,
      logros_desbloqueados: nuevosLogros
    });

  } catch (error) {
    console.error('Error al registrar sesión de lectura:', error);
    return res.status(500).json({ error: 'Error interno del servidor al registrar la sesión.' });
  }
};

export const crearAnotacion = async (req, res) => {
  try {
    const { progreso_usuario_id, marcador_posicion, texto_resaltado, nota_usuario, color_hex } = req.body;

    if (!progreso_usuario_id || !marcador_posicion || !texto_resaltado || !color_hex) {
      return res.status(400).json({ error: 'El progreso_usuario_id, marcador_posicion, texto_resaltado y color_hex son obligatorios.' });
    }

    const progresoId = Number(progreso_usuario_id);

    const progreso = await prisma.progresoUsuario.findUnique({
      where: { id: progresoId }
    });

    if (!progreso) {
      return res.status(404).json({ error: 'Registro de biblioteca no encontrado.' });
    }

    if (progreso.usuario_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permisos para agregar anotaciones a este progreso.' });
    }

    const nuevaAnotacion = await prisma.anotacion.create({
      data: {
        progreso_usuario_id: progresoId,
        marcador_posicion,
        texto_resaltado,
        nota_usuario,
        color_hex
      }
    });

    return res.status(201).json({
      mensaje: 'Anotación guardada con éxito.',
      anotacion: nuevaAnotacion
    });

  } catch (error) {
    console.error('Error al crear anotación:', error);
    return res.status(500).json({ error: 'Error interno del servidor al guardar la anotación.' });
  }
};

export const obtenerAnotaciones = async (req, res) => {
  try {
    const { progresoUsuarioId } = req.params;

    const progresoId = Number(progresoUsuarioId);

    const progreso = await prisma.progresoUsuario.findUnique({
      where: { id: progresoId }
    });

    if (!progreso) {
      return res.status(404).json({ error: 'Registro de biblioteca no encontrado.' });
    }

    if (progreso.usuario_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permisos para ver las anotaciones de este progreso.' });
    }

    const anotaciones = await prisma.anotacion.findMany({
      where: { progreso_usuario_id: progresoId },
      orderBy: { creado_en: 'desc' }
    });

    return res.status(200).json(anotaciones);

  } catch (error) {
    console.error('Error al obtener anotaciones:', error);
    return res.status(500).json({ error: 'Error interno del servidor al obtener anotaciones.' });
  }
};
