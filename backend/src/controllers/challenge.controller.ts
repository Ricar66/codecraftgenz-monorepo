import type { Request, Response } from 'express';
import { challengeService } from '../services/challenge.service.js';
import { success } from '../utils/response.js';
import type {
  CreateChallengeInput,
  UpdateChallengeInput,
  SubmitChallengeInput,
  ReviewSubmissionInput,
  SubmitRepoInput,
  ListSubmissionsQuery,
  ReviewRepoSubmissionInput,
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

  // =============================================================
  // Novo fluxo de submissão
  // =============================================================

  async submitRepo(req: Request, res: Response) {
    const challengeId = Number(req.params.id);
    const userId = req.user!.id;
    const data = req.validated?.body as SubmitRepoInput;
    const result = await challengeService.submitRepo(challengeId, userId, data);
    res.status(201).json(success(result));
  },

  async getMySubmission(req: Request, res: Response) {
    const challengeId = Number(req.params.id);
    const userId = req.user!.id;
    const result = await challengeService.getMySubmission(challengeId, userId);
    res.json(success(result));
  },

  async listSubmissions(req: Request, res: Response) {
    const query = req.validated?.query as ListSubmissionsQuery;
    const result = await challengeService.listSubmissions(query);
    res.json(success(result));
  },

  async reviewRepoSubmission(req: Request, res: Response) {
    const submissionId = Number(req.params.submissionId);
    const data = req.validated?.body as ReviewRepoSubmissionInput;
    const result = await challengeService.reviewRepoSubmission(submissionId, data);
    res.json(success(result));
  },
};
