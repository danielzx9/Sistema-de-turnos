const { getPool } = require('../database/init');

class SpecialSchedule {
  static async findAll(barbershopId, filters = {}) {
    const pool = getPool();
    let query = 'SELECT * FROM special_schedules WHERE barbershop_id = ?';
    const params = [barbershopId];

    if (filters.startDate) {
      query += ' AND date >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND date <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY date';

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async create(scheduleData) {
    const pool = getPool();
    const { barbershop_id, date, is_closed, open_time, close_time, notes } = scheduleData;
    const [result] = await pool.execute(
      'INSERT INTO special_schedules (barbershop_id, date, is_closed, open_time, close_time, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [barbershop_id, date, is_closed, open_time || null, close_time || null, notes || null]
    );
    return result.insertId;
  }

  static async delete(id, barbershopId) {
    const pool = getPool();
    const [result] = await pool.execute(
      'DELETE FROM special_schedules WHERE idspecial_schedules = ? AND barbershop_id = ?',
      [id, barbershopId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = SpecialSchedule;