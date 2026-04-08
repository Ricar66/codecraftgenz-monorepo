// src/controllers/meta.controller.ts

import { Request, Response, NextFunction } from 'express';
import { metaService } from '../services/meta.service.js';
import { env } from '../config/env.js';

export const metaController = {
  // ── Metas CRUD ───────────────────────────────────────────

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const metas = await metaService.list();
      res.json({ data: metas });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const meta = await metaService.getById(Number(req.params.id));
      res.json({ data: meta });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, startDate, endDate, status, type, callLink, color, assigneeIds } = req.body;
      const meta = await metaService.create({
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        type,
        callLink,
        color,
        assigneeIds: assigneeIds ?? [],
        authorId: req.user!.id,
      });
      res.status(201).json({ data: meta });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, startDate, endDate, status, type, callLink, color, assigneeIds } = req.body;
      const meta = await metaService.update(Number(req.params.id), {
        title,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        type,
        callLink,
        color,
        assigneeIds,
      });
      res.json({ data: meta });
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await metaService.delete(Number(req.params.id));
      res.json({ message: 'Meta removida com sucesso' });
    } catch (err) { next(err); }
  },

  // ── Observations ──────────────────────────────────────────

  async addObservation(req: Request, res: Response, next: NextFunction) {
    try {
      const { content } = req.body;
      const obs = await metaService.addObservation(
        Number(req.params.id),
        req.user!.id,
        content,
      );
      res.status(201).json({ data: obs });
    } catch (err) { next(err); }
  },

  async deleteObservation(req: Request, res: Response, next: NextFunction) {
    try {
      await metaService.deleteObservation(
        Number(req.params.obsId),
        req.user!.id,
        req.user!.role,
      );
      res.json({ message: 'Observação removida' });
    } catch (err) { next(err); }
  },

  // ── Google Calendar ────────────────────────────────────────

  async calendarStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await metaService.getCalendarStatus();
      res.json(status);
    } catch (err) { next(err); }
  },

  async calendarConnect(req: Request, res: Response, next: NextFunction) {
    try {
      const url = metaService.getCalendarAuthUrl();
      res.json({ url });
    } catch (err) { next(err); }
  },

  async calendarCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.query as { code: string };
      await metaService.handleCalendarCallback(code);
      res.redirect(`${env.FRONTEND_URL}/admin/metas?gcal=connected`);
    } catch (err) { next(err); }
  },

  async calendarDisconnect(req: Request, res: Response, next: NextFunction) {
    try {
      await metaService.disconnectCalendar();
      res.json({ message: 'Google Calendar desconectado' });
    } catch (err) { next(err); }
  },

  // ── Team members ──────────────────────────────────────────

  async teamMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await metaService.getTeamMembers();
      res.json({ data: members });
    } catch (err) { next(err); }
  },
};
