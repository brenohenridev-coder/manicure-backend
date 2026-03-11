const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/schedule/available?professionalId=xxx&date=YYYY-MM-DD&duration=60
router.get('/available', async (req, res) => {
  try {
    const { professionalId, date, duration } = req.query;

    if (!professionalId || !date) {
      return res.status(400).json({ error: 'professionalId e date são obrigatórios' });
    }

    const totalDuration = parseInt(duration) || 60;

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Get existing appointments for that day
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        professionalId,
        status: { not: 'CANCELLED' },
        date: { gte: dayStart, lte: dayEnd }
      },
      select: { date: true, endTime: true },
      orderBy: { date: 'asc' }
    });

    // Business hours: 9:00 - 19:00, slots every 30 min
    const BUSINESS_START = 9 * 60; // 9:00 in minutes
    const BUSINESS_END = 19 * 60;  // 19:00 in minutes
    const SLOT_INTERVAL = 30;

    const slots = [];
    const now = new Date();

    for (let minutes = BUSINESS_START; minutes + totalDuration <= BUSINESS_END; minutes += SLOT_INTERVAL) {
      const slotStart = new Date(date);
      slotStart.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + totalDuration * 60000);

      // Skip past slots
      if (slotStart <= now) continue;

      // Check conflicts
      const hasConflict = existingAppointments.some(appt => {
        const apptStart = new Date(appt.date);
        const apptEnd = new Date(appt.endTime);
        return slotStart < apptEnd && slotEnd > apptStart;
      });

      slots.push({
        time: slotStart.toISOString(),
        available: !hasConflict,
        label: slotStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
      });
    }

    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar horários disponíveis' });
  }
});

module.exports = router;
