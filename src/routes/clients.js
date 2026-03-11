const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/clients (authenticated - with search)
router.get('/', authenticate, async (req, res) => {
  try {
    const { search } = req.query;
    const clients = await prisma.client.findMany({
      where: search ? {
        fullName: { contains: search, mode: 'insensitive' }
      } : {},
      orderBy: { fullName: 'asc' },
      include: {
        appointments: {
          orderBy: { date: 'desc' },
          take: 1,
          select: { date: true, paid: true, status: true }
        }
      }
    });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

// POST /api/clients (public - for booking)
router.post('/', async (req, res) => {
  try {
    const { fullName, cpf, phone, birthDate } = req.body;
    if (!fullName || !cpf || !phone || !birthDate) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Clean CPF
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return res.status(400).json({ error: 'CPF inválido' });
    }

    // Check if CPF already exists
    const existing = await prisma.client.findUnique({ where: { cpf: cleanCpf } });
    if (existing) {
      // Return existing client (for rebooking)
      return res.json({ ...existing, isExisting: true });
    }

    const client = await prisma.client.create({
      data: { fullName, cpf: cleanCpf, phone, birthDate: new Date(birthDate) }
    });

    res.status(201).json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar cliente' });
  }
});

// GET /api/clients/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        appointments: {
          include: {
            professional: { select: { name: true } },
            services: { include: { service: true } }
          },
          orderBy: { date: 'desc' }
        }
      }
    });
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
});

module.exports = router;
