// src/services/analytics.service.ts
// Serviço de Analytics — recebe, persiste e agrega eventos de comportamento do frontend

import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Converte string de período (ex: "30d", "7d", "90d") para uma Date no passado.
 */
function parsePeriod(period: string): Date {
  const match = period.match(/^(\d+)d$/);
  const days = match ? parseInt(match[1], 10) : 30;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

interface RawEvent {
  event_name?: unknown;
  event_category?: unknown;
  session_id?: unknown;
  page_url?: unknown;
  page_path?: unknown;
  referrer?: unknown;
  device_type?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_term?: unknown;
  utm_content?: unknown;
  properties?: unknown;
  timestamp?: unknown;
}

export const analyticsService = {
  /**
   * Persiste um lote de eventos vindos do frontend.
   * Erros são absorvidos — tracking não pode derrubar o site.
   */
  async saveEvents(events: RawEvent[]) {
    if (!events?.length) return 0;

    const data = events
      .filter(e => e.event_name && e.session_id)
      .map(e => ({
        eventName:     String(e.event_name    || '').slice(0, 128),
        eventCategory: String(e.event_category || 'general').slice(0, 64),
        sessionId:     String(e.session_id    || '').slice(0, 128),
        pageUrl:       e.page_url   ? String(e.page_url).slice(0, 1024)  : null,
        pagePath:      e.page_path  ? String(e.page_path).slice(0, 512)  : null,
        referrer:      e.referrer   ? String(e.referrer).slice(0, 1024)  : null,
        deviceType:    e.device_type? String(e.device_type).slice(0, 32) : null,
        utmSource:     e.utm_source  ? String(e.utm_source).slice(0, 256)  : null,
        utmMedium:     e.utm_medium  ? String(e.utm_medium).slice(0, 256)  : null,
        utmCampaign:   e.utm_campaign? String(e.utm_campaign).slice(0, 256): null,
        utmTerm:       e.utm_term    ? String(e.utm_term).slice(0, 256)    : null,
        utmContent:    e.utm_content ? String(e.utm_content).slice(0, 256) : null,
        properties:    e.properties && typeof e.properties === 'object'
          ? JSON.stringify(e.properties)
          : null,
        timestamp: e.timestamp ? new Date(e.timestamp as string) : new Date(),
      }));

    if (!data.length) return 0;

    const { count } = await prisma.analyticsEvent.createMany({ data, skipDuplicates: false });
    return count;
  },

  /**
   * Lista eventos com filtros e paginação (para o painel admin).
   */
  async getEvents({
    limit = 50,
    offset = 0,
    category,
    period,
    event_name,
  }: {
    limit?: number;
    offset?: number;
    category?: string;
    period?: string;
    event_name?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (category)   where.eventCategory = category;
    if (event_name) where.eventName     = event_name;
    if (period)     where.timestamp     = { gte: parsePeriod(period) };

    const [events, total] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: Math.min(limit, 200),
        skip: offset,
        select: {
          id:            true,
          eventName:     true,
          eventCategory: true,
          sessionId:     true,
          pagePath:      true,
          pageUrl:       true,
          deviceType:    true,
          timestamp:     true,
        },
      }),
      prisma.analyticsEvent.count({ where }),
    ]);

    return {
      data: events.map(e => ({
        id:             e.id,
        event_name:     e.eventName,
        event_category: e.eventCategory,
        session_id:     e.sessionId,
        page_path:      e.pagePath,
        page_url:       e.pageUrl,
        device_type:    e.deviceType,
        timestamp:      e.timestamp,
      })),
      total,
    };
  },

  /**
   * Retorna contagem de eventos por step para um funil específico.
   * Resposta: [{ name: 'app_viewed', count: 42 }, ...]
   */
  async getFunnelData(funnelName: string, period = '30d') {
    const since = parsePeriod(period);

    const result = await prisma.analyticsEvent.groupBy({
      by: ['eventName'],
      where: {
        eventCategory: funnelName,
        timestamp: { gte: since },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return result.map(r => ({
      name:  r.eventName,
      count: r._count.id,
    }));
  },

  /**
   * Retorna um resumo geral de analytics para o período.
   */
  async getSummary(period = '30d') {
    const since = parsePeriod(period);

    const [totalEvents, sessionGroups, topEvents, deviceBreakdown] = await Promise.all([
      prisma.analyticsEvent.count({ where: { timestamp: { gte: since } } }),
      prisma.analyticsEvent.groupBy({
        by: ['sessionId'],
        where: { timestamp: { gte: since } },
        _count: { id: true },
      }),
      prisma.analyticsEvent.groupBy({
        by: ['eventName', 'eventCategory'],
        where: { timestamp: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.analyticsEvent.groupBy({
        by: ['deviceType'],
        where: { timestamp: { gte: since } },
        _count: { id: true },
      }),
    ]);

    return {
      total_events:    totalEvents,
      unique_sessions: sessionGroups.length,
      top_events: topEvents.map(e => ({
        event_name:     e.eventName,
        event_category: e.eventCategory,
        count:          e._count.id,
      })),
      devices: deviceBreakdown.map(d => ({
        device_type: d.deviceType || 'unknown',
        count:       d._count.id,
      })),
    };
  },

  /**
   * Remove eventos com mais de 90 dias — chamado periodicamente.
   */
  async cleanup() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    try {
      const { count } = await prisma.analyticsEvent.deleteMany({
        where: { timestamp: { lt: cutoff } },
      });
      if (count > 0) logger.info({ count }, 'Analytics events cleanup');
      return count;
    } catch (err) {
      logger.error({ err }, 'Erro no cleanup de analytics events');
      return 0;
    }
  },
};
