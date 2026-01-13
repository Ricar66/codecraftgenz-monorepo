import type { Request, Response } from 'express';
import { challengeService } from '../services/challenge.service.js';
import { success } from '../utils/response.js';
import type {
  CreateChallengeInput,
  UpdateChallengeInput,
  SubmitChallengeInput,
  ReviewSubmissionInput,
} from '../schemas/challenge.schema.js';

export const challengeController = {
  async getAll(req: Request, res: Response) {
    const includeHidden = req.user?.role === 'admin';
    const challenges = await challengeService.getAll(includeHidden);
    res.json(success(challenges));
  },

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const challenge = await challengeService.getById(id);
    res.json(success(challenge));
  },

  async create(req: Request, res: Response) {
    const data = req.validated?.body as CreateChallengeInput;
    const createdBy = req.user!.id;
    const challenge = await challengeService.create(data, createdBy);
    res.status(201).json(success(challenge));
  },

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = req.validated?.body as UpdateChallengeInput;
    const challenge = await challengeService.update(id, data);
    res.json(success(challenge));
  },

  async toggleVisibility(req: Request, res: Response) {
    const id = Number(req.params.id);
    const challenge = await challengeService.toggleVisibility(id);
    res.json(success(challenge));
  },

  async updateStatus(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { status } = req.body;
    const challenge = await challengeService.updateStatus(id, status);
    res.json(success(challenge));
  },

  async subscribe(req: Request, res: Response) {
    const challengeId = Number(req.params.id);
    const userId = req.user!.id;
    const result = await challengeService.subscribe(challengeId, userId);
    res.status(201).json(success(result));
  },

  async submit(req: Request, res: Response) {
    const challengeId = Number(req.params.id);
    const userId = req.user!.id;
    const data = req.validated?.body as SubmitChallengeInput;
    const result = await challengeService.submit(challengeId, userId, data);
    res.json(success(result));
  },

  async reviewSubmission(req: Request, res: Response) {
    const submissionId = Number(req.params.id);
    const data = req.validated?.body as ReviewSubmissionInput;
    const result = await challengeService.reviewSubmission(submissionId, data);
    res.json(success(result));
  },
};
