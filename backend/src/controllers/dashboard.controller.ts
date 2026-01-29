import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { success, error } from '../utils/response.js';

/**
 * GET /api/dashboard/stats
 * Get aggregated dashboard statistics with real data
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const periodo = String(req.query.periodo || '30d');
    const days = periodo.endsWith('d') ? parseInt(periodo.replace('d', '')) : 30;
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Parallel queries for performance
    const [
      totalFinances,
      paidFinances,
      pendingFinances,
      discountFinances,
      usersCount,
      craftersCount,
      projectsCount,
      appsCount,
    ] = await Promise.all([
      // Total finances
      prisma.finance.aggregate({
        _sum: { valor: true },
        where: { createdAt: { gte: fromDate } },
      }),
      // Paid finances
      prisma.finance.aggregate({
        _sum: { valor: true },
        where: {
          createdAt: { gte: fromDate },
          status: { in: ['paid', 'pago'] },
        },
      }),
      // Pending finances
      prisma.finance.aggregate({
        _sum: { valor: true },
        where: {
          createdAt: { gte: fromDate },
          status: { in: ['pending', 'pendente'] },
        },
      }),
      // Discounts
      prisma.finance.aggregate({
        _sum: { valor: true },
        where: {
          createdAt: { gte: fromDate },
          status: { in: ['discount', 'desconto'] },
        },
      }),
      // Users count
      prisma.user.count(),
      // Crafters count
      prisma.crafter.count(),
      // Projects count
      prisma.project.count(),
      // Apps count
      prisma.app.count(),
    ]);

    // Calculate totals
    const totalReceita = Number(totalFinances._sum.valor) || 0;
    const receitaPaga = Number(paidFinances._sum.valor) || 0;
    const receitaPendente = Number(pendingFinances._sum.valor) || 0;
    const descontos = Number(discountFinances._sum.valor) || 0;

    // Generate chart data (last 6 months)
    const chartData = await generateChartData();

    // Projects by status
    const [projectsAtivos, projectsFinalizados] = await Promise.all([
      prisma.project.count({
        where: { status: { in: ['ativo', 'ongoing', 'em_andamento'] } },
      }),
      prisma.project.count({
        where: { status: { in: ['concluido', 'finalizado', 'completed'] } },
      }),
    ]);

    res.json(
      success({
        finance: {
          total: totalReceita,
          paid: receitaPaga,
          pending: receitaPendente,
          discounts: descontos,
        },
        users: {
          total: usersCount,
          crafters: craftersCount,
        },
        projects: {
          total: projectsCount,
          active: projectsAtivos,
          completed: projectsFinalizados,
        },
        apps: {
          total: appsCount,
        },
        chartData,
        period: periodo,
      })
    );
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json(error('Erro ao carregar estatísticas do dashboard'));
  }
};

/**
 * Generate monthly chart data for the last 6 months
 */
async function generateChartData() {
  const months: Array<{ month: string; revenue: number; expenses: number }> = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

    const monthName = date.toLocaleString('pt-BR', { month: 'short' });

    // Get finances for this month
    const [paidSum, pendingSum] = await Promise.all([
      prisma.finance.aggregate({
        _sum: { valor: true },
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: { in: ['paid', 'pago'] },
        },
      }),
      prisma.finance.aggregate({
        _sum: { valor: true },
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: { in: ['pending', 'pendente'] },
        },
      }),
    ]);

    months.push({
      month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      revenue: Number(paidSum._sum.valor) || 0,
      expenses: Number(pendingSum._sum.valor) || 0,
    });
  }

  return months;
}

/**
 * GET /api/dashboard/kpis
 * Get key performance indicators
 */
export const getKPIs = async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

    // Current month stats
    const [currentMonthRevenue, lastMonthRevenue, newUsersThisMonth] =
      await Promise.all([
        prisma.finance.aggregate({
          _sum: { valor: true },
          where: {
            createdAt: { gte: startOfMonth },
            status: { in: ['paid', 'pago'] },
          },
        }),
        prisma.finance.aggregate({
          _sum: { valor: true },
          where: {
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
            status: { in: ['paid', 'pago'] },
          },
        }),
        prisma.user.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
      ]);

    const currentRevenue = Number(currentMonthRevenue._sum.valor) || 0;
    const lastRevenue = Number(lastMonthRevenue._sum.valor) || 0;
    const revenueGrowth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    res.json(
      success({
        revenue: {
          current: currentRevenue,
          last: lastRevenue,
          growth: revenueGrowth.toFixed(1),
        },
        newUsers: newUsersThisMonth,
      })
    );
  } catch (err) {
    console.error('Dashboard KPIs error:', err);
    res.status(500).json(error('Erro ao carregar KPIs'));
  }
};
