const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticateClient } = require('../middleware/auth');

const prisma = new PrismaClient();

// POST /api/client-auth/register
router.post('/register', async (req, res) => {
  try {
    const { fullName, cpf, phone, birthDate, username, password } = req.body;

    if (!fullName || !cpf || !phone || !birthDate || !username || !password) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      return res.status(400).json({ error: 'CPF inválido' });
    }

    const existingCpf = await prisma.client.findUnique({ where: { cpf: cpfClean } });
    if (existingCpf) return res.status(409).json({ error: 'CPF já cadastrado' });

    const existingUser = await prisma.client.findUnique({ where: { username: username.toLowerCase().trim() } });
    if (existingUser) return res.status(409).json({ error: 'Nome de usuário já em uso' });

    const hashed = await bcrypt.hash(password, 10);
    const client = await prisma.client.create({
      data: {
        fullName,
        cpf: cpfClean,
        phone,
        birthDate: new Date(birthDate),
        username: username.toLowerCase().trim(),
        password: hashed
      },
      select: { id: true, fullName: true, username: true, phone: true }
    });

    const token = jwt.sign(
      { id: client.id, username: client.username, type: 'client' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({ client, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar cliente' });
  }
});

// POST /api/client-auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    const client = await prisma.client.findUnique({
      where: { username: username.toLowerCase().trim() }
    });

    if (!client) return res.status(401).json({ error: 'Usuário ou senha incorretos' });

    const valid = await bcrypt.compare(password, client.password);
    if (!valid) return res.status(401).json({ error: 'Usuário ou senha incorretos' });

    const token = jwt.sign(
      { id: client.id, username: client.username, type: 'client' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      client: { id: client.id, fullName: client.fullName, username: client.username, phone: client.phone },
      token
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// GET /api/client-auth/me — perfil + histórico + contagem de visitas
router.get('/me', authenticateClient, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: {
        id: true,
        fullName: true,
        username: true,
        phone: true,
        birthDate: true,
        createdAt: true,
        appointments: {
          include: {
            professional: { select: { name: true, avatarColor: true } },
            services: { include: { service: { select: { name: true, price: true } } } }
          },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

    const totalVisits = client.appointments.filter(a => a.status === 'COMPLETED').length;
    const upcoming = client.appointments.filter(a => a.status === 'SCHEDULED' && new Date(a.date) > new Date());
    const past = client.appointments.filter(a => a.status !== 'SCHEDULED' || new Date(a.date) <= new Date());

    res.json({ ...client, totalVisits, upcoming, past });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

module.exports = router;

// PATCH /api/client-auth/photo — cliente atualiza própria foto
router.patch('/photo', authenticateClient, async (req, res) => {
  try {
    const { photo } = req.body;
    if (!photo) return res.status(400).json({ error: 'Foto é obrigatória' });

    await prisma.client.update({
      where: { id: req.client.id },
      data: { photo }
    });

    res.json({ message: 'Foto atualizada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar foto' });
  }
});