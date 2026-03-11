require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const professionalsRoutes = require('./routes/professionals');
const servicesRoutes = require('./routes/services');
const clientsRoutes = require('./routes/clients');
const appointmentsRoutes = require('./routes/appointments');
const scheduleRoutes = require('./routes/schedule');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '💅 Manicure API running!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/professionals', professionalsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/schedule', scheduleRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`💅 Manicure API rodando na porta ${PORT}`);
});
