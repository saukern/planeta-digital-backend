process.env.MOCK_STORAGE = 'true';

import { subirArchivoPersonal, obtenerBiblioteca, editarArchivo, eliminarDeBiblioteca } from '../src/controllers/biblioteca.controller.js';
import { prisma, pool } from '../src/config/db.js';
import bcrypt from 'bcryptjs';

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
    console.log('Iniciando prueba del CRUD de Biblioteca Personal...');

    // 1. Crear usuario de prueba
    await prisma.usuario.deleteMany({
      where: { correo: 'biblioteca_test@correo.com' }
    });

    const salt = await bcrypt.genSalt(10);
    const pwd = await bcrypt.hash('password_123', salt);
    const usuario = await prisma.usuario.create({
      data: {
        nombre_usuario: 'usuario_bib_test',
        correo: 'biblioteca_test@correo.com',
        password: pwd,
        proveedor: 'LOCAL',
        rol: 'USER',
        estado: 'ACTIVE'
      }
    });

    const mockReq = { usuario: { id: usuario.id } };

    // 2. Prueba 1: Subir un Libro
    console.log('\n--- Prueba 1: Subir Libro ---');
    const reqLibro = {
      ...mockReq,
      body: {
        tipo: 'libro',
        titulo: 'Don Quijote de la Mancha',
        autor: 'Miguel de Cervantes',
        genero: 'Novela'
      },
      file: {
        buffer: Buffer.from('mock content'),
        originalname: 'quijote.epub',
        mimetype: 'application/epub+zip'
      }
    };
    const resLibro = { ...mockRes };
    await subirArchivoPersonal(reqLibro, resLibro);
    console.log('Resultado:', resLibro.statusCode);
    console.log('Mensaje:', resLibro.body.mensaje);
    
    const progresoLibro = resLibro.body.progreso;
    console.log('Libro creado ID:', progresoLibro.archivo.id);
    console.log('Autor:', progresoLibro.archivo.libro.autor);

    if (resLibro.statusCode === 201 && progresoLibro.archivo.libro.autor === 'Miguel de Cervantes') {
      console.log('✔ Subida de libro exitosa.');
    } else {
      console.error('✘ Falló subida de libro.');
    }

    // 3. Prueba 2: Subir un Documento
    console.log('\n--- Prueba 2: Subir Documento ---');
    const reqDoc = {
      ...mockReq,
      body: {
        tipo: 'documento',
        titulo: 'Apuntes de Web II',
        materia: 'Tecnologías Web',
        tipo_documento: 'NOTES'
      },
      file: {
        buffer: Buffer.from('pdf content'),
        originalname: 'apuntes.pdf',
        mimetype: 'application/pdf'
      }
    };
    const resDoc = { ...mockRes };
    await subirArchivoPersonal(reqDoc, resDoc);
    console.log('Resultado:', resDoc.statusCode);
    console.log('Mensaje:', resDoc.body.mensaje);

    const progresoDoc = resDoc.body.progreso;
    console.log('Documento creado ID:', progresoDoc.archivo.id);
    console.log('Materia:', progresoDoc.archivo.documento.materia);

    if (resDoc.statusCode === 201 && progresoDoc.archivo.documento.materia === 'Tecnologías Web') {
      console.log('✔ Subida de documento exitosa.');
    } else {
      console.error('✘ Falló subida de documento.');
    }

    // 4. Prueba 3: Obtener Biblioteca
    console.log('\n--- Prueba 3: Listar Biblioteca ---');
    const resListar = { ...mockRes };
    await obtenerBiblioteca(mockReq, resListar);
    console.log('Cantidad de elementos en biblioteca:', resListar.body.length);

    if (resListar.statusCode === 200 && resListar.body.length === 2) {
      console.log('✔ Listado de biblioteca exitoso.');
    } else {
      console.error('✘ Falló listado de biblioteca.');
    }

    // 5. Prueba 4: Editar Metadatos
    console.log('\n--- Prueba 4: Editar Metadatos del Libro ---');
    const reqEditar = {
      ...mockReq,
      params: { id: progresoLibro.archivo_id.toString() },
      body: {
        titulo: 'Don Quijote (Editado)',
        autor: 'Cervantes Saavedra',
        genero: 'Caballería'
      }
    };
    const resEditar = { ...mockRes };
    await editarArchivo(reqEditar, resEditar);
    console.log('Resultado:', resEditar.statusCode);
    console.log('Mensaje:', resEditar.body.mensaje);
    console.log('Nuevo Título:', resEditar.body.archivo.titulo);
    console.log('Nuevo Autor:', resEditar.body.archivo.libro.autor);

    if (resEditar.statusCode === 200 && resEditar.body.archivo.titulo === 'Don Quijote (Editado)') {
      console.log('✔ Edición de metadatos exitosa.');
    } else {
      console.error('✘ Falló edición de metadatos.');
    }

    // 6. Prueba 5: Eliminar de la Biblioteca (Limpieza en cascada)
    console.log('\n--- Prueba 5: Eliminar de Biblioteca ---');
    
    // Eliminar el Libro
    const reqDeleteLibro = {
      ...mockReq,
      params: { id: progresoLibro.id.toString() }
    };
    const resDeleteLibro = { ...mockRes };
    await eliminarDeBiblioteca(reqDeleteLibro, resDeleteLibro);
    console.log('Eliminar Libro - Mensaje:', resDeleteLibro.body.mensaje);
    console.log('¿Eliminado físicamente de la nube?:', resDeleteLibro.body.archivoEliminadoFisicamente);

    // Eliminar el Documento
    const reqDeleteDoc = {
      ...mockReq,
      params: { id: progresoDoc.id.toString() }
    };
    const resDeleteDoc = { ...mockRes };
    await eliminarDeBiblioteca(reqDeleteDoc, resDeleteDoc);
    console.log('Eliminar Documento - Mensaje:', resDeleteDoc.body.mensaje);
    console.log('¿Eliminado físicamente de la nube?:', resDeleteDoc.body.archivoEliminadoFisicamente);

    if (resDeleteLibro.statusCode === 200 && resDeleteDoc.statusCode === 200) {
      console.log('✔ Eliminar de biblioteca exitoso.');
    } else {
      console.error('✘ Falló eliminar de biblioteca.');
    }

    // 7. Limpieza de base de datos
    await prisma.usuario.deleteMany({
      where: { correo: 'biblioteca_test@correo.com' }
    });
    console.log('\nBase de datos limpia.');

  } catch (err) {
    console.error('Error durante la prueba:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
