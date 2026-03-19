const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authenticateClient } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/appointments/today (profissional/admin)
router.get('/today', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = { date: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } };
    if (req.user.role !== 'ADMIN') where.professionalId = req.user.id;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: { select: { fullName: true, phone: true } },
        professional: { select: { name: true, avatarColor: true } },
        services: { include: { service: { select: { name: true } } } }
      },
      orderBy: { date: 'asc' }
    });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar agendamentos de hoje' });
  }
});

// GET /api/appointments/by-date
router.get('/by-date', authenticate, async (req, res) => {
  try {
    const { date, professionalId } = req.query;
    if (!date) return res.status(400).json({ error: 'Data é obrigatória' });

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const where = { date: { gte: start, lte: end }, status: { not: 'CANCELLED' } };
    if (req.user.role !== 'ADMIN') {
      where.professionalId = req.user.id;
    } else if (professionalId) {
      where.professionalId = professionalId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: { select: { fullName: true, phone: true } },
        professional: { select: { name: true, avatarColor: true } },
        services: { include: { service: true } }
      },
      orderBy: { date: 'asc' }
    });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

// POST /api/appointments — requer login do cliente
router.post('/', authenticateClient, async (req, res) => {
  try {
    const { professionalId, date, serviceIds, notes } = req.body;
    const clientId = req.client.id; // vem do token

    if (!professionalId || !date || !serviceIds?.length) {
      return res.status(400).json({ error: 'Dados incompletos para agendamento' });
    }

    const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
    if (!services.length) return res.status(400).json({ error: 'Serviços não encontrados' });

    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
    const startDate = new Date(date);
    const endDate = new Date(startDate.getTime() + totalDuration * 60000);

    const conflict = await prisma.appointment.findFirst({
      where: {
        professionalId,
        status: { not: 'CANCELLED' },
        OR: [{ date: { lt: endDate }, endTime: { gt: startDate } }]
      }
    });

    if (conflict) return res.status(409).json({ error: 'Horário não disponível, por favor escolha outro' });

    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        professionalId,
        date: startDate,
        endTime: endDate,
        totalPrice,
        notes: notes || null,
        services: { create: serviceIds.map(serviceId => ({ serviceId })) }
      },
      include: {
        client: { select: { fullName: true } },
        professional: { select: { name: true } },
        services: { include: { service: true } }
      }
    });

    res.status(201).json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// PATCH /api/appointments/:id/cancel — cliente cancela o próprio agendamento
router.patch('/:id/cancel', authenticateClient, async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (appointment.clientId !== req.client.id) return res.status(403).json({ error: 'Acesso negado' });
    if (appointment.status !== 'SCHEDULED') return res.status(400).json({ error: 'Apenas agendamentos pendentes podem ser cancelados' });

    // Só pode cancelar com pelo menos 2h de antecedência
    const hoursUntil = (new Date(appointment.date) - new Date()) / 3600000;
    if (hoursUntil < 2) return res.status(400).json({ error: 'Cancelamento deve ser feito com pelo menos 2 horas de antecedência' });

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cancelar agendamento' });
  }
});

// PATCH /api/appointments/:id/reschedule — cliente remarca
router.patch('/:id/reschedule', authenticateClient, async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Nova data é obrigatória' });

    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { services: { include: { service: true } } }
    });

    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (appointment.clientId !== req.client.id) return res.status(403).json({ error: 'Acesso negado' });
    if (appointment.status !== 'SCHEDULED') return res.status(400).json({ error: 'Apenas agendamentos pendentes podem ser remarcados' });

    const hoursUntil = (new Date(appointment.date) - new Date()) / 3600000;
    if (hoursUntil < 2) return res.status(400).json({ error: 'Remarcação deve ser feita com pelo menos 2 horas de antecedência' });

    const totalDuration = appointment.services.reduce((sum, s) => sum + s.service.duration, 0);
    const startDate = new Date(date);
    const endDate = new Date(startDate.getTime() + totalDuration * 60000);

    const conflict = await prisma.appointment.findFirst({
      where: {
        professionalId: appointment.professionalId,
        status: { not: 'CANCELLED' },
        id: { not: appointment.id },
        OR: [{ date: { lt: endDate }, endTime: { gt: startDate } }]
      }
    });

    if (conflict) return res.status(409).json({ error: 'Horário não disponível, escolha outro' });

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { date: startDate, endTime: endDate }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remarcar agendamento' });
  }
});

// PATCH /api/appointments/:id/payment (profissional/admin)
router.patch('/:id/payment', authenticate, async (req, res) => {
  try {
    const { paid } = req.body;
    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (req.user.role !== 'ADMIN' && appointment.professionalId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { paid: Boolean(paid) }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar pagamento' });
  }
});

// PATCH /api/appointments/:id/status (profissional/admin)
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Status inválido' });

    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (req.user.role !== 'ADMIN' && appointment.professionalId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const updated = await prisma.appointment.update({ where: { id: req.params.id }, data: { status } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

module.exports = router;
