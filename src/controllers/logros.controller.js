import { prisma } from '../config/db.js';

const LOGROS_PREDEFINIDOS = [
  { codigo_insignia: 'PRIMER_PASO', nombre: 'Primeros Pasos', descripcion: 'Agregar el primer libro o documento a la biblioteca personal.' },
  { codigo_insignia: 'DEVORADOR', nombre: 'Devorador de Libros', descripcion: 'Completar la lectura de al menos 3 libros o documentos.' },
  { codigo_insignia: 'CONSTANCIA', nombre: 'Lector Constante', descripcion: 'Registrar la primera sesión de lectura.' },
  { codigo_insignia: 'META_CUMPLIDA', nombre: 'Meta Cumplida', descripcion: 'Alcanzar el objetivo de lectura del año actual.' }
];

const inicializarLogrosSiEsNecesario = async () => {
  const count = await prisma.logro.count();
  if (count === 0) {
    await prisma.logro.createMany({
      data: LOGROS_PREDEFINIDOS
    });
  }
};

const desbloquearLogro = async (usuarioId, codigo) => {
  const logro = await prisma.logro.findUnique({ where: { codigo_insignia: codigo } });
  if (!logro) return null;

  const yaDesbloqueado = await prisma.logroUsuario.findUnique({
    where: {
      usuario_id_logro_id: {
        usuario_id: usuarioId,
        logro_id: logro.id
      }
    }
  });

  if (yaDesbloqueado) return null;

  await prisma.logroUsuario.create({
    data: {
      usuario_id: usuarioId,
      logro_id: logro.id
    }
  });

  return logro;
};

export const evaluarYDesbloquearLogros = async (usuarioId) => {
  await inicializarLogrosSiEsNecesario();
  const nuevosLogrosDesbloqueados = [];

  const cantidadLibros = await prisma.progresoUsuario.count({ where: { usuario_id: usuarioId } });
  if (cantidadLibros >= 1) {
    const unlocked = await desbloquearLogro(usuarioId, 'PRIMER_PASO');
    if (unlocked) nuevosLogrosDesbloqueados.push(unlocked);
  }

  const completados = await prisma.progresoUsuario.count({
    where: { usuario_id: usuarioId, estado_lectura: 'COMPLETED' }
  });
  if (completados >= 3) {
    const unlocked = await desbloquearLogro(usuarioId, 'DEVORADOR');
    if (unlocked) nuevosLogrosDesbloqueados.push(unlocked);
  }

  const sesiones = await prisma.sesionLectura.count({
    where: { progreso_usuario: { usuario_id: usuarioId } }
  });
  if (sesiones >= 1) {
    const unlocked = await desbloquearLogro(usuarioId, 'CONSTANCIA');
    if (unlocked) nuevosLogrosDesbloqueados.push(unlocked);
  }

  const anioActual = new Date().getFullYear();
  const meta = await prisma.metaLiteraria.findUnique({
    where: { usuario_id_anio: { usuario_id: usuarioId, anio: anioActual } }
  });
  if (meta) {
    const inicioAnio = new Date(anioActual, 0, 1);
    const finAnio = new Date(anioActual, 11, 31, 23, 59, 59, 999);
    const librosCompletadosAnio = await prisma.progresoUsuario.count({
      where: {
        usuario_id: usuarioId,
        estado_lectura: 'COMPLETED',
        agregado_en: { gte: inicioAnio, lte: finAnio }
      }
    });
    if (librosCompletadosAnio >= meta.libros_objetivo) {
      const unlocked = await desbloquearLogro(usuarioId, 'META_CUMPLIDA');
      if (unlocked) nuevosLogrosDesbloqueados.push(unlocked);
    }
  }

  return nuevosLogrosDesbloqueados;
};

export const establecerMeta = async (req, res) => {
  try {
    const { anio, libros_objetivo } = req.body;

    if (libros_objetivo === undefined || Number(libros_objetivo) <= 0) {
      return res.status(400).json({ error: 'El objetivo de libros debe ser un número entero mayor que cero.' });
    }

    const anioMeta = anio ? Number(anio) : new Date().getFullYear();

    const meta = await prisma.metaLiteraria.upsert({
      where: {
        usuario_id_anio: {
          usuario_id: req.usuario.id,
          anio: anioMeta
        }
      },
      update: {
        libros_objetivo: Number(libros_objetivo)
      },
      create: {
        usuario_id: req.usuario.id,
        anio: anioMeta,
        libros_objetivo: Number(libros_objetivo)
      }
    });

    const nuevosLogros = await evaluarYDesbloquearLogros(req.usuario.id);

    return res.status(200).json({
      mensaje: 'Meta literaria establecida con éxito.',
      meta,
      logros_desbloqueados: nuevosLogros
    });

  } catch (error) {
    console.error('Error al establecer meta literaria:', error);
    return res.status(500).json({ error: 'Error interno del servidor al establecer la meta.' });
  }
};

export const obtenerMeta = async (req, res) => {
  try {
    const { anio } = req.params;
    const anioMeta = anio ? Number(anio) : new Date().getFullYear();

    const meta = await prisma.metaLiteraria.findUnique({
      where: {
        usuario_id_anio: {
          usuario_id: req.usuario.id,
          anio: anioMeta
        }
      }
    });

    const inicioAnio = new Date(anioMeta, 0, 1);
    const finAnio = new Date(anioMeta, 11, 31, 23, 59, 59, 999);

    const librosCompletados = await prisma.progresoUsuario.count({
      where: {
        usuario_id: req.usuario.id,
        estado_lectura: 'COMPLETED',
        agregado_en: {
          gte: inicioAnio,
          lte: finAnio
        }
      }
    });

    return res.status(200).json({
      anio: anioMeta,
      meta_establecida: !!meta,
      libros_objetivo: meta ? meta.libros_objetivo : 0,
      libros_completados: librosCompletados,
      progreso_porcentaje: meta ? Math.min(Math.round((librosCompletados / meta.libros_objetivo) * 100), 100) : 0
    });

  } catch (error) {
    console.error('Error al obtener meta literaria:', error);
    return res.status(500).json({ error: 'Error interno del servidor al obtener la meta.' });
  }
};

export const obtenerLogrosUsuario = async (req, res) => {
  try {
    await inicializarLogrosSiEsNecesario();

    const todosLosLogros = await prisma.logro.findMany();
    const logrosDesbloqueados = await prisma.logroUsuario.findMany({
      where: { usuario_id: req.usuario.id }
    });

    const mapaDesbloqueados = new Map(
      logrosDesbloqueados.map(ld => [ld.logro_id, ld.desbloqueado_en])
    );

    const resultado = todosLosLogros.map(logro => ({
      id: logro.id,
      nombre: logro.nombre,
      descripcion: logro.descripcion,
      codigo_insignia: logro.codigo_insignia,
      desbloqueado: mapaDesbloqueados.has(logro.id),
      desbloqueado_en: mapaDesbloqueados.get(logro.id) || null
    }));

    return res.status(200).json(resultado);

  } catch (error) {
    console.error('Error al obtener logros del usuario:', error);
    return res.status(500).json({ error: 'Error interno del servidor al obtener logros.' });
  }
};
