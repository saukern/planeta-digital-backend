import { prisma } from '../config/db.js';
import { subirArchivo, eliminarArchivo } from '../services/storage.service.js';

export const subirArchivoPersonal = async (req, res) => {
  try {
    const { tipo, titulo, autor, genero, materia, tipo_documento } = req.body;
    const archivo = req.files && req.files.archivo && req.files.archivo[0];
    const portada = req.files && req.files.portada && req.files.portada[0];

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

    // 1b. Subir portada si fue proporcionada
    let urlPortada = null;
    if (portada) {
      try {
        urlPortada = await subirArchivo(portada.buffer, portada.originalname, portada.mimetype);
      } catch (uploadError) {
        console.error('Error al subir la portada a la nube:', uploadError);
        // Limpiamos el archivo principal para no dejar basura si falla la portada
        await eliminarArchivo(urlNube);
        return res.status(500).json({ error: 'Error al subir la imagen de portada a la nube.' });
      }
    }

    // 2. Transacción en la base de datos para guardar la herencia y asociarla al usuario
    const resultado = await prisma.$transaction(async (tx) => {
      // A. Crear registro en la tabla común 'archivos'
      const nuevoArchivo = await tx.archivo.create({
        data: {
          titulo,
          url_nube: urlNube,
          url_portada: urlPortada,
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
    const { titulo, autor, genero, materia, tipo_documento, url_portada } = req.body;

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
    if (url_portada !== undefined) datosActualizar.url_portada = url_portada;

    const resultado = await prisma.$transaction(async (tx) => {
      let archivoActualizado = null;
      if (Object.keys(datosActualizar).length > 0) {
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
        
        // Borrar el archivo y la portada de Supabase Storage
        await eliminarArchivo(archivo.url_nube);
        if (archivo.url_portada) {
          await eliminarArchivo(archivo.url_portada);
        }
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

export const importarDesdeGutendex = async (req, res) => {
  try {
    const { gutenbergId } = req.body;

    if (!gutenbergId) {
      return res.status(400).json({ error: 'El gutenbergId es obligatorio.' });
    }

    // 1. Obtener metadatos de la API de Gutendex
    const responseMeta = await fetch(`https://gutendex.com/books/${gutenbergId}`);
    if (!responseMeta.ok) {
      return res.status(404).json({ error: 'Libro no encontrado en Project Gutenberg.' });
    }
    const bookData = await responseMeta.json();

    // 2. Extraer metadatos
    const titulo = bookData.title || 'Título Desconocido';
    const autor = bookData.authors && bookData.authors.length > 0
      ? bookData.authors.map(a => a.name).join(', ')
      : 'Autor Desconocido';
    const genero = bookData.subjects && bookData.subjects.length > 0
      ? bookData.subjects.slice(0, 2).join(', ')
      : 'General';

    // Buscar formato de tipo EPUB
    const formats = bookData.formats || {};
    const epubKey = Object.keys(formats).find(key => key.toLowerCase().includes('epub'));
    const epubUrl = epubKey ? formats[epubKey] : null;

    if (!epubUrl) {
      return res.status(400).json({ error: 'El libro no tiene un formato EPUB disponible para descargar.' });
    }

    // Buscar formato de tipo imagen (portada)
    const imageKey = Object.keys(formats).find(key => key.toLowerCase().includes('image/jpeg') || key.toLowerCase().includes('image/png'));
    const rawImageUrl = imageKey ? formats[imageKey] : null;

    // 3. Descargar el archivo EPUB en memoria
    const responseFile = await fetch(epubUrl);
    if (!responseFile.ok) {
      return res.status(500).json({ error: 'Error al descargar el archivo EPUB desde Project Gutenberg.' });
    }

    const arrayBuffer = await responseFile.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileName = `gutenberg-${gutenbergId}.epub`;
    const mimeType = 'application/epub+zip';

    // 4. Subir el archivo EPUB a Supabase Storage
    let urlNube;
    try {
      urlNube = await subirArchivo(fileBuffer, fileName, mimeType);
    } catch (uploadError) {
      console.error('Error al subir libro importado a Supabase:', uploadError);
      return res.status(500).json({ error: 'Error al guardar el archivo en el almacenamiento en la nube.' });
    }

    // 4b. Descargar y subir la portada (opcional) a Supabase Storage
    let urlPortada = null;
    if (rawImageUrl) {
      try {
        const responseImg = await fetch(rawImageUrl);
        if (responseImg.ok) {
          const imgArrayBuffer = await responseImg.arrayBuffer();
          const imgBuffer = Buffer.from(imgArrayBuffer);
          const imgExt = rawImageUrl.split('.').pop() || 'jpg';
          const imgMime = responseImg.headers.get('content-type') || 'image/jpeg';
          urlPortada = await subirArchivo(imgBuffer, `gutenberg-cover-${gutenbergId}.${imgExt}`, imgMime);
        }
      } catch (imgError) {
        console.error('Error al descargar/subir la portada de Gutenberg, usando enlace directo:', imgError);
        urlPortada = rawImageUrl; // Fallback al enlace externo directo
      }
    }

    // 5. Guardar en Base de Datos
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear registro de archivo
      const nuevoArchivo = await tx.archivo.create({
        data: {
          titulo,
          url_nube: urlNube,
          url_portada: urlPortada,
          formato: 'EPUB'
        }
      });

      // Crear registro de libro
      await tx.libro.create({
        data: {
          id: nuevoArchivo.id,
          autor,
          genero
        }
      });

      // Crear progreso asociado al usuario
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
      mensaje: 'Libro de Project Gutenberg importado con éxito a tu biblioteca.',
      progreso: resultado
    });

  } catch (error) {
    console.error('Error al importar desde Gutendex:', error);
    return res.status(500).json({ error: 'Error interno del servidor al importar el libro.' });
  }
};

