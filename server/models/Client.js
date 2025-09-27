const { getPool } = require('../database/init');

class Client {
  static async findByPhone(phone, barbershopId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT idclients as id, barbershop_id, name, phone, email, whatsapp, created_at, updated_at FROM clients WHERE phone = ? AND barbershop_id = ? LIMIT 1',
      [phone, barbershopId]
    );
    return rows[0] || null;
  }

  static async create(clientData) {
    const pool = getPool();
    const { barbershop_id, name, phone, email } = clientData;
    const [result] = await pool.execute(
      'INSERT INTO clients (barbershop_id, name, phone, email) VALUES (?, ?, ?, ?)',
      [barbershop_id, name, phone, email || null]
    );
    return result.insertId;
  }

  static async update(id, clientData) {
    const pool = getPool();
    const { name, email } = clientData;
    await pool.execute(
      'UPDATE clients SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE idclients = ?',
      [name, email || null, id]
    );
  }
}

module.exports = Client;