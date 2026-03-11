# 💅 Manicure API - Backend

## Stack
- Node.js + Express
- PostgreSQL + Prisma ORM
- JWT Authentication
- Deploy: Railway

---

## 🚀 Deploy no Railway (passo a passo)

### 1. Criar repositório no GitHub
```bash
cd manicure-backend
git init
git add .
git commit -m "feat: initial backend setup"
git remote add origin https://github.com/SEU_USUARIO/manicure-backend.git
git push -u origin main
```

### 2. Acessar Railway
1. Acesse [railway.app](https://railway.app) e faça login com GitHub
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Escolha o repositório `manicure-backend`

### 3. Adicionar PostgreSQL
1. No projeto, clique em **"Add Service" → "Database" → "PostgreSQL"**
2. O Railway vai criar o banco automaticamente

### 4. Configurar variáveis de ambiente
No painel do Railway, vá em **"Variables"** e adicione:
```
JWT_SECRET=chave_muito_secreta_e_longa_troque_isso_123
FRONTEND_URL=https://seu-frontend.vercel.app
```
> A variável `DATABASE_URL` é adicionada automaticamente pelo Railway quando você adiciona o PostgreSQL.

### 5. Configurar o start command
No Railway, vá em **"Settings"** do serviço e configure:
- **Start Command**: `npm start`
- **Build Command**: `npm install && npx prisma generate && npx prisma db push`

### 6. Executar seed (dados iniciais)
Após o deploy, no Railway vá em **"Shell"** e execute:
```bash
node src/seed.js
```

### 7. Pegar a URL da API
No Railway, vá em **"Settings" → "Networking"** e gere um domínio público.
Essa URL será usada no frontend como `VITE_API_URL`.

---

## 💻 Rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Criar arquivo .env
cp .env.example .env
# Edite o .env com suas credenciais

# 3. Criar tabelas no banco
npx prisma db push

# 4. Seed (dados iniciais)
node src/seed.js

# 5. Rodar em desenvolvimento
npm run dev
```

---

## 📋 Endpoints

### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário logado

### Professionals
- `GET /api/professionals` - Listar ativas (público)
- `GET /api/professionals/all` - Todas (admin)
- `POST /api/professionals` - Criar (admin)
- `PATCH /api/professionals/:id/toggle` - Ativar/desativar (admin)

### Services
- `GET /api/services` - Listar serviços ativos (público)
- `POST /api/services` - Criar (admin)

### Clients
- `POST /api/clients` - Cadastrar cliente (público)
- `GET /api/clients` - Listar clientes com busca (autenticado)
- `GET /api/clients/:id` - Detalhes do cliente (autenticado)

### Appointments
- `GET /api/appointments/today` - Agendamentos de hoje
- `GET /api/appointments/by-date` - Por data e profissional
- `POST /api/appointments` - Criar agendamento (público)
- `PATCH /api/appointments/:id/payment` - Marcar pagamento
- `PATCH /api/appointments/:id/status` - Atualizar status

### Schedule
- `GET /api/schedule/available` - Horários disponíveis

---

## 👤 Usuários padrão (após seed)
- **Admin**: admin@manicure.com / admin123
- **Profissional**: ana@manicure.com / 123456
