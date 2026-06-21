import { importarDesdeGutendex } from '../src/controllers/biblioteca.controller.js';
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
    console.log('Iniciando prueba de Importación desde Gutendex...');

    // 1. Crear usuario de prueba
    await prisma.usuario.deleteMany({
      where: { correo: 'gutendex_test@correo.com' }
    });

    const salt = await bcrypt.genSalt(10);
    const pwd = await bcrypt.hash('password_123', salt);
    const usuario = await prisma.usuario.create({
      data: {
        nombre_usuario: 'usuario_guten_test',
        correo: 'gutendex_test@correo.com',
        password: pwd,
        proveedor: 'LOCAL',
        rol: 'USER',
        estado: 'ACTIVE'
      }
    });

    const mockReq = { 
      usuario: { id: usuario.id },
      body: { gutenbergId: 11 } // Alice's Adventures in Wonderland (ID: 11)
    };

    console.log('\n--- Descargando e Importando Libro ID 11 (Alice in Wonderland) ---');
    const resImportar = { ...mockRes };
    
    // Ejecutar la importación (descargará de Gutendex y subirá a Supabase real)
    await importarDesdeGutendex(mockReq, resImportar);
    
    console.log('Resultado HTTP:', resImportar.statusCode);
    if (resImportar.statusCode !== 201) {
      console.error('Error al importar:', resImportar.body);
      throw new Error('Fallo al importar el libro.');
    }

    const progreso = resImportar.body.progreso;
    console.log('Mensaje:', resImportar.body.mensaje);
    console.log('Libro creado ID:', progreso.archivo.id);
    console.log('Título:', progreso.archivo.titulo);
    console.log('Autor:', progreso.archivo.libro.autor);
    console.log('Género:', progreso.archivo.libro.genero);
    console.log('URL de EPUB (Supabase):', progreso.archivo.url_nube);
    console.log('URL de Portada (Supabase):', progreso.archivo.url_portada);

    if (progreso.archivo.titulo.includes('Alice') && progreso.archivo.url_nube && progreso.archivo.url_portada) {
      console.log('✔ Importación exitosa y portada guardada.');
    } else {
      console.error('✘ Falló validación de importación.');
    }

    // 2. Conservamos los archivos en Supabase y DB para inspección
    console.log('\n--- Conservando archivos en Supabase y Base de Datos para inspección ---');
    console.log('El usuario de prueba es: gutendex_test@correo.com');

  } catch (err) {
    console.error('Error durante la prueba:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
