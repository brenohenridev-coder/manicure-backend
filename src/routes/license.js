const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/license/status (público - frontend checa isso)
router.get('/status', async (req, res) => {
  try {
    const license = await prisma.license.findFirst({ orderBy: { createdAt: 'desc' } });

    if (!license) {
      return res.json({ active: false, reason: 'no_license' });
    }

    const now = new Date();
    const expired = license.expiresAt && license.expiresAt < now;

    res.json({
      active: license.active && !expired,
      expiresAt: license.expiresAt,
      reason: !license.active ? 'inactive' : expired ? 'expired' : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ active: false, reason: 'error' });
  }
});

// POST /api/license/webhook — Asaas webhook
router.post('/webhook', async (req, res) => {
  try {
    const { event, payment } = req.body;

    // Validar token do webhook Asaas
    const webhookToken = req.headers['asaas-access-token'];
    if (webhookToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    console.log(`📩 Asaas webhook: ${event}`);

    const license = await prisma.license.findFirst({ orderBy: { createdAt: 'desc' } });

    // Pagamento confirmado
    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event)) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 35); // 35 dias de tolerância

      if (license) {
        await prisma.license.update({
          where: { id: license.id },
          data: { active: true, expiresAt, asaasId: payment?.id }
        });
      } else {
        await prisma.license.create({
          data: { active: true, expiresAt, asaasId: payment?.id }
        });
      }
      console.log('✅ Licença ativada até:', expiresAt);
    }

    // Pagamento vencido / cancelado / estornado
    if (['PAYMENT_OVERDUE', 'PAYMENT_DELETED', 'PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED'].includes(event)) {
      if (license) {
        await prisma.license.update({
          where: { id: license.id },
          data: { active: false }
        });
      }
      console.log('🔒 Licença desativada por:', event);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

// PATCH /api/license/activate — ativar manualmente (admin do sistema)
router.patch('/activate', async (req, res) => {
  try {
    const masterKey = req.headers['x-master-key'];
    if (masterKey !== process.env.MASTER_KEY) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { days = 35 } = req.body;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(days));

    const license = await prisma.license.findFirst({ orderBy: { createdAt: 'desc' } });

    if (license) {
      await prisma.license.update({
        where: { id: license.id },
        data: { active: true, expiresAt }
      });
    } else {
      await prisma.license.create({ data: { active: true, expiresAt } });
    }

    res.json({ active: true, expiresAt, message: `Licença ativada por ${days} dias` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ativar licença' });
  }
});

// PATCH /api/license/deactivate — desativar manualmente
router.patch('/deactivate', async (req, res) => {
  try {
    const masterKey = req.headers['x-master-key'];
    if (masterKey !== process.env.MASTER_KEY) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const license = await prisma.license.findFirst({ orderBy: { createdAt: 'desc' } });
    if (license) {
      await prisma.license.update({ where: { id: license.id }, data: { active: false } });
    }

    res.json({ active: false, message: 'Licença desativada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desativar licença' });
  }
});

module.exports = router;
