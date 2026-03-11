const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/services (public)
router.get('/', async (req, res) => {
  try {
    const services = await prisma.service.findMany({ where: { active: true } });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar serviços' });
  }
});

// GET /api/services/all (admin)
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const services = await prisma.service.findMany();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar serviços' });
  }
});

// POST /api/services (admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, duration, price } = req.body;
    if (!name || !duration || !price) {
      return res.status(400).json({ error: 'Nome, duração e preço são obrigatórios' });
    }
    const service = await prisma.service.create({ data: { name, duration: parseInt(duration), price: parseFloat(price) } });
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
});

// PATCH /api/services/:id/toggle (admin)
router.patch('/:id/toggle', authenticate, requireAdmin, async (req, res) => {
  try {
    const current = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: 'Serviço não encontrado' });
    const updated = await prisma.service.update({
      where: { id: req.params.id },
      data: { active: !current.active }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
});

// PUT /api/services/:id (admin)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, duration, price } = req.body;
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: { name, duration: parseInt(duration), price: parseFloat(price) }
    });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
});

module.exports = router;
