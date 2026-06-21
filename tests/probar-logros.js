import { obtenerLogrosUsuario, establecerMeta } from '../src/controllers/gamificacion.controller.js';
import { subirArchivoPersonal } from '../src/controllers/biblioteca.controller.js';
import { registrarSesionLectura, actualizarProgreso } from '../src/controllers/progreso.controller.js';
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
    console.log('Iniciando prueba de Logros e Insignias...');

    await prisma.usuario.deleteMany({
      where: { correo: 'logros_test@correo.com' }
    });
    await prisma.logroUsuario.deleteMany({});
    await prisma.logro.deleteMany({});

    const salt = await bcrypt.genSalt(10);
    const pwd = await bcrypt.hash('password_123', salt);
    const usuario = await prisma.usuario.create({
      data: {
        nombre_usuario: 'usuario_logros_test',
        correo: 'logros_test@correo.com',
        password: pwd,
        proveedor: 'LOCAL',
        rol: 'USER',
        estado: 'ACTIVE'
      }
    });

    const mockReq = { usuario: { id: usuario.id } };

    console.log('\n--- Prueba 1: Obtener Logros Iniciales (todos bloqueados) ---');
    const resGetLogrosInit = { ...mockRes };
    await obtenerLogrosUsuario(mockReq, resGetLogrosInit);

    console.log('Resultado:', resGetLogrosInit.statusCode);
    console.log('Cantidad de logros en el sistema:', resGetLogrosInit.body.length);
    const todosBloqueados = resGetLogrosInit.body.every(l => l.desbloqueado === false);
    console.log('¿Todos bloqueados?:', todosBloqueados);

    if (resGetLogrosInit.statusCode === 200 && resGetLogrosInit.body.length === 4 && todosBloqueados) {
      console.log('✔ Logros iniciales cargados y bloqueados.');
    } else {
      console.error('✘ Falló validación de logros iniciales.');
    }

    console.log('\n--- Prueba 2: Subir Libro (debe desbloquear PRIMER_PASO) ---');
    const reqSubir = {
      ...mockReq,
      body: {
        tipo: 'libro',
        titulo: 'Moby Dick',
        autor: 'Herman Melville',
        genero: 'Aventuras'
      },
      files: {
        archivo: [{
          buffer: Buffer.from('mock moby content'),
          originalname: 'mobydick.epub',
          mimetype: 'application/epub+zip'
        }]
      }
    };
    const resSubir = { ...mockRes };
    await subirArchivoPersonal(reqSubir, resSubir);

    console.log('Resultado:', resSubir.statusCode);
    console.log('Logros desbloqueados en la respuesta:', resSubir.body.logros_desbloqueados.map(l => l.codigo_insignia));
    const tienePrimerPaso = resSubir.body.logros_desbloqueados.some(l => l.codigo_insignia === 'PRIMER_PASO');

    if (resSubir.statusCode === 201 && tienePrimerPaso) {
      console.log('✔ Logro "Primeros Pasos" desbloqueado exitosamente.');
    } else {
      console.error('✘ Falló desbloqueo de "Primeros Pasos".');
    }

    const progresoId = resSubir.body.progreso.id;

    console.log('\n--- Prueba 3: Registrar Sesión (debe desbloquear CONSTANCIA) ---');
    const reqSesion = {
      ...mockReq,
      params: { id: progresoId.toString() },
      body: {
        duracion_minutos: 20,
        paginas_leidas: 5
      }
    };
    const resSesion = { ...mockRes };
    await registrarSesionLectura(reqSesion, resSesion);

    console.log('Resultado:', resSesion.statusCode);
    console.log('Logros desbloqueados en la respuesta:', resSesion.body.logros_desbloqueados.map(l => l.codigo_insignia));
    const tieneConstancia = resSesion.body.logros_desbloqueados.some(l => l.codigo_insignia === 'CONSTANCIA');

    if (resSesion.statusCode === 201 && tieneConstancia) {
      console.log('✔ Logro "Lector Constante" desbloqueado exitosamente.');
    } else {
      console.error('✘ Falló desbloqueo de "Lector Constante".');
    }

    console.log('\n--- Estableciendo meta de 1 libro para el año actual ---');
    const anioActual = new Date().getFullYear();
    const reqMeta = {
      ...mockReq,
      body: {
        anio: anioActual,
        libros_objetivo: 1
      }
    };
    const resMeta = { ...mockRes };
    await establecerMeta(reqMeta, resMeta);

    console.log('\n--- Prueba 4: Completar Libro (debe desbloquear META_CUMPLIDA) ---');
    const reqCompletar = {
      ...mockReq,
      params: { id: progresoId.toString() },
      body: {
        estado_lectura: 'COMPLETED',
        pagina_actual: 300
      }
    };
    const resCompletar = { ...mockRes };
    await actualizarProgreso(reqCompletar, resCompletar);

    console.log('Resultado:', resCompletar.statusCode);
    console.log('Logros desbloqueados en la respuesta:', resCompletar.body.logros_desbloqueados.map(l => l.codigo_insignia));
    const tieneMetaCumplida = resCompletar.body.logros_desbloqueados.some(l => l.codigo_insignia === 'META_CUMPLIDA');

    if (resCompletar.statusCode === 200 && tieneMetaCumplida) {
      console.log('✔ Logro "Meta Cumplida" desbloqueado exitosamente.');
    } else {
      console.error('✘ Falló desbloqueo de "Meta Cumplida".');
    }

    console.log('\n--- Prueba 5: Listar logros final y comprobar estados ---');
    const resGetLogrosFinal = { ...mockRes };
    await obtenerLogrosUsuario(mockReq, resGetLogrosFinal);

    console.log('Resultado:', resGetLogrosFinal.statusCode);
    resGetLogrosFinal.body.forEach(l => {
      console.log(`- [${l.codigo_insignia}] ${l.nombre}: Desbloqueado = ${l.desbloqueado}`);
    });

    const primerPasoOk = resGetLogrosFinal.body.find(l => l.codigo_insignia === 'PRIMER_PASO').desbloqueado;
    const constanciaOk = resGetLogrosFinal.body.find(l => l.codigo_insignia === 'CONSTANCIA').desbloqueado;
    const metaCumplidaOk = resGetLogrosFinal.body.find(l => l.codigo_insignia === 'META_CUMPLIDA').desbloqueado;
    const devoradorOk = resGetLogrosFinal.body.find(l => l.codigo_insignia === 'DEVORADOR').desbloqueado;

    if (primerPasoOk && constanciaOk && metaCumplidaOk && !devoradorOk) {
      console.log('✔ Estados de logros finales correctos.');
    } else {
      console.error('✘ Falló validación de logros finales.');
    }

    console.log('\n--- Conservando datos de logros para inspección ---');
    console.log('El usuario de prueba es: logros_test@correo.com');

  } catch (err) {
    console.error('Error durante la prueba:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
