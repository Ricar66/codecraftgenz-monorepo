// src/services/lead.service.ts
// Leads Engine - captura unificada de leads de todos os canais

import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

export type LeadOrigin =
  | 'crafter_signup' | 'app_download' | 'app_purchase'
  | 'challenge_subscribe' | 'feedback' | 'proposal'
  | 'registration' | 'contact';

interface CaptureLeadInput {
  nome?: string;
  email: string;
  telefone?: string;
  origin: LeadOrigin;
  originId?: number;
  originRef?: string;
  metadata?: Record<string, unknown>;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  ip?: string;
  userAgent?: string;
}

export const leadService = {
  /**
   * Captura um lead - fire-and-forget safe (catches own errors)
   */
  async captureLead(input: CaptureLeadInput) {
    try {
      const lead = await prisma.lead.create({
        data: {
          nome: input.nome || null,
          email: input.email,
          telefone: input.telefone || null,
          origin: input.origin,
          originId: input.originId ?? null,
          originRef: input.originRef || null,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          utmSource: input.utmSource || null,
          utmMedium: input.utmMedium || null,
          utmCampaign: input.utmCampaign || null,
          ip: input.ip || null,
          userAgent: input.userAgent?.substring(0, 512) || null,
        },
      });
      logger.info({ leadId: lead.id, origin: input.origin, email: input.email }, 'Lead capturado');
      return lead;
    } catch (err) {
      logger.warn({ error: (err as Error).message, origin: input.origin }, 'Falha ao capturar lead');
      return null;
    }
  },

  /**
   * Dashboard com dados agregados para admin
   */
  async getDashboardData(periodo: string = '30d') {
    const days = parseInt(periodo) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      totalLeads,
      newLeads,
      convertedLeads,
      byOrigin,
      byStatus,
      recentLeads,
      dailyCounts,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: since } } }),
      prisma.lead.count({ where: { status: 'converted' } }),
      prisma.lead.groupBy({
        by: ['origin'],
        _count: { id: true },
        where: { createdAt: { gte: since } },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.lead.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true, nome: true, email: true, telefone: true,
          origin: true, originRef: true, status: true,
          createdAt: true, convertedAt: true,
        },
      }),
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE(createdAt) as date, COUNT(*) as count
        FROM leads
        WHERE createdAt >= ${since}
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `,
    ]);

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads * 100) : 0;

    return {
      kpis: {
        total: totalLeads,
        new_period: newLeads,
        converted: convertedLeads,
        conversion_rate: Math.round(conversionRate * 10) / 10,
      },
      by_origin: byOrigin.map(g => ({ origin: g.origin, count: g._count.id })),
      by_status: byStatus.map(g => ({ status: g.status, count: g._count.id })),
      daily_chart: (dailyCounts as Array<{ date: unknown; count: unknown }>).map(d => ({
        date: String(d.date),
        count: Number(d.count),
      })),
      recent: recentLeads.map(l => ({
        id: l.id,
        nome: l.nome,
        email: l.email,
        telefone: l.telefone,
        origin: l.origin,
        origin_ref: l.originRef,
        status: l.status,
        created_at: l.createdAt,
        converted_at: l.convertedAt,
      })),
    };
  },

  /**
   * Lista paginada com filtros
   */
  async getAll(filters: { origin?: string; status?: string; search?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 25, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.origin) where.origin = filters.origin;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { nome: { contains: filters.search } },
        { email: { contains: filters.search } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return {
      leads: leads.map(l => ({
        id: l.id,
        nome: l.nome,
        email: l.email,
        telefone: l.telefone,
        origin: l.origin,
        origin_id: l.originId,
        origin_ref: l.originRef,
        status: l.status,
        metadata: l.metadata,
        utm_source: l.utmSource,
        utm_medium: l.utmMedium,
        utm_campaign: l.utmCampaign,
        created_at: l.createdAt,
        converted_at: l.convertedAt,
      })),
      total,
      page,
      limit,
    };
  },

  /**
   * Atualizar status do lead
   */
  async updateStatus(id: number, status: string) {
    const data: Record<string, unknown> = { status };
    if (status === 'converted') data.convertedAt = new Date();
    return prisma.lead.update({ where: { id }, data });
  },
};
