const { getPool } = require('../database/init');

class Service {
  static async findAll(barbershopId, includeInactive = false) {
    const pool = getPool();
    const activeCondition = includeInactive ? '' : ' AND is_active = 1';
    const [rows] = await pool.execute(
      `SELECT idservices as id, barbershop_id, name, description, duration, price, is_active, created_at, updated_at
       FROM services WHERE barbershop_id = ?${activeCondition} ORDER BY name`,
      [barbershopId]
    );
    return rows;
  }

  static async findById(id, barbershopId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT idservices as id, barbershop_id, name, description, duration, price, is_active, created_at, updated_at FROM services WHERE idservices = ? AND barbershop_id = ? LIMIT 1',
      [id, barbershopId]
    );
    return rows[0] || null;
  }

  static async create(serviceData) {
    const pool = getPool();
    const { barbershop_id, name, description, duration, price } = serviceData;
    const [result] = await pool.execute(
      'INSERT INTO services (barbershop_id, name, description, duration, price) VALUES (?, ?, ?, ?, ?)',
      [barbershop_id, name, description || null, duration, price]
    );
    return result.insertId;
  }

  static async update(id, serviceData, barbershopId) {
    const pool = getPool();
    const { name, description, duration, price, is_active } = serviceData;
    const [result] = await pool.execute(
      'UPDATE services SET name = ?, description = ?, duration = ?, price = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE idservices = ? AND barbershop_id = ?',
      [name, description || null, duration, price, is_active !== undefined ? is_active : 1, id, barbershopId]
    );
    return result.affectedRows > 0;
  }

  static async deactivate(id, barbershopId) {
    const pool = getPool();
    const [result] = await pool.execute(
      'UPDATE services SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE idservices = ? AND barbershop_id = ?',
      [id, barbershopId]
    );
    return result.affectedRows > 0;
  }

  static async delete(id, barbershopId) {
    const pool = getPool();
    const [result] = await pool.execute(
      'DELETE FROM services WHERE idservices = ? AND barbershop_id = ?',
      [id, barbershopId]
    );
    return result.affectedRows > 0;
  }

  static async hasPendingAppointments(id, barbershopId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM appointments WHERE service_id = ? AND barbershop_id = ? AND status IN ("pending", "confirmed")',
      [id, barbershopId]
    );
    return rows[0].count > 0;
  }

  static async hasAnyAppointments(id, barbershopId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM appointments WHERE service_id = ? AND barbershop_id = ?',
      [id, barbershopId]
    );
    return rows[0].count > 0;
  }

  static async findActiveByBarbershopId(barbershopId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT idservices as id, barbershop_id, name, description, duration, price, is_active, created_at, updated_at FROM services WHERE is_active = 1 AND barbershop_id = ? ORDER BY name',
      [barbershopId]
    );
    return rows;
  }
}

module.exports = Service;