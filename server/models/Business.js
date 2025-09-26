const { getPool } = require('../database/init');

class Business {
  static async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT idbarbershops as id, business_name, business_phone, business_address, business_email, open_time, close_time, slot_duration, working_days, created_at, updated_at FROM barbershops WHERE idbarbershops = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async update(id, businessData) {
    const pool = getPool();
    const { business_name, business_phone, business_address, business_email, open_time, close_time, slot_duration, working_days } = businessData;
    const [result] = await pool.execute(
      `UPDATE barbershops SET
        business_name = ?,
        business_phone = ?,
        business_address = ?,
        business_email = ?,
        open_time = ?,
        close_time = ?,
        slot_duration = ?,
        working_days = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE idbarbershops = ?`,
      [
        business_name,
        business_phone || null,
        business_address || null,
        business_email || null,
        open_time,
        close_time,
        slot_duration,
        working_days || '1,2,3,4,5,6',
        id
      ]
    );
    return result.affectedRows > 0;
  }

  static async getStats(barbershopId, dateFilter = {}) {
    const pool = getPool();
    const { startDate, endDate } = dateFilter;
    let dateCondition = '';
    const params = [barbershopId];

    if (startDate && endDate) {
      dateCondition = 'AND a.appointment_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const queries = {
      totalAppointments: `SELECT COUNT(*) as count FROM appointments a WHERE a.barbershop_id = ? ${dateCondition}`,
      completedAppointments: `SELECT COUNT(*) as count FROM appointments a WHERE a.barbershop_id = ? ${dateCondition} AND a.status = 'completed'`,
      pendingAppointments: `SELECT COUNT(*) as count FROM appointments a WHERE a.barbershop_id = ? ${dateCondition} AND a.status = 'pending'`,
      totalRevenue: `SELECT COALESCE(SUM(s.price), 0) as total FROM appointments a JOIN services s ON a.service_id = s.idservices WHERE a.barbershop_id = ? ${dateCondition} AND a.status = 'completed'`,
      popularServices: `SELECT s.name, COUNT(*) as count FROM appointments a JOIN services s ON a.service_id = s.idservices WHERE a.barbershop_id = ? ${dateCondition} AND a.status = 'completed' GROUP BY s.idservices, s.name ORDER BY count DESC LIMIT 5`
    };

    const results = {};

    for (const [key, query] of Object.entries(queries)) {
      try {
        const [rows] = await pool.execute(query, params);
        if (key === 'popularServices') {
          results[key] = rows;
        } else {
          results[key] = rows[0].count || rows[0].total || 0;
        }
      } catch (error) {
        console.error(`Error en query ${key}:`, error);
        results[key] = key === 'popularServices' ? [] : 0;
      }
    }

    return results;
  }

  static async findByPhone(phone) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM barbershops WHERE business_phone = ? LIMIT 1',
      [phone]
    );
    return rows[0] || null;
  }
}

module.exports = Business;