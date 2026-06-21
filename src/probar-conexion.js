import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function comprobarConexion() {
  try {
    console.log('Intentando conectar a Neon DB...');
    await client.connect();
    console.log('¡Conectado con éxito!');
    
    const res = await client.query('SELECT NOW() as hora_servidor, current_database() as bd_actual;');
    console.log('Consulta ejecutada con éxito:');
    console.log(`- Hora del servidor Neon: ${res.rows[0].hora_servidor}`);
    console.log(`- Base de datos actual: ${res.rows[0].bd_actual}`);
  } catch (error) {
    console.error('Error de conexión a la base de datos:', error.message);
  } finally {
    await client.end();
  }
}

comprobarConexion();
