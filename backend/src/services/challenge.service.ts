import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/AppError.js';
import { leadService } from './lead.service.js';
import { notifyBot } from './discord-oauth.service.js';
import { logger } from '../utils/logger.js';
import type {
  CreateChallengeInput,
  UpdateChallengeInput,
  SubmitChallengeInput,
  ReviewSubmissionInput,
  SubmitRepoInput,
  ListSubmissionsQuery,
  ReviewRepoSubmissionInput,
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

    // Notifica Discord bot sobre novo desafio
    notifyBot('/hook/new-challenge', {
      nome: challenge.name,
      dificuldade: challenge.difficulty,
      pontos: challenge.basePoints ?? 0,
    }).catch(() => {});

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
      where: { desafioId: challengeId, userId },
    });

    if (existing) {
      throw AppError.conflict('Você já está inscrito neste desafio');
    }

    const submission = await prisma.challengeSubmission.create({
      data: {
        desafioId: challengeId,
        userId,
        status: 'subscribed',
      },
    });

    // Captura lead
    const subUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (subUser) {
      leadService.captureLead({
        nome: subUser.name || undefined,
        email: subUser.email,
        origin: 'challenge_subscribe',
        originId: challengeId,
        originRef: challenge.name,
      }).catch((e) => { logger.warn({ error: e }, 'Non-critical async operation failed'); });
    }

    return { submission_id: submission.id, status: 'subscribed' };
  },

  async submit(challengeId: number, userId: number, data: SubmitChallengeInput) {
    const submission = await prisma.challengeSubmission.findFirst({
      where: { desafioId: challengeId, userId },
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
          where: { userId: submission.userId },
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

  // =============================================================
  // Novo fluxo: submissão por URL de repositório (GitHub/GitLab)
  // =============================================================

  async submitRepo(challengeId: number, userId: number, data: SubmitRepoInput) {
    const challenge = await prisma.desafio.findUnique({ where: { id: challengeId } });
    if (!challenge) {
      throw AppError.notFound('Desafio');
    }

    if (challenge.status !== 'active') {
      throw AppError.badRequest('Este desafio não está mais aberto para submissões');
    }

    const existing = await prisma.challengeSubmission.findFirst({
      where: { desafioId: challengeId, userId },
    });

    if (existing) {
      throw AppError.conflict('Você já submeteu uma solução para este desafio');
    }

    const submission = await prisma.challengeSubmission.create({
      data: {
        desafioId: challengeId,
        userId,
        repoUrl: data.repoUrl,
        deliveryUrl: data.repoUrl, // mantém compatibilidade com fluxo legado
        description: data.description,
        status: 'pending',
        submittedAt: new Date(),
      },
    });

    // Captura lead
    const subUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (subUser) {
      leadService
        .captureLead({
          nome: subUser.name || undefined,
          email: subUser.email,
          origin: 'challenge_subscribe',
          originId: challengeId,
          originRef: challenge.name,
        })
        .catch((e) => {
          logger.warn({ error: e }, 'Non-critical async operation failed');
        });
    }

    return mapSubmission(submission);
  },

  async getMySubmission(challengeId: number, userId: number) {
    const submission = await prisma.challengeSubmission.findFirst({
      where: { desafioId: challengeId, userId },
    });
    return submission ? mapSubmission(submission) : null;
  },

  async listSubmissions(query: ListSubmissionsQuery) {
    const { status, page, limit } = query;
    const where = status ? { status } : {};
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.challengeSubmission.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          desafio: { select: { id: true, name: true, basePoints: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.challengeSubmission.count({ where }),
    ]);

    return {
      items: items.map((s) => ({
        ...mapSubmission(s),
        user: s.user,
        challenge: s.desafio,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  },

  async reviewRepoSubmission(submissionId: number, data: ReviewRepoSubmissionInput) {
    const submission = await prisma.challengeSubmission.findUnique({
      where: { id: submissionId },
      include: { desafio: true },
    });

    if (!submission) {
      throw AppError.notFound('Submissão');
    }

    const points = data.points ?? (data.status === 'approved' ? submission.desafio.basePoints : 0);

    const updated = await prisma.challengeSubmission.update({
      where: { id: submissionId },
      data: {
        status: data.status,
        feedback: data.feedback,
        points: data.status === 'approved' ? points : 0,
        reviewedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        desafio: { select: { id: true, name: true, basePoints: true } },
      },
    });

    // Se aprovado, adiciona pontos ao usuário e atualiza o crafter se existir
    if (data.status === 'approved' && points > 0) {
      await prisma.user.update({
        where: { id: submission.userId },
        data: { points: { increment: points } },
      });

      const crafter = await prisma.crafter.findFirst({
        where: { userId: submission.userId },
      });

      if (crafter) {
        await prisma.crafter.update({
          where: { id: crafter.id },
          data: { pontos: { increment: points } },
        });
      }

      // Atualiza MemberScore do Discord se o usuário tiver conta vinculada
      const discordLink = await prisma.discordLink.findUnique({
        where: { userId: submission.userId },
      });

      if (discordLink) {
        try {
          await prisma.memberScore.update({
            where: { discordId: discordLink.discordId },
            data: { score: { increment: points } },
          });
        } catch (e) {
          logger.warn({ error: e }, 'Falha ao incrementar MemberScore do Discord');
        }
      }
    }

    return {
      ...mapSubmission(updated),
      user: updated.user,
      challenge: updated.desafio,
    };
  },
};

function mapSubmission(submission: {
  id: number;
  desafioId: number;
  userId: number;
  repoUrl: string | null;
  description: string | null;
  deliveryUrl: string | null;
  deliveryText: string | null;
  notes: string | null;
  status: string;
  score: number | null;
  points: number;
  feedback: string | null;
  reviewFeedback: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: submission.id,
    desafio_id: submission.desafioId,
    user_id: submission.userId,
    repo_url: submission.repoUrl ?? submission.deliveryUrl,
    description: submission.description ?? submission.notes,
    status: submission.status,
    points: submission.points,
    feedback: submission.feedback ?? submission.reviewFeedback,
    submitted_at: submission.submittedAt,
    reviewed_at: submission.reviewedAt,
    created_at: submission.createdAt,
    updated_at: submission.updatedAt,
  };
}

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
