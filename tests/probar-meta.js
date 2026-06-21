import { establecerMeta, obtenerMeta } from '../src/controllers/gamificacion.controller.js';
import { subirArchivoPersonal } from '../src/controllers/biblioteca.controller.js';
import { actualizarProgreso } from '../src/controllers/progreso.controller.js';
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
    console.log('Iniciando prueba de Metas Literarias...');

    await prisma.usuario.deleteMany({
      where: { correo: 'meta_test@correo.com' }
    });

    const salt = await bcrypt.genSalt(10);
    const pwd = await bcrypt.hash('password_123', salt);
    const usuario = await prisma.usuario.create({
      data: {
        nombre_usuario: 'usuario_meta_test',
        correo: 'meta_test@correo.com',
        password: pwd,
        proveedor: 'LOCAL',
        rol: 'USER',
        estado: 'ACTIVE'
      }
    });

    const mockReq = { usuario: { id: usuario.id } };

    console.log('\n--- Prueba 1: Establecer Meta Literaria (5 libros para 2026) ---');
    const reqSetMeta = {
      ...mockReq,
      body: {
        anio: 2026,
        libros_objetivo: 5
      }
    };
    const resSetMeta = { ...mockRes };
    await establecerMeta(reqSetMeta, resSetMeta);

    console.log('Resultado:', resSetMeta.statusCode);
    console.log('Mensaje:', resSetMeta.body.mensaje);
    console.log('Meta ID:', resSetMeta.body.meta.id);
    console.log('Anio:', resSetMeta.body.meta.anio);
    console.log('Libros Objetivo:', resSetMeta.body.meta.libros_objetivo);

    if (resSetMeta.statusCode === 200 && resSetMeta.body.meta.libros_objetivo === 5) {
      console.log('✔ Meta establecida con éxito.');
    } else {
      console.error('✘ Falló establecimiento de meta.');
    }

    console.log('\n--- Prueba 2: Obtener Meta Inicial (debe ser 0% completado) ---');
    const reqGetMeta = {
      ...mockReq,
      params: { anio: '2026' }
    };
    const resGetMeta = { ...mockRes };
    await obtenerMeta(reqGetMeta, resGetMeta);

    console.log('Resultado:', resGetMeta.statusCode);
    console.log('Libros Objetivo:', resGetMeta.body.libros_objetivo);
    console.log('Libros Completados:', resGetMeta.body.libros_completados);
    console.log('Porcentaje Progreso:', resGetMeta.body.progreso_porcentaje);

    if (resGetMeta.statusCode === 200 && resGetMeta.body.libros_completados === 0) {
      console.log('✔ Meta obtenida correctamente con 0% de avance.');
    } else {
      console.error('✘ Falló consulta de meta inicial.');
    }

    console.log('\n--- Subiendo y Completando un Libro ---');
    const reqSubir = {
      ...mockReq,
      body: {
        tipo: 'libro',
        titulo: 'Metamorfosis',
        autor: 'Franz Kafka',
        genero: 'Drama'
      },
      files: {
        archivo: [{
          buffer: Buffer.from('mock metadata content'),
          originalname: 'metamorfosis.epub',
          mimetype: 'application/epub+zip'
        }]
      }
    };
    const resSubir = { ...mockRes };
    await subirArchivoPersonal(reqSubir, resSubir);

    const progresoId = resSubir.body.progreso.id;

    const reqCompletar = {
      ...mockReq,
      params: { id: progresoId.toString() },
      body: {
        estado_lectura: 'COMPLETED',
        pagina_actual: 100
      }
    };
    const resCompletar = { ...mockRes };
    await actualizarProgreso(reqCompletar, resCompletar);

    console.log('\n--- Prueba 3: Re-obtener Meta y comprobar avance ---');
    const resGetMetaFinal = { ...mockRes };
    await obtenerMeta(reqGetMeta, resGetMetaFinal);

    console.log('Resultado:', resGetMetaFinal.statusCode);
    console.log('Libros Objetivo:', resGetMetaFinal.body.libros_objetivo);
    console.log('Libros Completados:', resGetMetaFinal.body.libros_completados);
    console.log('Porcentaje Progreso:', resGetMetaFinal.body.progreso_porcentaje);

    if (
      resGetMetaFinal.statusCode === 200 &&
      resGetMetaFinal.body.libros_completados === 1 &&
      resGetMetaFinal.body.progreso_porcentaje === 20
    ) {
      console.log('✔ Avance de meta y porcentaje calculado correctamente (20%).');
    } else {
      console.error('✘ Falló cálculo de progreso de la meta.');
    }

    console.log('\n--- Conservando datos de meta para inspección ---');
    console.log('El usuario de prueba es: meta_test@correo.com');

  } catch (err) {
    console.error('Error durante la prueba:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
