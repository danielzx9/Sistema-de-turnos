const { getPool } = require('../database/init');

class Appointment {
  static async findAll(barbershopId, filters = {}) {
    const pool = getPool();
    let query = `
      SELECT
        a.idappointments as id,
        a.client_id,
        a.service_id,
        a.barbershop_id,
        a.barber_id,
        a.appointment_date,
        TIME(a.appointment_time) AS appointment_time,
        a.status,
        a.notes,
        a.created_at,
        a.updated_at,
        c.name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        s.name as service_name,
        s.duration as service_duration,
        s.price as service_price,
        b.name as barber_name
      FROM appointments a
      JOIN clients c ON a.client_id = c.idclients
      JOIN services s ON a.service_id = s.idservices
      LEFT JOIN barbers b ON a.barber_id = b.idbarbers
      WHERE a.barbershop_id = ?
    `;

    const params = [barbershopId];

    if (filters.date) {
      query += ' AND a.appointment_date = ?';
      params.push(filters.date);
    }

    if (filters.status) {
      query += ' AND a.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async findById(id, barbershopId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT
        a.idappointments as id,
        a.client_id,
        a.service_id,
        a.barbershop_id,
        a.barber_id,
        a.appointment_date,
        TIME(a.appointment_time) AS appointment_time,
        a.status,
        a.notes,
        a.created_at,
        a.updated_at,
        c.name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        s.name as service_name,
        s.duration as service_duration,
        s.price as service_price,
        b.name as barber_name
      FROM appointments a
      JOIN clients c ON a.client_id = c.idclients
      JOIN services s ON a.service_id = s.idservices
      LEFT JOIN barbers b ON a.barber_id = b.idbarbers
      WHERE a.idappointments = ? AND a.barbershop_id = ? LIMIT 1`,
      [id, barbershopId]
    );
    return rows[0] || null;
  }

  static async create(appointmentData) {
    const pool = getPool();
    const { client_id, service_id, barbershop_id, barber_id, appointment_date, appointment_time, notes } = appointmentData;
    const [result] = await pool.execute(
      'INSERT INTO appointments (client_id, service_id, barbershop_id, barber_id, appointment_date, appointment_time, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [client_id, service_id, barbershop_id, barber_id || null, appointment_date, appointment_time, notes || null]
    );
    return result.insertId;
  }

  static async updateStatus(id, status, barbershopId) {
    const pool = getPool();
    const [result] = await pool.execute(
      'UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE idappointments = ? AND barbershop_id = ?',
      [status, id, barbershopId]
    );
    return result.affectedRows > 0;
  }

  static async delete(id, barbershopId) {
    const pool = getPool();
    const [result] = await pool.execute(
      'DELETE FROM appointments WHERE idappointments = ? AND barbershop_id = ?',
      [id, barbershopId]
    );
    return result.affectedRows > 0;
  }

  static async findOccupiedSlots(date, time, barbershopId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT a.appointment_time, s.duration FROM appointments a JOIN services s ON a.service_id = s.idservices WHERE a.appointment_date = ? AND TIME_FORMAT(a.appointment_time, '%H:%i') = TIME_FORMAT(?, '%H:%i') AND a.barbershop_id = ? AND a.status IN ("pending", "confirmed") LIMIT 1`,
      [date, time, barbershopId]
    );
    return rows.length > 0;
  }



  static async findByPhone(phone, barbershopId) {
    const pool = getPool();
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    const phoneWithoutPlus = phone.startsWith('+') ? phone.substring(1) : phone;

    const [rows] = await pool.execute(`
      SELECT
        a.idappointments as id,
        a.client_id,
        a.service_id,
        a.barbershop_id,
        a.barber_id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.notes,
        a.created_at,
        a.updated_at,
        s.name as service_name,
        s.price
      FROM appointments a
      JOIN services s ON a.service_id = s.idservices
      JOIN clients c ON a.client_id = c.idclients
      WHERE (c.phone = ? OR c.phone = ?) AND a.status IN ('pending', 'confirmed') AND a.barbershop_id = ?
      ORDER BY a.appointment_date, a.appointment_time
    `, [normalizedPhone, phoneWithoutPlus, barbershopId]);

    return rows;
  }

  static async findBybotNumber(botNumberId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM barbershops WHERE business_phone = ? LIMIT 1',
      [botNumberId]
    );
    return rows[0] || null;
  }

  //Encontrar si el cliente tiene un turno pendiente 
  static async findByIdClient(IdClient) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT * FROM appointments WHERE client_id = ? AND (status = 'pending' OR status = 'confirmed')`,
      [IdClient]
    );
    return rows;
  }

  //encontrar el cliente por su numero de telefono
  static async findAppointmentByClientId(botNumberId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT idclients FROM clients WHERE phone = ? LIMIT 1`,
      [botNumberId]
    );
    return rows[0] || null;
  }

  static async getOccupiedSlotsByDate(date, barbershopId, barberId = null) {
    const pool = getPool();

    let query = `
      SELECT
        TIME_FORMAT(a.appointment_time, '%H:%i') as appointment_time,
        s.duration
      FROM appointments a
      JOIN services s ON a.service_id = s.idservices
      WHERE
        a.appointment_date = ? AND
        a.barbershop_id = ? AND
        a.status IN ('pending', 'confirmed')
    `;

    const params = [date, barbershopId];

    if (barberId) {
      query += ' AND a.barber_id = ?';
      params.push(barberId);
    }

    query += ' ORDER BY a.appointment_time ASC';

    const [rows] = await pool.execute(query, params);
    return rows;
  }
}

module.exports = Appointment;