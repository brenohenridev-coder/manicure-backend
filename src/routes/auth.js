const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    const professional = await prisma.professional.findUnique({
      where: { username: username.toLowerCase().trim() }
    });

    if (!professional || !professional.active) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos' });
    }

    const valid = await bcrypt.compare(password, professional.password);
    if (!valid) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos' });
    }

    const token = jwt.sign(
      { id: professional.id, username: professional.username, role: professional.role, name: professional.name, type: 'professional' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: professional.id,
        name: professional.name,
        username: professional.username,
        role: professional.role,
        avatarColor: professional.avatarColor,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const professional = await prisma.professional.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, username: true, role: true, avatarColor: true, active: true }
    });
    res.json(professional);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

module.exports = router;