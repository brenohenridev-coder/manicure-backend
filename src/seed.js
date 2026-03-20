require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌸 Iniciando seed...');

  const adminPassword = await bcrypt.hash('claudia123', 10);
  await prisma.professional.upsert({
    where: { username: 'claudia' },
    update: {},
    create: {
      name: 'Claudia',
      username: 'claudia',
      email: 'claudia@studio.local',
      password: adminPassword,
      role: 'ADMIN',
      avatarColor: '#F48FB1'
    }
  });

  const p1Password = await bcrypt.hash('123456', 10);
  await prisma.professional.upsert({
    where: { username: 'ana' },
    update: {},
    create: {
      name: 'Ana Paula',
      username: 'ana',
      email: 'ana@studio.local',
      password: p1Password,
      role: 'PROFESSIONAL',
      avatarColor: '#F8BBD9'
    }
  });

  await prisma.professional.upsert({
    where: { username: 'julia' },
    update: {},
    create: {
      name: 'Júlia Souza',
      username: 'julia',
      email: 'julia@studio.local',
      password: p1Password,
      role: 'PROFESSIONAL',
      avatarColor: '#CE93D8'
    }
  });

  const services = [
    { name: 'Manicure Simples', duration: 45, price: 35 },
    { name: 'Pedicure Simples', duration: 60, price: 45 },
    { name: 'Manicure + Pedicure', duration: 90, price: 75 },
    { name: 'Esmaltação em Gel', duration: 60, price: 70 },
    { name: 'Unhas de Fibra', duration: 120, price: 120 },
    { name: 'Nail Art (por unha)', duration: 15, price: 10 },
    { name: 'Remoção de Gel', duration: 30, price: 30 },
    { name: 'Spa dos Pés', duration: 75, price: 80 },
  ];

  for (const service of services) {
    const existing = await prisma.service.findFirst({ where: { name: service.name } });
    if (!existing) {
      await prisma.service.create({ data: service });
    }
  }

  console.log('✅ Seed concluído!');
  console.log('👤 Admin: usuário claudia | Senha: claudia123');
  console.log('👤 Profissional: usuário ana | Senha: 123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());