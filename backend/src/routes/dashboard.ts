import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { success } from '../utils/response.js';

const router = Router();

/**
 * GET /api/dashboard/resumo
 * Get dashboard summary with KPIs
 */
router.get('/resumo', authenticate, authorizeAdmin, async (req: Request, res: Response) => {
  const periodo = String(req.query.periodo || '30d');
  const days = periodo.endsWith('d') ? parseInt(periodo.replace('d', '')) : 30;
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Count projects by status
  const projectsTotal = await prisma.project.count();
  const projectsAtivos = await prisma.project.count({
    where: { status: { in: ['ativo', 'ongoing'] } },
  });
  const projectsFinalizados = await prisma.project.count({
    where: { status: { in: ['concluido', 'finalizado', 'completed'] } },
  });

  // Get finance totals
  let receitaPaga = 0;
  let receitaPendente = 0;
  let descontos = 0;

  try {
    const finances = await prisma.finance.findMany({
      where: {
        createdAt: { gte: fromDate },
      },
    });

    finances.forEach((f) => {
      const valor = Number(f.valor) || 0;
      if (f.status === 'paid' || f.status === 'pago') {
        receitaPaga += valor;
      } else if (f.status === 'pending' || f.status === 'pendente') {
        receitaPendente += valor;
      } else if (f.status === 'discount' || f.status === 'desconto') {
        descontos += valor;
      }
    });
  } catch {
    // Table may not exist yet
  }

  // Get users count
  const usersTotal = await prisma.user.count();
  const craftersTotal = await prisma.crafter.count();

  const totais = {
    projetos_total: projectsTotal,
    projetos_ativos: projectsAtivos,
    projetos_finalizados: projectsFinalizados,
    receita_paga: receitaPaga,
    receita_pendente: receitaPendente,
    descontos: descontos,
    usuarios_total: usersTotal,
    crafters_total: craftersTotal,
  };

  // Monthly evolution (last 6 months)
  const evolucaoMensal: Array<{ mes: string; valor: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthName = date.toLocaleString('pt-BR', { month: 'short' });
    evolucaoMensal.push({ mes: monthName, valor: 0 });
  }

  res.json(success({ totais, evolucao_mensal: evolucaoMensal }));
});

export default router;
