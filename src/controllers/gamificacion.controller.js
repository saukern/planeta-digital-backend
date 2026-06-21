import { prisma } from '../config/db.js';

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

    return res.status(200).json({
      mensaje: 'Meta literaria establecida con éxito.',
      meta
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
