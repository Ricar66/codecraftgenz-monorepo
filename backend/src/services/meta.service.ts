// src/services/meta.service.ts
// CRUD operations for the Metas (Goals) module.

import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/AppError.js';
import { teamCalendarService } from './team-calendar.service.js';
import { emailService } from './email.service.js';
import { logger } from '../utils/logger.js';

const INCLUDE_FULL = {
  author: { select: { id: true, name: true, email: true } },
  assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
  observations: {
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
};

export const metaService = {
  /** List all metas, ordered by startDate */
  async list() {
    return prisma.meta.findMany({
      include: INCLUDE_FULL,
      orderBy: { startDate: 'asc' },
    });
  },

  /** Get a single meta by ID */
  async getById(id: number) {
    const meta = await prisma.meta.findUnique({ where: { id }, include: INCLUDE_FULL });
    if (!meta) throw AppError.notFound('Meta não encontrada');
    return meta;
  },

  /** Create a new meta. If type === 'meeting' and Google Calendar connected, creates event + Meet link. */
  async create(data: {
    title: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    status?: string;
    type?: string;
    callLink?: string;
    color?: string;
    assigneeIds?: number[];
    authorId: number;
  }) {
    let callLink = data.callLink ?? null;
    let googleEventId: string | null = null;

    // Auto-create Google Meet if type is meeting and calendar is connected
    if (data.type === 'meeting' && !callLink) {
      try {
        const endDate = data.endDate ?? new Date(data.startDate.getTime() + 60 * 60 * 1000);
        const gcalEvent = await teamCalendarService.createEvent({
          title: data.title,
          description: data.description,
          startDate: data.startDate,
          endDate,
        });
        if (gcalEvent) {
          callLink = gcalEvent.meetLink;
          googleEventId = gcalEvent.eventId;
        }
      } catch (err) {
        logger.warn({ err }, 'Falha ao criar evento Meet para a meta');
      }
    }

    const meta = await prisma.meta.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        status: data.status ?? 'pending',
        type: data.type ?? 'goal',
        callLink,
        googleEventId,
        color: data.color ?? '#D12BF2',
        authorId: data.authorId,
        assignees: data.assigneeIds?.length
          ? { create: data.assigneeIds.map(userId => ({ userId })) }
          : undefined,
      },
      include: INCLUDE_FULL,
    });

    // Dispara email de convite para os assignees se for reunião com participantes
    if (data.type === 'meeting' && data.assigneeIds?.length) {
      try {
        const recipients = await prisma.user.findMany({
          where: { id: { in: data.assigneeIds } },
          select: { name: true, email: true },
        });
        const organizer = await prisma.user.findUnique({
          where: { id: data.authorId },
          select: { name: true },
        });
        if (recipients.length > 0) {
          void emailService.sendMeetingInvite({
            recipients,
            meetingTitle: data.title,
            description: data.description,
            startDate: data.startDate,
            endDate: data.endDate,
            callLink: callLink ?? undefined,
            organizerName: organizer?.name ?? 'Equipe CodeCraft',
          });
        }
      } catch (err) {
        logger.warn({ err }, 'Falha ao enviar convites de reunião por email');
      }
    }

    return meta;
  },

  /** Update a meta. Re-syncs Google Calendar if meeting details change. */
  async update(id: number, data: {
    title?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
    type?: string;
    callLink?: string;
    color?: string;
    assigneeIds?: number[];
  }) {
    const existing = await prisma.meta.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Meta não encontrada');

    // If assignees are being replaced, delete existing first
    if (data.assigneeIds !== undefined) {
      await prisma.metaAssignee.deleteMany({ where: { metaId: id } });
    }

    return prisma.meta.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.callLink !== undefined && { callLink: data.callLink }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.assigneeIds !== undefined && data.assigneeIds.length > 0 && {
          assignees: { create: data.assigneeIds.map(userId => ({ userId })) },
        }),
      },
      include: INCLUDE_FULL,
    });
  },

  /** Delete a meta. Also removes the Google Calendar event if one was created. */
  async delete(id: number) {
    const meta = await prisma.meta.findUnique({ where: { id } });
    if (!meta) throw AppError.notFound('Meta não encontrada');

    if (meta.googleEventId) {
      void teamCalendarService.deleteEvent(meta.googleEventId);
    }

    await prisma.meta.delete({ where: { id } });
  },

  // ── Observations ──────────────────────────────────────────

  async addObservation(metaId: number, authorId: number, content: string) {
    // Ensure meta exists
    const meta = await prisma.meta.findUnique({ where: { id: metaId } });
    if (!meta) throw AppError.notFound('Meta não encontrada');

    return prisma.metaObservation.create({
      data: { metaId, authorId, content },
      include: { author: { select: { id: true, name: true } } },
    });
  },

  async deleteObservation(observationId: number, requesterId: number, requesterRole: string) {
    const obs = await prisma.metaObservation.findUnique({ where: { id: observationId } });
    if (!obs) throw AppError.notFound('Observação não encontrada');

    const isAdmin = ['admin', 'editor'].includes(requesterRole);
    if (!isAdmin && obs.authorId !== requesterId) {
      throw AppError.forbidden('Você só pode remover suas próprias observações');
    }

    await prisma.metaObservation.delete({ where: { id: observationId } });
  },

  // ── Google Calendar connection ─────────────────────────────

  async getCalendarStatus() {
    return { connected: await teamCalendarService.isConnected() };
  },

  getCalendarAuthUrl() {
    return teamCalendarService.getAuthUrl();
  },

  async handleCalendarCallback(code: string) {
    await teamCalendarService.handleCallback(code);
  },

  async disconnectCalendar() {
    await teamCalendarService.disconnect();
  },

  // ── Team members (for assignee picker) ────────────────────

  async getTeamMembers() {
    return prisma.user.findMany({
      where: { role: { in: ['admin', 'editor', 'team'] }, status: 'ativo' },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
  },
};
