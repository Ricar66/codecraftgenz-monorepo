# CodeCraft Gen-Z Backend

API backend da plataforma CodeCraft Gen-Z -- marketplace de apps, desafios, mentorias, ranking e pagamentos para desenvolvedores.

**API:** https://api.codecraftgenz.com.br

---

## Tech Stack

| Tecnologia | Versao / Detalhes |
|------------|-------------------|
| Node.js | 20 |
| Express | Framework HTTP |
| TypeScript | Tipagem estatica |
| Prisma ORM | Acesso ao banco de dados |
| MySQL | 8.0 |
| Zod | Validacao de schemas |
| JWT | Autenticacao |
| Helmet | Headers de seguranca |
| PM2 | Process manager (producao) |

---

## Pre-requisitos

- Node.js 20+
- MySQL 8

---

## Getting Started

```bash
# Clonar o repositorio
git clone https://github.com/Ricar66/codecraftgenz-monorepo.git
cd codecraftgenz-monorepo/backend

# Instalar dependencias
npm install

# Configurar variaveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas credenciais

# Gerar o Prisma Client
npx prisma generate

# Rodar migrations
npx prisma migrate deploy

# Build do TypeScript
npm run build

# Iniciar o servidor
npm start
```

Para desenvolvimento:

```bash
npm run dev
```

A API estara disponivel em `http://localhost:8080`.

---

## Variaveis de Ambiente

Crie um arquivo `.env` no diretorio `backend/` baseado no `.env.example`. Abaixo estao todas as variaveis necessarias:

| Variavel | Descricao |
|----------|-----------|
| `NODE_ENV` | Ambiente de execucao (`development`, `production`, `test`) |
| `PORT` | Porta do servidor HTTP |
| `DATABASE_URL` | URL de conexao MySQL para o Prisma (`mysql://user:pass@host:3306/db`) |
| `JWT_SECRET` | Chave secreta para assinatura de tokens JWT (minimo 32 caracteres) |
| `JWT_EXPIRES_IN` | Tempo de expiracao do token JWT (ex: `7d`) |
| `CORS_ORIGIN` | URL do frontend permitida no CORS |
| `MERCADO_PAGO_ACCESS_TOKEN` | Token de acesso da API Mercado Pago |
| `MERCADO_PAGO_PUBLIC_KEY` | Chave publica do Mercado Pago |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Secret para validacao de webhooks do Mercado Pago |
| `MERCADO_PAGO_SUCCESS_URL` | URL de redirect apos pagamento aprovado |
| `MERCADO_PAGO_FAILURE_URL` | URL de redirect apos pagamento recusado |
| `MERCADO_PAGO_PENDING_URL` | URL de redirect para pagamento pendente |
| `MERCADO_PAGO_WEBHOOK_URL` | URL publica do webhook para o Mercado Pago |
| `EMAIL_USER` | Email para envio de emails transacionais |
| `EMAIL_PASS` | Senha ou App Password do email |
| `FRONTEND_URL` | URL do frontend (usado em emails e redirects) |
| `FTP_HOST` | Host FTP para upload de arquivos |
| `FTP_USER` | Usuario FTP |
| `FTP_PASS` | Senha FTP |
| `FTP_BASE_PATH` | Caminho base no servidor FTP |
| `GOOGLE_CLIENT_ID` | Client ID do Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Client Secret do Google OAuth |
| `ADMIN_RESET_TOKEN` | Token para reset administrativo |

**Nunca commite arquivos `.env` no repositorio.**

Para gerar um JWT_SECRET seguro:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Endpoints da API

### Health Check

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/health` | Status da API |
| GET | `/health/db` | Status do banco de dados |

### Autenticacao (`/api/auth`)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Login com email/senha |
| POST | `/api/auth/google` | Login com Google OAuth |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Dados do usuario autenticado |
| POST | `/api/auth/forgot-password` | Solicitar reset de senha |
| POST | `/api/auth/reset-password` | Resetar senha com token |

### Apps (`/api/apps`)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/apps` | Listar apps |
| GET | `/api/apps/:id` | Detalhes de um app |
| POST | `/api/apps` | Criar app (admin) |
| PUT | `/api/apps/:id` | Atualizar app (admin) |
| DELETE | `/api/apps/:id` | Remover app (admin) |

### Pagamentos (`/api/apps`)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/apps/:id/purchase` | Criar preferencia Mercado Pago (redirect) |
| GET | `/api/apps/:id/purchase/status` | Status da compra |
| POST | `/api/apps/:id/payment/direct` | Pagamento direto (cartao/PIX/boleto) |
| GET | `/api/apps/:id/payment/last` | Ultimo pagamento do app |
| POST | `/api/apps/webhook` | Webhook do Mercado Pago |
| POST | `/api/apps/:id/resend-email` | Reenviar email de confirmacao |

### Desafios (`/api/challenges`)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/challenges` | Listar desafios |
| GET | `/api/challenges/:id` | Detalhes de um desafio |
| POST | `/api/challenges` | Criar desafio (admin) |
| POST | `/api/challenges/:id/submit` | Submeter solucao |

### Projetos (`/api/projects`)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/projects` | Listar projetos |
| GET | `/api/projects/:id` | Detalhes de um projeto |
| POST | `/api/projects` | Criar projeto |
| PUT | `/api/projects/:id` | Atualizar projeto |

### Mentorias (`/api/mentors`)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/mentors` | Listar mentores |
| GET | `/api/mentors/:id` | Detalhes de um mentor |
| POST | `/api/mentors` | Cadastrar mentor |

### Ranking (`/api/ranking`)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/ranking` | Ranking geral de usuarios |

### Feedbacks (`/api/feedbacks`)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/feedbacks` | Listar feedbacks |
| POST | `/api/feedbacks` | Enviar feedback |

### Propostas B2B (`/api/proposals`)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/proposals` | Listar propostas (admin) |
| POST | `/api/proposals` | Enviar proposta comercial |

### Leads (`/api/leads`)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/leads` | Listar leads (admin) |
| POST | `/api/leads` | Registrar lead |

### Downloads (`/api/downloads`)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/downloads/:file` | Download de arquivo (protegido) |

### Licencas (`/api/public/license`)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/public/license/activate-device` | Ativar licenca em dispositivo |

### Formato de Resposta

Todas as respostas seguem o padrao:

**Sucesso:**
```json
{
  "success": true,
  "data": { }
}
```

**Sucesso paginado:**
```json
{
  "success": true,
  "data": [ ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

**Erro:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados invalidos",
    "details": { }
  }
}
```

---

## Banco de Dados

O banco de dados usa MySQL com Prisma ORM.

### Comandos Prisma

```bash
# Gerar Prisma Client
npx prisma generate

# Criar nova migration
npx prisma migrate dev --name nome_da_migration

# Aplicar migrations em producao
npx prisma migrate deploy

# Abrir Prisma Studio (interface visual)
npx prisma studio

# Resetar banco (apaga dados)
npx prisma migrate reset

# Seed do banco
npx prisma db seed
```

O schema do banco esta em `prisma/schema.prisma`.

---

## Estrutura do Projeto

```
codecraftgenz-monorepo/
├── backend/
│   ├── src/
│   │   ├── routes/           # Definicao de rotas Express
│   │   ├── controllers/      # Controllers (recebem request, retornam response)
│   │   ├── services/         # Logica de negocio
│   │   ├── repositories/     # Acesso ao banco via Prisma
│   │   ├── middlewares/      # Middlewares (auth, rate-limit, validacao)
│   │   ├── schemas/          # Schemas Zod para validacao
│   │   ├── config/           # Configuracoes (database, email, etc.)
│   │   ├── utils/            # Funcoes utilitarias
│   │   ├── types/            # Tipos TypeScript
│   │   ├── db/               # Configuracao do Prisma Client
│   │   ├── app.ts            # Configuracao do Express app
│   │   └── server.ts         # Ponto de entrada do servidor
│   ├── prisma/
│   │   ├── schema.prisma     # Schema do banco de dados
│   │   └── migrations/       # Migrations do Prisma
│   ├── package.json
│   └── tsconfig.json
├── infra/                    # Docker Compose, Dockerfiles
├── Makefile                  # Comandos do projeto
└── README.md
```

---

## Deploy para VPS

O backend roda em um VPS dedicado com Ubuntu 24.04.

### Comando de deploy

```bash
ssh root@187.77.229.205 deploy-backend
```

O script `deploy-backend` no servidor executa:

1. `cd /app/codecraftgenz-monorepo/backend`
2. `git pull origin main`
3. `npm install`
4. `npx prisma generate`
5. `npx prisma migrate deploy`
6. `npm run build`
7. `pm2 restart codecraftgenz-api`

### Infraestrutura do VPS

| Componente | Detalhes |
|------------|----------|
| Sistema operacional | Ubuntu 24.04 LTS |
| Process manager | PM2 |
| Reverse proxy | Nginx |
| SSL | Certbot (Let's Encrypt) |
| Dominio API | `api.codecraftgenz.com.br` |
| Banco de dados | MySQL no Hostinger (`srv1889.hstgr.io`) |

O Nginx faz reverse proxy da porta 443 para a porta da aplicacao Node.js gerenciada pelo PM2.

---

## Docker (Desenvolvimento)

Para desenvolvimento local com Docker:

```bash
# Subir banco + API
make up

# Rodar migrations
make db-migrate-deploy

# Seed do banco
make db-seed

# Parar servicos
make down
```

---

## Licenca

Proprietary - CodeCraft Gen-Z
