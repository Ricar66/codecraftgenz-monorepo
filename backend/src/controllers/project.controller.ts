import type { Request, Response } from 'express';
import { projectService } from '../services/project.service.js';
import { success } from '../utils/response.js';
import type { CreateProjectInput, UpdateProjectInput } from '../schemas/project.schema.js';

export const projectController = {
  async getAll(_req: Request, res: Response) {
    const projects = await projectService.getAll();
    res.json(success(projects));
  },

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const project = await projectService.getById(id);
    res.json(success(project));
  },

  async getByStatus(req: Request, res: Response) {
    const status = req.query.status as string || 'ativo';
    const projects = await projectService.getByStatus(status);
    res.json(success(projects));
  },

  async create(req: Request, res: Response) {
    const data = req.validated?.body as CreateProjectInput;
    const project = await projectService.create(data);
    res.status(201).json(success(project));
  },

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = req.validated?.body as UpdateProjectInput;
    const project = await projectService.update(id, data);
    res.json(success(project));
  },

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    await projectService.delete(id);
    res.status(204).send();
  },

  async assignMentor(req: Request, res: Response) {
    const projectId = Number(req.params.id);
    const { mentor_id } = req.validated?.body as { mentor_id: number };
    const project = await projectService.assignMentor(projectId, mentor_id);
    res.json(success(project));
  },
};
