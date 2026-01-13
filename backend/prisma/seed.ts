import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@codecraftgenz.com.br' },
    update: {},
    create: {
      email: 'admin@codecraftgenz.com.br',
      name: 'Administrador',
      passwordHash: adminPassword,
      role: 'admin',
      status: 'ativo',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create sample user
  const userPassword = await bcrypt.hash('User@123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@codecraftgenz.com.br' },
    update: {},
    create: {
      email: 'user@codecraftgenz.com.br',
      name: 'Usuário Teste',
      passwordHash: userPassword,
      role: 'viewer',
      status: 'ativo',
    },
  });
  console.log('✅ Sample user created:', user.email);

  // Create sample mentor
  const mentor = await prisma.mentor.create({
    data: {
      nome: 'João Silva',
      email: 'joao@codecraftgenz.com.br',
      bio: 'Desenvolvedor Full Stack com 10 anos de experiência em React, Node.js e TypeScript.',
      especialidade: 'React, Node.js, TypeScript',
      disponivel: true,
    },
  });
  console.log('✅ Sample mentor created:', mentor.nome);

  // Create sample team
  const equipe = await prisma.equipe.create({
    data: {
      nome: 'Code Warriors',
      descricao: 'Equipe de desenvolvimento frontend especializada em React e Vue.js',
      status: 'ativo',
    },
  });
  console.log('✅ Sample team created:', equipe.nome);

  // Create sample crafters
  const crafter1 = await prisma.crafter.create({
    data: {
      nome: 'Maria Santos',
      email: 'maria@codecraftgenz.com.br',
      bio: 'Apaixonada por código limpo e boas práticas.',
      pontos: 850,
      equipeId: equipe.id,
      skillsJson: JSON.stringify(['React', 'TypeScript', 'CSS']),
    },
  });

  const crafter2 = await prisma.crafter.create({
    data: {
      nome: 'Pedro Oliveira',
      email: 'pedro@codecraftgenz.com.br',
      bio: 'Especialista em backend e arquitetura de sistemas.',
      pontos: 720,
      equipeId: equipe.id,
      skillsJson: JSON.stringify(['Node.js', 'Python', 'PostgreSQL']),
    },
  });
  console.log('✅ Sample crafters created:', crafter1.nome, crafter2.nome);

  // Create sample project
  const project = await prisma.project.create({
    data: {
      nome: 'CodeCraft App',
      descricao: 'Aplicativo principal da plataforma CodeCraft Gen-Z para gestão de projetos e marketplace de apps.',
      status: 'ativo',
      preco: 0,
      progresso: 100,
      mentorId: mentor.id,
    },
  });
  console.log('✅ Sample project created:', project.nome);

  // Create sample app
  const app = await prisma.app.create({
    data: {
      name: 'CoinCraft Pro',
      description: 'Ferramenta profissional para gerenciamento de finanças pessoais e investimentos.',
      shortDescription: 'Gerencie suas finanças com inteligência.',
      price: 49.90,
      category: 'Finanças',
      tags: JSON.stringify(['fintech', 'investimentos', 'produtividade']),
      version: '1.0.0',
      status: 'published',
      featured: true,
      creatorId: admin.id,
      projectId: project.id,
    },
  });
  console.log('✅ Sample app created:', app.name);

  // Create free app
  const freeApp = await prisma.app.create({
    data: {
      name: 'Task Manager Lite',
      description: 'Gerenciador de tarefas simples e gratuito para organizar seu dia a dia.',
      shortDescription: 'Organize suas tarefas gratuitamente.',
      price: 0,
      category: 'Produtividade',
      tags: JSON.stringify(['tarefas', 'organização', 'grátis']),
      version: '1.0.0',
      status: 'published',
      creatorId: admin.id,
    },
  });
  console.log('✅ Free app created:', freeApp.name);

  // Create sample challenge
  const desafio = await prisma.desafio.create({
    data: {
      name: 'Desafio React Básico',
      objective: 'Demonstrar conhecimento em React hooks e componentes funcionais.',
      description: 'Crie um componente de lista de tarefas usando React hooks (useState, useEffect). O componente deve permitir adicionar, remover e marcar tarefas como concluídas.',
      difficulty: 'facil',
      basePoints: 200,
      deliveryType: 'link',
      status: 'active',
      visible: true,
      tagsJson: JSON.stringify(['react', 'hooks', 'frontend']),
      createdBy: admin.id,
    },
  });
  console.log('✅ Sample challenge created:', desafio.name);

  // Create harder challenge
  const desafio2 = await prisma.desafio.create({
    data: {
      name: 'API REST com Node.js',
      objective: 'Construir uma API REST completa com autenticação.',
      description: 'Desenvolva uma API REST usando Node.js e Express. A API deve incluir autenticação JWT, CRUD de recursos e validação de dados com Zod.',
      difficulty: 'medio',
      basePoints: 500,
      deliveryType: 'link',
      status: 'active',
      visible: true,
      tagsJson: JSON.stringify(['nodejs', 'express', 'api', 'backend']),
      createdBy: admin.id,
    },
  });
  console.log('✅ Harder challenge created:', desafio2.name);

  // Create sample inscription
  const inscricao = await prisma.inscricao.create({
    data: {
      nome: 'Carlos Mendes',
      email: 'carlos@example.com',
      telefone: '11999998888',
      mensagem: 'Gostaria de participar do projeto CodeCraft App.',
      projetoId: project.id,
      tipo: 'projeto',
      status: 'pendente',
    },
  });
  console.log('✅ Sample inscription created for:', inscricao.nome);

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📧 Admin login: admin@codecraftgenz.com.br');
  console.log('🔑 Admin password: Admin@123');
  console.log('');
  console.log('📧 User login: user@codecraftgenz.com.br');
  console.log('🔑 User password: User@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
