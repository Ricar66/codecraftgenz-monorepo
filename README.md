# CodeCraft Gen-Z

Plataforma de cursos e marketplace de aplicativos para desenvolvedores.

## Requisitos

- Node.js >= 20
- Docker e Docker Compose
- MySQL 8.0 (via Docker ou instalado localmente)

## Estrutura do Monorepo

```
codecraftgenz-monorepo/
├── backend/          # API Express + TypeScript + Prisma
├── frontend/         # React + Vite + TypeScript (em breve)
├── infra/            # Docker Compose, Dockerfiles
├── .github/          # GitHub Actions CI/CD
├── Makefile          # Comandos do projeto
└── README.md
```

## Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/codecraftgenz-monorepo.git
cd codecraftgenz-monorepo
```

### 2. Configure as variáveis de ambiente

**Backend:**
```bash
cp backend/.env.example backend/.env
# Edite backend/.env com suas credenciais
```

**Docker (opcional):**
```bash
cp infra/.env.example infra/.env
# Edite infra/.env se for usar Docker Compose
```

### Variáveis de Ambiente (Backend)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NODE_ENV` | Ambiente | `development`, `production`, `test` |
| `PORT` | Porta do servidor | `8080` |
| `DATABASE_URL` | URL de conexão MySQL | `mysql://user:pass@localhost:3306/db` |
| `JWT_SECRET` | Chave secreta JWT (min 32 chars) | `sua-chave-super-secreta-aqui-123` |
| `JWT_EXPIRES_IN` | Expiração do token | `7d` |
| `CORS_ORIGIN` | URL do frontend | `http://localhost:5173` |

## Rodando o Projeto

### Com Docker (Recomendado)

```bash
# Subir tudo (banco + API)
make up

# Rodar migrations
make db-migrate-deploy

# Seed do banco
make db-seed
```

Acesse:
- API: http://localhost:8080
- MySQL: localhost:3306

### Sem Docker

```bash
# Instalar dependências
make install

# Gerar Prisma Client
make db-generate

# Iniciar banco MySQL local (deve estar rodando na porta 3306)

# Rodar migrations
make db-migrate

# Iniciar em modo desenvolvimento
make dev-backend
```

## Comandos Makefile

```bash
# Ajuda
make help

# Instalação
make install              # Instalar todas as dependências
make install-backend      # Instalar só backend
make install-frontend     # Instalar só frontend

# Desenvolvimento
make dev                  # Iniciar tudo (banco Docker + backend + frontend)
make dev-backend          # Iniciar só backend
make dev-frontend         # Iniciar só frontend

# Docker
make up                   # Subir todos os serviços
make up-db                # Subir só o banco
make down                 # Parar todos os serviços
make down-v               # Parar e remover volumes
make logs                 # Ver logs de todos os serviços
make logs-api             # Ver logs só da API
make logs-db              # Ver logs só do banco

# Banco de Dados
make db-generate          # Gerar Prisma Client
make db-migrate           # Rodar migrations (dev)
make db-migrate-deploy    # Rodar migrations (prod)
make db-seed              # Seed do banco
make db-reset             # Resetar banco (migrate + seed)
make db-studio            # Abrir Prisma Studio

# Build & Test
make build                # Build de tudo
make build-backend        # Build do backend
make build-frontend       # Build do frontend
make test                 # Rodar todos os testes
make test-backend         # Rodar testes do backend
make test-watch           # Testes em modo watch
make test-coverage        # Testes com coverage
make lint                 # Lint de tudo
make lint-backend         # Lint do backend

# Utilitários
make clean                # Limpar node_modules e dist
make format               # Formatar código com Prettier
make typecheck            # Verificar tipos TypeScript
```

## Endpoints da API

### Health Check

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Status da API |
| GET | `/health/db` | Status do banco |

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Registrar usuário |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Usuário atual |
| POST | `/api/auth/forgot-password` | Solicitar reset de senha |
| POST | `/api/auth/reset-password` | Resetar senha |

### Response Shape

Todas as respostas seguem o padrão:

**Sucesso:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Sucesso Paginado:**
```json
{
  "success": true,
  "data": [ ... ],
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
    "message": "Dados inválidos",
    "details": { ... }
  }
}
```

## Tech Stack

### Backend
- **Runtime:** Node.js 20
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** MySQL 8.0
- **Validation:** Zod
- **Auth:** JWT + httpOnly cookies
- **Logger:** Pino
- **Testing:** Vitest

### Frontend (em breve)
- **Framework:** React 18
- **Build:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Routing:** React Router

### Infra
- **Containers:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Backend Hosting:** Render
- **Frontend Hosting:** Hostinger

## Desenvolvimento

### Criar nova migration

```bash
cd backend
npx prisma migrate dev --name nome_da_migration
```

### Ver banco no Prisma Studio

```bash
make db-studio
```

### Rodar testes com coverage

```bash
make test-coverage
```

## Deploy

### Backend (Render)

1. Conecte o repositório no Render
2. Configure:
   - Build Command: `cd backend && npm ci && npx prisma generate && npm run build`
   - Start Command: `cd backend && npm start`
3. Adicione as variáveis de ambiente

### Frontend (Hostinger)

1. Build local: `make build-frontend`
2. Upload da pasta `frontend/dist` para o Hostinger

## Licença

Proprietary - CodeCraft Gen-Z
