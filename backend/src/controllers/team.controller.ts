import type { Request, Response } from 'express';
import { teamService } from '../services/team.service.js';
import { success } from '../utils/response.js';
import type { CreateTeamInput, UpdateTeamInput } from '../schemas/team.schema.js';

export const teamController = {
  async getAll(_req: Request, res: Response) {
    const teams = await teamService.getAll();
    res.json(success(teams));
  },

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const team = await teamService.getById(id);
    res.json(success(team));
  },

  async create(req: Request, res: Response) {
    const data = req.validated?.body as CreateTeamInput;
    const team = await teamService.create(data);
    res.status(201).json(success(team));
  },

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = req.validated?.body as UpdateTeamInput;
    const team = await teamService.update(id, data);
    res.json(success(team));
  },

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    await teamService.delete(id);
    res.status(204).send();
  },

  async updateStatus(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { status } = req.validated?.body as { status: string };
    const team = await teamService.updateStatus(id, status);
    res.json(success(team));
  },
};
