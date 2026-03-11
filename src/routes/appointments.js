const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/appointments/today (authenticated)
router.get('/today', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = {
      date: { gte: today, lt: tomorrow },
      status: { not: 'CANCELLED' }
    };

    // Professionals only see their own
    if (req.user.role !== 'ADMIN') {
      where.professionalId = req.user.id;
    }

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
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar agendamentos de hoje' });
  }
});

// GET /api/appointments/by-date?date=YYYY-MM-DD&professionalId=xxx
router.get('/by-date', authenticate, async (req, res) => {
  try {
    const { date, professionalId } = req.query;
    if (!date) return res.status(400).json({ error: 'Data é obrigatória' });

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const where = {
      date: { gte: start, lte: end },
      status: { not: 'CANCELLED' }
    };

    // If professional, only their own; if admin can filter by professionalId
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

// POST /api/appointments (public - for booking)
router.post('/', async (req, res) => {
  try {
    const { clientId, professionalId, date, serviceIds } = req.body;

    if (!clientId || !professionalId || !date || !serviceIds?.length) {
      return res.status(400).json({ error: 'Dados incompletos para agendamento' });
    }

    // Get services to calculate duration and total
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } }
    });

    if (!services.length) {
      return res.status(400).json({ error: 'Serviços não encontrados' });
    }

    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0);

    const startDate = new Date(date);
    const endDate = new Date(startDate.getTime() + totalDuration * 60000);

    // Check for conflicts
    const conflict = await prisma.appointment.findFirst({
      where: {
        professionalId,
        status: { not: 'CANCELLED' },
        OR: [
          { date: { lt: endDate }, endTime: { gt: startDate } }
        ]
      }
    });

    if (conflict) {
      return res.status(409).json({ error: 'Horário não disponível, por favor escolha outro' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        professionalId,
        date: startDate,
        endTime: endDate,
        totalPrice,
        services: {
          create: serviceIds.map(serviceId => ({ serviceId }))
        }
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

// PATCH /api/appointments/:id/payment (authenticated)
router.patch('/:id/payment', authenticate, async (req, res) => {
  try {
    const { paid } = req.body;
    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    // Professionals can only update their own
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

// PATCH /api/appointments/:id/status (authenticated)
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    if (req.user.role !== 'ADMIN' && appointment.professionalId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

module.exports = router;
