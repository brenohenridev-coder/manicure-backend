const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/professionals (public)
router.get('/', async (req, res) => {
  try {
    const professionals = await prisma.professional.findMany({
      where: { active: true },
      select: { id: true, name: true, avatarColor: true, role: true }
    });
    res.json(professionals);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar profissionais' });
  }
});

// GET /api/professionals/all (admin only)
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const professionals = await prisma.professional.findMany({
      select: { id: true, name: true, username: true, role: true, active: true, avatarColor: true, createdAt: true }
    });
    res.json(professionals);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar equipe' });
  }
});

// POST /api/professionals (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, username, password, role, avatarColor } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Nome, usuário e senha são obrigatórios' });
    }

    const existing = await prisma.professional.findUnique({ where: { username: username.toLowerCase().trim() } });
    if (existing) {
      return res.status(409).json({ error: 'Nome de usuário já cadastrado' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const professional = await prisma.professional.create({
      data: {
        name,
        username: username.toLowerCase().trim(),
        email: `${username.toLowerCase().trim()}@studio.local`,
        password: hashed,
        role: role || 'PROFESSIONAL',
        avatarColor: avatarColor || '#F48FB1'
      },
      select: { id: true, name: true, username: true, role: true, avatarColor: true, active: true }
    });

    res.status(201).json(professional);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar profissional' });
  }
});

// PATCH /api/professionals/:id/toggle (admin)
router.patch('/:id/toggle', authenticate, requireAdmin, async (req, res) => {
  try {
    const current = await prisma.professional.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: 'Profissional não encontrada' });

    const updated = await prisma.professional.update({
      where: { id: req.params.id },
      data: { active: !current.active },
      select: { id: true, name: true, active: true }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar profissional' });
  }
});

// PUT /api/professionals/:id/password (admin)
router.put('/:id/password', authenticate, requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await prisma.professional.update({
      where: { id: req.params.id },
      data: { password: hashed }
    });
    res.json({ message: 'Senha atualizada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar senha' });
  }
});

module.exports = router;

// DELETE /api/professionals/:id (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const professional = await prisma.professional.findUnique({ where: { id: req.params.id } });
    if (!professional) return res.status(404).json({ error: 'Profissional não encontrada' });

    // Não permite excluir a si mesmo
    if (professional.id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
    }

    // Verifica se tem agendamentos futuros
    const futureAppointments = await prisma.appointment.count({
      where: {
        professionalId: req.params.id,
        status: 'SCHEDULED',
        date: { gt: new Date() }
      }
    });

    if (futureAppointments > 0) {
      return res.status(400).json({ error: `Não é possível excluir: profissional tem ${futureAppointments} agendamento(s) futuro(s)` });
    }

    await prisma.professional.delete({ where: { id: req.params.id } });
    res.json({ message: 'Profissional excluída com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir profissional' });
  }
});

// PATCH /api/professionals/:id/role (admin only)
router.patch('/:id/role', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['ADMIN', 'PROFESSIONAL'].includes(role)) {
      return res.status(400).json({ error: 'Perfil inválido' });
    }

    const professional = await prisma.professional.findUnique({ where: { id: req.params.id } });
    if (!professional) return res.status(404).json({ error: 'Profissional não encontrada' });

    if (professional.id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode alterar o próprio perfil' });
    }

    const updated = await prisma.professional.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, role: true, active: true }
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});
