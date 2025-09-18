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
    // Crear tablas en orden correcto (primero las que no tienen FK)
    const tables = [
      // Tabla de barberías
      `CREATE TABLE IF NOT EXISTS barbershops (
        idbarbershops INT NOT NULL AUTO_INCREMENT,
        business_name VARCHAR(45) NOT NULL,
        business_phone VARCHAR(45) NULL,
        business_address VARCHAR(45) NULL,
        business_email VARCHAR(45) NULL,
        open_time VARCHAR(45) NULL DEFAULT '8:00',
        close_time VARCHAR(45) NULL DEFAULT '18:00',
        slot_duration INT NULL DEFAULT '30',
        working_days VARCHAR(45) NULL DEFAULT '1,2,3,4,5,6',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (idbarbershops)
      ) ENGINE = InnoDB`,

      // Tabla de administradores
      `CREATE TABLE IF NOT EXISTS admins (
        idadmins INT NOT NULL AUTO_INCREMENT,
        barbershop_id INT NULL,
        username VARCHAR(45) NOT NULL,
        email VARCHAR(45) NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(45) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (idadmins),
        UNIQUE KEY unique_username (username),
        UNIQUE KEY unique_email (email),
        CONSTRAINT fk_admins_1
          FOREIGN KEY (barbershop_id)
          REFERENCES barbershops (idbarbershops)
          ON DELETE NO ACTION
          ON UPDATE NO ACTION
      ) ENGINE = InnoDB`,

      // Alter table to ensure password column is VARCHAR(255)
      `ALTER TABLE admins MODIFY COLUMN password VARCHAR(255) NOT NULL`,

      // Tabla de barberos
      `CREATE TABLE IF NOT EXISTS barbers (
        idbarbers INT NOT NULL AUTO_INCREMENT,
        barbershop_id INT NOT NULL,
        name VARCHAR(45) NOT NULL,
        phone VARCHAR(45) NULL,
        is_active TINYINT NULL DEFAULT 1,
        created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (idbarbers),
        CONSTRAINT fk_barbers_1
          FOREIGN KEY (barbershop_id)
          REFERENCES barbershops (idbarbershops)
          ON DELETE NO ACTION
          ON UPDATE NO ACTION
      ) ENGINE = InnoDB`,

      // Tabla de servicios
      `CREATE TABLE IF NOT EXISTS services (
        idservices INT NOT NULL AUTO_INCREMENT,
        barbershop_id INT NULL,
        name VARCHAR(45) NOT NULL,
        description VARCHAR(45) NULL,
        duration INT NOT NULL,
        price DECIMAL(10,2) NULL,
        is_active TINYINT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (idservices),
        CONSTRAINT fk_services_1
          FOREIGN KEY (barbershop_id)
          REFERENCES barbershops (idbarbershops)
          ON DELETE NO ACTION
          ON UPDATE NO ACTION
      ) ENGINE = InnoDB`,

      // Tabla de clientes
      `CREATE TABLE IF NOT EXISTS clients (
        idclients INT NOT NULL AUTO_INCREMENT,
        barbershop_id INT NULL,
        name VARCHAR(45) NOT NULL,
        phone VARCHAR(45) NOT NULL,
        email VARCHAR(45) NULL,
        whatsapp VARCHAR(45) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (idclients),
        CONSTRAINT barber
          FOREIGN KEY (barbershop_id)
          REFERENCES barbershops (idbarbershops)
          ON DELETE NO ACTION
          ON UPDATE NO ACTION
      ) ENGINE = InnoDB`,

      // Tabla de turnos/citas
      `CREATE TABLE IF NOT EXISTS appointments (
        idappointments INT NOT NULL AUTO_INCREMENT,
        client_id INT NOT NULL,
        service_id INT NULL,
        barbershop_id INT NULL,
        barber_id INT NULL,
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        status ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
        notes VARCHAR(45) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (idappointments),
        CONSTRAINT clientId
          FOREIGN KEY (client_id)
          REFERENCES clients (idclients)
          ON DELETE NO ACTION
          ON UPDATE NO ACTION,
        CONSTRAINT serviceId
          FOREIGN KEY (service_id)
          REFERENCES services (idservices)
          ON DELETE NO ACTION
          ON UPDATE NO ACTION,
        CONSTRAINT fk_appointments_1
          FOREIGN KEY (barbershop_id)
          REFERENCES barbershops (idbarbershops)
          ON DELETE NO ACTION
          ON UPDATE NO ACTION,
        CONSTRAINT fk_appointments_2
          FOREIGN KEY (barber_id)
          REFERENCES barbers (idbarbers)
          ON DELETE NO ACTION
          ON UPDATE NO ACTION
      ) ENGINE = InnoDB`,

      // Tabla de horarios especiales
      `CREATE TABLE IF NOT EXISTS special_schedules (
        idspecial_schedules INT NOT NULL AUTO_INCREMENT,
        barbershop_id INT NULL,
        date DATE NOT NULL,
        is_closed TINYINT NULL DEFAULT 0,
        open_time VARCHAR(45) NULL,
        close_time VARCHAR(45) NULL,
        notes VARCHAR(45) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (idspecial_schedules),
        CONSTRAINT fk_special_schedules_1
          FOREIGN KEY (barbershop_id)
          REFERENCES barbershops (idbarbershops)
          ON DELETE NO ACTION
          ON UPDATE NO ACTION
      ) ENGINE = InnoDB`,

      // Tabla de servicios de barberos
      `CREATE TABLE IF NOT EXISTS barber_services (
        idbarber_services INT NOT NULL AUTO_INCREMENT,
        barber_id INT NULL,
        service_id INT NULL,
        PRIMARY KEY (idbarber_services),
        CONSTRAINT fk_barber_services_1
          FOREIGN KEY (barber_id)
          REFERENCES barbers (idbarbers)
          ON DELETE NO ACTION
          ON UPDATE NO ACTION,
        CONSTRAINT fk_barber_services_2
          FOREIGN KEY (service_id)
          REFERENCES services (idservices)
          ON DELETE NO ACTION
          ON UPDATE NO ACTION
      ) ENGINE = InnoDB`
    ];

    // Ejecutar creación de tablas
    for (const tableSQL of tables) {
      await pool.execute(tableSQL);
    }

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
