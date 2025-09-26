const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mydb',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

async function initializeDatabase() {
  const pool = getPool();

  try {

    // Insertar datos iniciales
    await insertInitialData(pool);

    console.log('✅ Base de datos MySQL inicializada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    throw error;
  }
}

async function insertInitialData(pool) {
  try {
    // Verificar si ya existe una barbería
    const [existingBarbershops] = await pool.execute(
      'SELECT idbarbershops FROM barbershops LIMIT 1'
    );

    if (existingBarbershops.length === 0) {
      // Insertar barbería por defecto
      const [barbershopResult] = await pool.execute(
        `INSERT INTO barbershops (
          business_name, business_phone, business_address, business_email
        ) VALUES (?, ?, ?, ?)`,
        ['Mi Barbería', '+1234567890', 'Dirección de ejemplo', 'contacto@mibarberia.com']
      );

      const barbershopId = barbershopResult.insertId;

      // Insertar admin por defecto (password: admin123)
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await pool.execute(
        `INSERT INTO admins (
          barbershop_id, username, email, password, name
        ) VALUES (?, ?, ?, ?, ?)`,
        [barbershopId, 'admin', 'admin@mibarberia.com', hashedPassword, 'Administrador']
      );

      // Insertar barbero por defecto
      const [barberResult] = await pool.execute(
        `INSERT INTO barbers (
          barbershop_id, name, phone
        ) VALUES (?, ?, ?)`,
        [barbershopId, 'Barbero Principal', '+1234567890']
      );

      const barberId = barberResult.insertId;

      // Insertar servicios de ejemplo
      const services = [
        ['Corte de cabello', 'Corte de cabello profesional', 30, 15.00],
        ['Barba', 'Arreglo de barba y bigote', 20, 10.00],
        ['Corte + Barba', 'Corte de cabello y arreglo de barba', 45, 22.00],
        ['Lavado de cabello', 'Lavado y peinado', 15, 8.00]
      ];

      for (const [name, description, duration, price] of services) {
        const [serviceResult] = await pool.execute(
          `INSERT INTO services (
            barbershop_id, name, description, duration, price
          ) VALUES (?, ?, ?, ?, ?)`,
          [barbershopId, name, description, duration, price]
        );

        // Asignar servicio al barbero
        await pool.execute(
          `INSERT INTO barber_services (barber_id, service_id) VALUES (?, ?)`,
          [barberId, serviceResult.insertId]
        );
      }

      console.log('✅ Datos iniciales insertados correctamente');
    } else {
      console.log('ℹ️ Datos iniciales ya existen, omitiendo inserción');
    }
  } catch (error) {
    console.error('❌ Error al insertar datos iniciales:', error);
  }
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Base de datos cerrada correctamente');
  }
}

module.exports = {
  getPool,
  initializeDatabase,
  closeDatabase
};
