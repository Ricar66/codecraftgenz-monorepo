// Script para testar licença
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'mysql://u984096926_codecraftgenz:a0C|4eb;@srv1889.hstgr.io:3306/u984096926_codecraftgenz'
    }
  }
});

async function main() {
  const email = 'teste-claude@teste.com';
  const hardwareId = 'TESTE-HW-' + Date.now();
  const appId = 2;

  console.log('\n=== Criando licença de teste ===\n');

  // Criar pagamento
  const paymentId = `TEST-${Date.now()}`;
  await prisma.payment.create({
    data: {
      id: paymentId,
      appId,
      status: 'approved',
      amount: 0,
      currency: 'BRL',
      payerEmail: email,
      payerName: 'Teste Claude',
    }
  });
  console.log('✅ Pagamento criado:', paymentId);

  // Criar licença com hardware_id já ativado
  const licenseKey = `TEST-${randomUUID().slice(0, 8).toUpperCase()}`;
  await prisma.license.create({
    data: {
      appId,
      email,
      hardwareId,
      licenseKey,
      appName: 'OverlayCraft - Monitor de Hardware',
      activatedAt: new Date(),
    }
  });
  console.log('✅ Licença criada:', licenseKey);

  console.log('\n=== Dados para teste ===');
  console.log('Email:', email);
  console.log('Hardware ID:', hardwareId);
  console.log('App ID:', appId);
  console.log('License Key:', licenseKey);

  // Testar a API
  console.log('\n=== Testando API ===\n');

  const url = `https://gestao-ativos-codecraftgenz.onrender.com/api/compat/license-check?email=${encodeURIComponent(email)}&id_pc=${encodeURIComponent(hardwareId)}&app_id=${appId}`;
  console.log('URL:', url);

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('\nResposta:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('Erro:', e.message);
  }

  // Testar outras rotas para ver se funcionam
  console.log('\n=== Testando outras rotas ===\n');

  const routes = [
    '/health',
    '/api/auth/login',
    '/api/apps',
  ];

  for (const route of routes) {
    try {
      const r = await fetch(`https://gestao-ativos-codecraftgenz.onrender.com${route}`);
      const d = await r.json();
      console.log(`${route}:`, d.success !== undefined ? (d.success ? '✅' : '❌ ' + d.error) : '✅');
    } catch (e) {
      console.log(`${route}: ❌`, e.message);
    }
  }

  await prisma.$disconnect();
}

main();
