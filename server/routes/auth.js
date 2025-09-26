const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const AuthController = require('../controllers/AuthController');

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
], AuthController.login);

// Registro de nuevo admin
router.post('/register', [
  body('username').isLength({ min: 3 }).withMessage('Usuario debe tener al menos 3 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres'),
  body('name').notEmpty().withMessage('Nombre es requerido')
], AuthController.register);

// Verificar token
router.get('/verify', authenticateToken, AuthController.verifyToken);

// Cambiar contraseña
router.put('/change-password', [
  authenticateToken,
  body('currentPassword').notEmpty().withMessage('Contraseña actual es requerida'),
  body('newPassword').isLength({ min: 6 }).withMessage('Nueva contraseña debe tener al menos 6 caracteres')
], AuthController.changePassword);

module.exports = { router, authenticateToken };
