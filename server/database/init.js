const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'database.sqlite');

let db;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
      } else {
        console.log('Conectado a la base de datos SQLite');
      }
    });
  }
  return db;
}

async function initializeDatabase() {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // Tabla de administradores
      database.run(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de servicios
      database.run(`
        CREATE TABLE IF NOT EXISTS services (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          duration INTEGER NOT NULL, -- duración en minutos
          price DECIMAL(10,2),
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de clientes
      database.run(`
        CREATE TABLE IF NOT EXISTS clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT,
          whatsapp TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de turnos/citas
      database.run(`
        CREATE TABLE IF NOT EXISTS appointments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER NOT NULL,
          service_id INTEGER NOT NULL,
          appointment_date DATE NOT NULL,
          appointment_time TIME NOT NULL,
          status TEXT DEFAULT 'pending', -- pending, confirmed, completed, cancelled
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients (id),
          FOREIGN KEY (service_id) REFERENCES services (id)
        )
      `);

      // Tabla de configuración del negocio
      database.run(`
        CREATE TABLE IF NOT EXISTS business_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          business_name TEXT NOT NULL,
          business_phone TEXT,
          business_address TEXT,
          business_email TEXT,
          open_time TEXT DEFAULT '09:00',
          close_time TEXT DEFAULT '18:00',
          slot_duration INTEGER DEFAULT 30, -- duración de cada slot en minutos
          working_days TEXT DEFAULT '1,2,3,4,5', -- días de la semana (1=lunes, 7=domingo)
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de horarios especiales (feriados, cierres, etc.)
      database.run(`
        CREATE TABLE IF NOT EXISTS special_schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          is_closed BOOLEAN DEFAULT 0,
          open_time TEXT,
          close_time TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insertar datos iniciales
      database.run(`
        INSERT OR IGNORE INTO business_config (
          business_name, business_phone, business_address, business_email
        ) VALUES (
          'Mi Barbería', '+1234567890', 'Dirección de ejemplo', 'contacto@mibarberia.com'
        )
      `);

      // Insertar servicios de ejemplo
      /*database.run(`
        INSERT OR IGNORE INTO services (name, description, duration, price) VALUES
        ('Corte de cabello', 'Corte de cabello profesional', 30, 15.00),
        ('Barba', 'Arreglo de barba y bigote', 20, 10.00),
        ('Corte + Barba', 'Corte de cabello y arreglo de barba', 45, 22.00),
        ('Lavado de cabello', 'Lavado y peinado', 15, 8.00)
      `);*/

      // Insertar admin por defecto (password: admin123)
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      
      database.run(`
        INSERT OR IGNORE INTO admins (
          username, email, password, name
        ) VALUES (
          'admin', 'admin@mibarberia.com', ?, 'Administrador'
        )
      `, [hashedPassword], (err) => {
        if (err) {
          console.error('Error al crear admin por defecto:', err);
        } else {
          console.log('✅ Admin por defecto creado (usuario: admin, contraseña: admin123)');
        }
      });

      console.log('✅ Tablas de base de datos creadas correctamente');
      resolve();
    });
  });
}

function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error al cerrar la base de datos:', err.message);
      } else {
        console.log('Base de datos cerrada correctamente');
      }
    });
  }
}

module.exports = {
  getDatabase,
  initializeDatabase,
  closeDatabase
};
