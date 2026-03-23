# CLAUDE.md - Contexto para Claude Code

## Visao Geral

Este repositorio contem o backend da plataforma CodeCraft Gen-Z. E uma API REST construida com Express.js e TypeScript que serve o frontend em https://codecraftgenz.com.br.

**URL da API:** https://api.codecraftgenz.com.br
**VPS:** Ubuntu 24.04, gerenciado com PM2 e Nginx

---

## Arquitetura

O fluxo de uma request segue o padrao:

```
Request -> Route -> Middleware (auth, validacao) -> Controller -> Service -> Repository -> Prisma -> MySQL
```

- **Routes** (`src/routes/`): Definem endpoints e middlewares por rota.
- **Controllers** (`src/controllers/`): Recebem o request, chamam o service, retornam o response.
- **Services** (`src/services/`): Logica de negocio.
- **Repositories** (`src/repositories/`): Acesso ao banco via Prisma.
- **Schemas** (`src/schemas/`): Schemas Zod para validacao de input.
- **Middlewares** (`src/middlewares/`): Auth JWT, rate limiting, validacao, error handling.

---

## Convencoes de Codigo

### Validacao
- Usar **Zod** para validacao de todos os inputs. Schemas ficam em `src/schemas/`.
- Validacao e aplicada via middleware antes de chegar no controller.

### Autenticacao
- JWT via middleware de autenticacao.
- Tokens sao verificados em rotas protegidas.
- Google OAuth e suportado como metodo alternativo de login.

### Seguranca
- **Helmet** para headers HTTP de seguranca.
- **Rate limiting** em endpoints sensiveis (login, registro, pagamentos).
- **CORS** configurado para permitir apenas `codecraftgenz.com.br` e origens de desenvolvimento.
- Sanitizacao de inputs via Zod.

### Respostas
Todas as respostas seguem o formato padrao:
```json
{
  "success": true,
  "data": { }
}
```

---

## Banco de Dados

- **MySQL** hospedado na Hostinger (`srv1889.hstgr.io`).
- **Prisma ORM** para acesso ao banco. Schema em `prisma/schema.prisma`.
- Conexao configurada via `DATABASE_URL` no `.env`.

### Comandos uteis

```bash
npx prisma generate          # Gerar Prisma Client
npx prisma migrate dev       # Criar migration (desenvolvimento)
npx prisma migrate deploy    # Aplicar migrations (producao)
npx prisma studio            # Interface visual do banco
```

---

## Upload de Arquivos

- Arquivos sao enviados via **FTP** para o servidor Hostinger.
- Configuracao FTP via variaveis de ambiente (`FTP_HOST`, `FTP_USER`, `FTP_PASS`, `FTP_BASE_PATH`).
- Arquivos sao servidos via endpoint `/api/downloads/:file`.

---

## Pagamentos

- Integracao com **Mercado Pago**.
- Suporta: cartao de credito, cartao de debito, PIX, boleto.
- Webhooks do Mercado Pago chegam em `POST /api/apps/webhook`.
- **Em producao, a assinatura do webhook deve ser validada.** Nunca desabilitar essa verificacao.
- Apos pagamento aprovado: cria registro, provisiona licenca, envia email de confirmacao.

---

## Deploy

### Comando de deploy

```bash
ssh root@187.77.229.205 deploy-backend
```

O script no servidor executa:
1. `git pull origin main`
2. `npm install`
3. `npx prisma generate`
4. `npx prisma migrate deploy`
5. `npm run build`
6. `pm2 restart codecraftgenz-api`

### Infraestrutura do VPS

| Componente | Detalhes |
|------------|----------|
| SO | Ubuntu 24.04 LTS |
| Process manager | PM2 |
| Reverse proxy | Nginx |
| SSL | Certbot (Let's Encrypt) |
| Dominio | `api.codecraftgenz.com.br` |

---

## Estrutura de Pastas

```
backend/
├── src/
│   ├── routes/           # Rotas Express
│   ├── controllers/      # Controllers
│   ├── services/         # Logica de negocio
│   ├── repositories/     # Acesso ao banco (Prisma)
│   ├── middlewares/      # Auth, rate-limit, validacao
│   ├── schemas/          # Schemas Zod
│   ├── config/           # Configuracoes
│   ├── utils/            # Utilitarios
│   ├── types/            # Tipos TypeScript
│   ├── db/               # Prisma Client
│   ├── app.ts            # Express app setup
│   └── server.ts         # Entry point
├── prisma/
│   ├── schema.prisma     # Schema do banco
│   └── migrations/       # Migrations
└── package.json
```

---

## Regras Importantes

1. **Nunca commitar arquivos `.env`** -- contem credenciais de banco, chaves de API e secrets.
2. **Validacao de webhook e obrigatoria em producao** -- a assinatura do Mercado Pago deve ser verificada.
3. **CORS restrito** -- em producao, apenas `codecraftgenz.com.br` e permitido. Nao usar `*`.
4. **Rate limiting ativo** -- endpoints de auth e pagamentos tem limites configurados.
5. **Prisma migrations** -- sempre rodar `npx prisma migrate deploy` no deploy, nunca `migrate dev` em producao.
6. **PM2 para producao** -- nunca rodar `node` diretamente. Usar `pm2 restart codecraftgenz-api`.
