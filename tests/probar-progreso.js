import { subirArchivoPersonal } from '../src/controllers/biblioteca.controller.js';
import { 
  actualizarProgreso, 
  registrarSesionLectura, 
  crearAnotacion, 
  obtenerAnotaciones 
} from '../src/controllers/progreso.controller.js';
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
    console.log('Iniciando prueba de Progreso de Lectura y Anotaciones...');

    await prisma.usuario.deleteMany({
      where: { correo: 'progreso_test@correo.com' }
    });

    const salt = await bcrypt.genSalt(10);
    const pwd = await bcrypt.hash('password_123', salt);
    const usuario = await prisma.usuario.create({
      data: {
        nombre_usuario: 'usuario_progreso_test',
        correo: 'progreso_test@correo.com',
        password: pwd,
        proveedor: 'LOCAL',
        rol: 'USER',
        estado: 'ACTIVE'
      }
    });

    const mockReq = { usuario: { id: usuario.id } };

    console.log('\n--- Subiendo libro de prueba ---');
    const reqLibro = {
      ...mockReq,
      body: {
        tipo: 'libro',
        titulo: 'El Principito',
        autor: 'Antoine de Saint-Exupéry',
        genero: 'Fantasía'
      },
      files: {
        archivo: [{
          buffer: Buffer.from('mock principito epub'),
          originalname: 'principito.epub',
          mimetype: 'application/epub+zip'
        }]
      }
    };
    const resLibro = { ...mockRes };
    await subirArchivoPersonal(reqLibro, resLibro);
    
    if (resLibro.statusCode !== 201) {
      console.error('Error al subir libro base:', resLibro.body);
      throw new Error('Fallo al subir libro base.');
    }

    const progresoId = resLibro.body.progreso.id;
    console.log('Libro subido con éxito. ID ProgresoUsuario:', progresoId);

    console.log('\n--- Prueba 1: Actualizar Progreso de Lectura ---');
    const reqProgreso = {
      ...mockReq,
      params: { id: progresoId.toString() },
      body: {
        pagina_actual: 15,
        estado_lectura: 'READING',
        calificacion_personal: 5,
        resena_personal: '¡Increíble libro!'
      }
    };
    const resProgreso = { ...mockRes };
    await actualizarProgreso(reqProgreso, resProgreso);

    console.log('Resultado:', resProgreso.statusCode);
    console.log('Mensaje:', resProgreso.body.mensaje);
    console.log('Página actual guardada:', resProgreso.body.progreso.pagina_actual);
    console.log('Estado de lectura:', resProgreso.body.progreso.estado_lectura);

    if (resProgreso.statusCode === 200 && resProgreso.body.progreso.pagina_actual === 15) {
      console.log('✔ Actualización de progreso exitosa.');
    } else {
      console.error('✘ Falló actualización de progreso.');
    }

    console.log('\n--- Prueba 2: Registrar Sesión de Lectura (Gamificación) ---');
    const reqSesion = {
      ...mockReq,
      params: { id: progresoId.toString() },
      body: {
        duracion_minutos: 25,
        paginas_leidas: 10
      }
    };
    const resSesion = { ...mockRes };
    await registrarSesionLectura(reqSesion, resSesion);

    console.log('Resultado:', resSesion.statusCode);
    console.log('Mensaje:', resSesion.body.mensaje);
    console.log('Sesión registrada - Páginas leídas:', resSesion.body.sesion.paginas_leidas);
    console.log('Duración (min):', resSesion.body.sesion.duracion_minutos);

    if (resSesion.statusCode === 201 && resSesion.body.sesion.paginas_leidas === 10) {
      console.log('✔ Registro de sesión de lectura exitoso.');
    } else {
      console.error('✘ Falló registro de sesión.');
    }

    console.log('\n--- Prueba 3: Crear Anotación ---');
    const reqAnotacion = {
      ...mockReq,
      body: {
        progreso_usuario_id: progresoId,
        marcador_posicion: 'epubcfi(/6/2[chap01]!/4/2/10/1:0)',
        texto_resaltado: 'Sólo se ve bien con el corazón. Lo esencial es invisible a los ojos.',
        nota_usuario: 'Mi frase favorita de toda la literatura.',
        color_hex: '#FFD700'
      }
    };
    const resAnotacion = { ...mockRes };
    await crearAnotacion(reqAnotacion, resAnotacion);

    console.log('Resultado:', resAnotacion.statusCode);
    console.log('Mensaje:', resAnotacion.body.mensaje);
    console.log('Texto Resaltado:', resAnotacion.body.anotacion.texto_resaltado);

    if (resAnotacion.statusCode === 201 && resAnotacion.body.anotacion.color_hex === '#FFD700') {
      console.log('✔ Creación de anotación exitosa.');
    } else {
      console.error('✘ Falló creación de anotación.');
    }

    console.log('\n--- Prueba 4: Obtener Anotaciones ---');
    const reqListarAnotaciones = {
      ...mockReq,
      params: { progresoUsuarioId: progresoId.toString() }
    };
    const resListarAnotaciones = { ...mockRes };
    await obtenerAnotaciones(reqListarAnotaciones, resListarAnotaciones);

    console.log('Resultado:', resListarAnotaciones.statusCode);
    console.log('Cantidad de anotaciones devueltas:', resListarAnotaciones.body.length);
    if (resListarAnotaciones.statusCode === 200 && resListarAnotaciones.body.length > 0) {
      console.log('Contenido de primera anotación:', resListarAnotaciones.body[0].texto_resaltado);
      console.log('✔ Obtención de anotaciones exitosa.');
    } else {
      console.error('✘ Falló obtención de anotaciones.');
    }

    console.log('\n--- Conservando progreso, sesiones y anotaciones en Base de Datos para inspección ---');
    console.log('El usuario de prueba es: progreso_test@correo.com');

  } catch (err) {
    console.error('Error durante la prueba:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
