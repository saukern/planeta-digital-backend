import { prisma } from '../config/db.js';
import { subirArchivo, eliminarArchivo } from '../services/storage.service.js';

export const subirArchivoPersonal = async (req, res) => {
  try {
    const { tipo, titulo, autor, genero, materia, tipo_documento } = req.body;
    const archivo = req.file;

    if (!tipo || !titulo || !archivo) {
      return res.status(400).json({ error: 'El tipo, título y archivo son obligatorios.' });
    }

    if (tipo !== 'libro' && tipo !== 'documento') {
      return res.status(400).json({ error: 'El tipo debe ser "libro" o "documento".' });
    }

    const formato = archivo.originalname.split('.').pop().toUpperCase();

    // 1. Subir archivo a Supabase Storage
    let urlNube;
    try {
      urlNube = await subirArchivo(archivo.buffer, archivo.originalname, archivo.mimetype);
    } catch (uploadError) {
      console.error('Error al subir archivo a la nube:', uploadError);
      return res.status(500).json({ error: 'Error al subir el archivo al almacenamiento en la nube.' });
    }

    // 2. Transacción en la base de datos para guardar la herencia y asociarla al usuario
    const resultado = await prisma.$transaction(async (tx) => {
      // A. Crear registro en la tabla común 'archivos'
      const nuevoArchivo = await tx.archivo.create({
        data: {
          titulo,
          url_nube: urlNube,
          formato
        }
      });

      // B. Crear registro en la tabla especializada correspondiente
      if (tipo === 'libro') {
        await tx.libro.create({
          data: {
            id: nuevoArchivo.id,
            autor: autor || 'Autor Desconocido',
            genero: genero || 'General'
          }
        });
      } else {
        await tx.documento.create({
          data: {
            id: nuevoArchivo.id,
            materia: materia || 'General',
            tipo_documento: tipo_documento || 'OTHER'
          }
        });
      }

      // C. Crear registro en 'progreso_usuario' para asociarlo a este usuario
      const nuevoProgreso = await tx.progresoUsuario.create({
        data: {
          usuario_id: req.usuario.id,
          archivo_id: nuevoArchivo.id,
          pagina_actual: 0,
          estado_lectura: 'WANT_TO_READ',
          agregado_en: new Date()
        },
        include: {
          archivo: {
            include: {
              libro: true,
              documento: true
            }
          }
        }
      });

      return nuevoProgreso;
    });

    return res.status(201).json({
      mensaje: `${tipo === 'libro' ? 'Libro' : 'Documento'} subido y agregado a tu biblioteca con éxito.`,
      progreso: resultado
    });

  } catch (error) {
    console.error('Error al subir archivo personal:', error);
    return res.status(500).json({ error: 'Error interno del servidor al procesar la subida.' });
  }
};

export const obtenerBiblioteca = async (req, res) => {
  try {
    const biblioteca = await prisma.progresoUsuario.findMany({
      where: { usuario_id: req.usuario.id },
      include: {
        archivo: {
          include: {
            libro: true,
            documento: true
          }
        }
      },
      orderBy: { agregado_en: 'desc' }
    });

    return res.status(200).json(biblioteca);
  } catch (error) {
    console.error('Error al obtener biblioteca:', error);
    return res.status(500).json({ error: 'Error interno del servidor al obtener la biblioteca.' });
  }
};

export const editarArchivo = async (req, res) => {
  try {
    const { id } = req.params; // ID del archivo (archivo_id)
    const { titulo, autor, genero, materia, tipo_documento } = req.body;

    const archivoId = Number(id);

    // Verificar que el archivo pertenece a la biblioteca de este usuario
    const progreso = await prisma.progresoUsuario.findFirst({
      where: {
        usuario_id: req.usuario.id,
        archivo_id: archivoId
      }
    });

    if (!progreso) {
      return res.status(403).json({ error: 'No tienes permisos para editar este archivo o no existe.' });
    }

    // Actualizar datos comunes en la tabla 'archivos'
    const datosActualizar = {};
    if (titulo) datosActualizar.titulo = titulo;

    const resultado = await prisma.$transaction(async (tx) => {
      let archivoActualizado = null;
      if (titulo) {
        archivoActualizado = await tx.archivo.update({
          where: { id: archivoId },
          data: datosActualizar
        });
      }

      // Identificar si es libro o documento y actualizar
      const esLibro = await tx.libro.findUnique({ where: { id: archivoId } });

      if (esLibro) {
        const datosLibro = {};
        if (autor) datosLibro.autor = autor;
        if (genero) datosLibro.genero = genero;

        if (Object.keys(datosLibro).length > 0) {
          await tx.libro.update({
            where: { id: archivoId },
            data: datosLibro
          });
        }
      } else {
        const datosDoc = {};
        if (materia) datosDoc.materia = materia;
        if (tipo_documento) datosDoc.tipo_documento = tipo_documento;

        if (Object.keys(datosDoc).length > 0) {
          await tx.documento.update({
            where: { id: archivoId },
            data: datosDoc
          });
        }
      }

      // Obtener el archivo con sus relaciones actualizadas
      const archivoFinal = await tx.archivo.findUnique({
        where: { id: archivoId },
        include: {
          libro: true,
          documento: true
        }
      });

      return archivoFinal;
    });

    return res.status(200).json({
      mensaje: 'Metadatos del archivo actualizados con éxito.',
      archivo: resultado
    });

  } catch (error) {
    console.error('Error al editar metadatos del archivo:', error);
    return res.status(500).json({ error: 'Error interno del servidor al editar el archivo.' });
  }
};

export const eliminarDeBiblioteca = async (req, res) => {
  try {
    const { id } = req.params; // ID del progreso (progreso_usuario_id)

    const progresoId = Number(id);

    const progreso = await prisma.progresoUsuario.findUnique({
      where: { id: progresoId }
    });

    if (!progreso) {
      return res.status(404).json({ error: 'Registro de biblioteca no encontrado.' });
    }

    if (progreso.usuario_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este registro.' });
    }

    const archivoId = progreso.archivo_id;

    // A. Eliminar el progreso de la biblioteca del usuario
    await prisma.progresoUsuario.delete({
      where: { id: progresoId }
    });

    // B. Verificar si algún otro usuario en la plataforma tiene este archivo en su estantería
    const otrosProgresos = await prisma.progresoUsuario.count({
      where: { archivo_id: archivoId }
    });

    let archivoEliminadoFisicamente = false;

    // C. Si nadie más tiene el archivo, borramos los datos físicos y la fila de archivos para no acumular basura
    if (otrosProgresos === 0) {
      const archivo = await prisma.archivo.findUnique({
        where: { id: archivoId }
      });

      if (archivo) {
        // Al eliminar de la tabla 'archivos', se eliminará de 'libros' o 'documentos' en cascada
        await prisma.archivo.delete({
          where: { id: archivoId }
        });
        
        // Borrar el archivo de Supabase Storage en segundo plano
        await eliminarArchivo(archivo.url_nube);
        archivoEliminadoFisicamente = true;
      }
    }

    return res.status(200).json({
      mensaje: 'Libro quitado de tu biblioteca personal con éxito.',
      archivoId,
      archivoEliminadoFisicamente
    });

  } catch (error) {
    console.error('Error al eliminar de biblioteca:', error);
    return res.status(500).json({ error: 'Error interno del servidor al quitar el libro.' });
  }
};
