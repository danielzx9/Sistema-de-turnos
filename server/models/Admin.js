const { getPool } = require('../database/init');

class Admin {
  static async findByUsernameOrEmail(username, email) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM admins WHERE username = ? OR email = ?',
      [username, username]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM admins WHERE idadmins = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async create(adminData) {
    const pool = getPool();
    const { barbershop_id, username, email, password, name } = adminData;
    const [result] = await pool.execute(
      'INSERT INTO admins (barbershop_id, username, email, password, name) VALUES (?, ?, ?, ?, ?)',
      [barbershop_id, username, email, password, name]
    );
    return result.insertId;
  }

  static async updatePassword(id, hashedPassword) {
    const pool = getPool();
    await pool.execute(
      'UPDATE admins SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE idadmins = ?',
      [hashedPassword, id]
    );
  }

  static async findExisting(username, email) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT idadmins FROM admins WHERE username = ? OR email = ?',
      [username, email]
    );
    return rows.length > 0;
  }
}

module.exports = Admin;