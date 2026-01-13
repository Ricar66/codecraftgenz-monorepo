import type { Request, Response } from 'express';
import { mentorService } from '../services/mentor.service.js';
import { success } from '../utils/response.js';
import type { CreateMentorInput, UpdateMentorInput } from '../schemas/mentor.schema.js';

export const mentorController = {
  async getAll(_req: Request, res: Response) {
    const mentors = await mentorService.getAll();
    res.json(success(mentors));
  },

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const mentor = await mentorService.getById(id);
    res.json(success(mentor));
  },

  async create(req: Request, res: Response) {
    const data = req.validated?.body as CreateMentorInput;
    const mentor = await mentorService.create(data);
    res.status(201).json(success(mentor));
  },

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = req.validated?.body as UpdateMentorInput;
    const mentor = await mentorService.update(id, data);
    res.json(success(mentor));
  },

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    await mentorService.delete(id);
    res.status(204).send();
  },
};
