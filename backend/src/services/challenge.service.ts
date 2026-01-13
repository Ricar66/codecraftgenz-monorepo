import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/AppError.js';
import type {
  CreateChallengeInput,
  UpdateChallengeInput,
  SubmitChallengeInput,
  ReviewSubmissionInput,
} from '../schemas/challenge.schema.js';

export const challengeService = {
  async getAll(includeHidden = false) {
    const where = includeHidden ? {} : { visible: true };
    const challenges = await prisma.desafio.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return challenges.map(mapChallenge);
  },

  async getById(id: number) {
    const challenge = await prisma.desafio.findUnique({
      where: { id },
    });
    if (!challenge) {
      throw AppError.notFound('Desafio');
    }
    return mapChallenge(challenge);
  },

  async create(data: CreateChallengeInput, createdBy: number) {
    const challenge = await prisma.desafio.create({
      data: {
        name: data.name,
        objective: data.objective,
        description: data.description,
        difficulty: data.difficulty ?? 'medio',
        deadline: data.deadline ? new Date(data.deadline) : null,
        reward: data.reward,
        basePoints: data.base_points ?? 100,
        tagsJson: data.tags ? JSON.stringify(data.tags) : null,
        deliveryType: data.delivery_type ?? 'link',
        thumbUrl: data.thumb_url,
        visible: data.visible ?? true,
        status: 'active',
        createdBy,
      },
    });
    return mapChallenge(challenge);
  },

  async update(id: number, data: UpdateChallengeInput) {
    const exists = await prisma.desafio.findUnique({ where: { id } });
    if (!exists) {
      throw AppError.notFound('Desafio');
    }

    const challenge = await prisma.desafio.update({
      where: { id },
      data: {
        name: data.name,
        objective: data.objective,
        description: data.description,
        difficulty: data.difficulty,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        reward: data.reward,
        basePoints: data.base_points,
        tagsJson: data.tags ? JSON.stringify(data.tags) : undefined,
        deliveryType: data.delivery_type,
        thumbUrl: data.thumb_url,
        status: data.status,
        visible: data.visible,
      },
    });
    return mapChallenge(challenge);
  },

  async toggleVisibility(id: number) {
    const challenge = await prisma.desafio.findUnique({ where: { id } });
    if (!challenge) {
      throw AppError.notFound('Desafio');
    }

    const updated = await prisma.desafio.update({
      where: { id },
      data: { visible: !challenge.visible },
    });
    return mapChallenge(updated);
  },

  async updateStatus(id: number, status: string) {
    const challenge = await prisma.desafio.findUnique({ where: { id } });
    if (!challenge) {
      throw AppError.notFound('Desafio');
    }

    const updated = await prisma.desafio.update({
      where: { id },
      data: { status },
    });
    return mapChallenge(updated);
  },

  async subscribe(challengeId: number, userId: number) {
    const challenge = await prisma.desafio.findUnique({ where: { id: challengeId } });
    if (!challenge) {
      throw AppError.notFound('Desafio');
    }

    if (challenge.status !== 'active') {
      throw AppError.badRequest('Este desafio não está aberto para inscrições');
    }

    // Verificar se já está inscrito
    const existing = await prisma.challengeSubmission.findFirst({
      where: { desafioId: challengeId, oderId: userId },
    });

    if (existing) {
      throw AppError.conflict('Você já está inscrito neste desafio');
    }

    const submission = await prisma.challengeSubmission.create({
      data: {
        desafioId: challengeId,
        oderId: userId,
        status: 'subscribed',
      },
    });

    return { submission_id: submission.id, status: 'subscribed' };
  },

  async submit(challengeId: number, userId: number, data: SubmitChallengeInput) {
    const submission = await prisma.challengeSubmission.findFirst({
      where: { desafioId: challengeId, oderId: userId },
    });

    if (!submission) {
      throw AppError.badRequest('Você não está inscrito neste desafio');
    }

    if (submission.status === 'submitted' || submission.status === 'approved') {
      throw AppError.conflict('Você já enviou uma entrega para este desafio');
    }

    const updated = await prisma.challengeSubmission.update({
      where: { id: submission.id },
      data: {
        deliveryUrl: data.delivery_url,
        deliveryText: data.delivery_text,
        notes: data.notes,
        status: 'submitted',
        submittedAt: new Date(),
      },
    });

    return { submission_id: updated.id, status: 'submitted' };
  },

  async reviewSubmission(submissionId: number, data: ReviewSubmissionInput) {
    const submission = await prisma.challengeSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw AppError.notFound('Submissão');
    }

    const updated = await prisma.challengeSubmission.update({
      where: { id: submissionId },
      data: {
        status: data.status,
        score: data.score,
        reviewFeedback: data.feedback,
        reviewedAt: new Date(),
      },
    });

    // Se aprovado, adicionar pontos ao crafter
    if (data.status === 'approved' && data.score) {
      const desafio = await prisma.desafio.findUnique({
        where: { id: submission.desafioId },
      });

      if (desafio) {
        const crafter = await prisma.crafter.findFirst({
          where: { userId: submission.oderId },
        });

        if (crafter) {
          const pointsEarned = Math.round((desafio.basePoints * data.score) / 100);
          await prisma.crafter.update({
            where: { id: crafter.id },
            data: { pontos: { increment: pointsEarned } },
          });
        }
      }
    }

    return { submission_id: updated.id, status: updated.status, score: updated.score };
  },
};

function mapChallenge(challenge: {
  id: number;
  name: string;
  objective: string | null;
  description: string | null;
  difficulty: string;
  deadline: Date | null;
  reward: unknown;
  basePoints: number;
  tagsJson: string | null;
  deliveryType: string;
  thumbUrl: string | null;
  status: string;
  visible: boolean;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  let tags: string[] = [];
  if (challenge.tagsJson) {
    try {
      tags = JSON.parse(challenge.tagsJson);
    } catch {
      tags = [];
    }
  }

  return {
    id: challenge.id,
    name: challenge.name,
    objective: challenge.objective,
    description: challenge.description,
    difficulty: challenge.difficulty,
    deadline: challenge.deadline,
    reward: challenge.reward ? Number(challenge.reward) : null,
    base_points: challenge.basePoints,
    tags,
    delivery_type: challenge.deliveryType,
    thumb_url: challenge.thumbUrl,
    status: challenge.status,
    visible: challenge.visible,
    created_by: challenge.createdBy,
    created_at: challenge.createdAt,
    updated_at: challenge.updatedAt,
  };
}
