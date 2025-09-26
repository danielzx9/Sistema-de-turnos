const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');

class AuthController {
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      const admin = await Admin.findByUsernameOrEmail(username, username);

      if (!admin) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

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
  }

  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, name } = req.body;

      const existing = await Admin.findExisting(username, email);
      if (existing) {
        return res.status(400).json({ error: 'Usuario o email ya existe' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const userId = await Admin.create({
        barbershop_id: 1,
        username,
        email,
        password: hashedPassword,
        name
      });

      res.status(201).json({
        message: 'Usuario creado exitosamente',
        userId
      });
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static verifyToken(req, res) {
    res.json({
      valid: true,
      user: req.user
    });
  }

  static async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      const admin = await Admin.findById(req.user.id);

      if (!admin) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Contraseña actual incorrecta' });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      await Admin.updatePassword(req.user.id, hashedNewPassword);

      res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = AuthController;