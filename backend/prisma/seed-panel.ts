/**
 * Seed do primeiro admin do painel.
 *
 * Uso (na VPS):
 *   PANEL_SEED_EMAIL=fulano@codecraftgenz.com.br \
 *   PANEL_SEED_NAME='Fulano de Tal' \
 *   PANEL_SEED_PASSWORD='senhaForte123!' \
 *   npx tsx prisma/seed-panel.ts
 *
 * Idempotente: se o email já existe, atualiza senha e nome.
 * Aborta se o email NÃO estiver em PANEL_ALLOWED_EMAILS.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.PANEL_SEED_EMAIL ?? '').trim().toLowerCase();
  const name = (process.env.PANEL_SEED_NAME ?? '').trim();
  const password = process.env.PANEL_SEED_PASSWORD ?? '';
  const cost = Number(process.env.PANEL_BCRYPT_COST ?? '12');

  if (!email || !name || !password) {
    console.error('❌ Defina PANEL_SEED_EMAIL, PANEL_SEED_NAME e PANEL_SEED_PASSWORD');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('❌ Senha do seed deve ter pelo menos 12 caracteres');
    process.exit(1);
  }

  const allow = (process.env.PANEL_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!allow.includes(email)) {
    console.error(`❌ ${email} não está em PANEL_ALLOWED_EMAILS — adicione antes de seedear`);
    console.error(`   PANEL_ALLOWED_EMAILS atual: [${allow.join(', ')}]`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, cost);

  const user = await prisma.panelUser.upsert({
    where: { email },
    update: { name, passwordHash, status: 'ativo' },
    create: { email, name, passwordHash, status: 'ativo' },
  });

  console.log(`✅ Usuário do painel pronto: #${user.id} ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
