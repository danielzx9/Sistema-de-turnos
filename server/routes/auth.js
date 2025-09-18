const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getPool } = require('../database/init');

const router = express.Router();

// Middleware para verificar token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Login
router.post('/login', [
  body('username').notEmpty().withMessage('Usuario es requerido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const pool = getPool();

    try {
      const [rows] = await pool.execute(
        'SELECT * FROM admins WHERE username = ? OR email = ?',
        [username, username]
      );

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const admin = rows[0];
      const isValidPassword = await bcrypt.compare(password, admin.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const token = jwt.sign(
        {
          id: admin.idadmins,
          barbershop_id: admin.barbershop_id,
          username: admin.username,
          email: admin.email
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        message: 'Login exitoso',
        token,
        user: {
          id: admin.idadmins,
          barbershop_id: admin.barbershop_id,
          username: admin.username,
          email: admin.email,
          name: admin.name
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Registro de nuevo admin
router.post('/register', [
  body('username').isLength({ min: 3 }).withMessage('Usuario debe tener al menos 3 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres'),
  body('name').notEmpty().withMessage('Nombre es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, name } = req.body;
    const pool = getPool();

    try {
      // Verificar si el usuario ya existe
      const [existingRows] = await pool.execute(
        'SELECT idadmins FROM admins WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existingRows.length > 0) {
        return res.status(400).json({ error: 'Usuario o email ya existe' });
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear nuevo admin (por defecto asignado a la barbería 1)
      const [result] = await pool.execute(
        'INSERT INTO admins (barbershop_id, username, email, password, name) VALUES (?, ?, ?, ?, ?)',
        [1, username, email, hashedPassword, name]
      );

      res.status(201).json({
        message: 'Usuario creado exitosamente',
        userId: result.insertId
      });
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// Cambiar contraseña
router.put('/change-password', [
  authenticateToken,
  body('currentPassword').notEmpty().withMessage('Contraseña actual es requerida'),
  body('newPassword').isLength({ min: 6 }).withMessage('Nueva contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const pool = getPool();

    try {
      // Obtener admin actual
      const [rows] = await pool.execute(
        'SELECT password FROM admins WHERE idadmins = ?',
        [req.user.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const admin = rows[0];

      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Contraseña actual incorrecta' });
      }

      // Hash nueva contraseña
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Actualizar contraseña
      await pool.execute(
        'UPDATE admins SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE idadmins = ?',
        [hashedNewPassword, req.user.id]
      );

      res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = { router, authenticateToken };
