import { Router, Request } from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import multer, { FileFilterCallback } from 'multer';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/response.js';
import { validate } from '../../middlewares/validate.js';
import { rateLimiter } from '../../middlewares/rateLimiter.js';
import { authenticatePanel, panelCsrfGuard } from '../../middlewares/authPanel.js';
import {
  panelCreateTaskSchema,
  panelUpdateTaskSchema,
  panelTaskIdParamSchema,
  panelListTasksSchema,
  panelCreateCommentSchema,
  panelDeleteCommentSchema,
  panelAttachmentIdParamSchema,
  panelAttachmentTaskParamSchema,
  panelCreateChecklistItemSchema,
  panelUpdateChecklistItemSchema,
  panelDeleteChecklistItemSchema,
  type PanelCreateTaskInput,
  type PanelUpdateTaskInput,
  type PanelListTasksQuery,
  type PanelCreateCommentInput,
  type PanelCreateChecklistItemInput,
  type PanelUpdateChecklistItemInput,
} from '../../schemas/panel.schema.js';
import { env } from '../../config/env.js';
import { detectKind, sanitizeDisplayFilename } from '../../utils/panelFileGuard.js';
import { sendTaskAssignedEmail, sendTaskCompletedBroadcast } from '../../services/panelMailer.js';

const router = Router();

router.use(authenticatePanel);
router.use(panelCsrfGuard);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.PANEL_UPLOAD_MAX_BYTES, files: 1 },
  fileFilter: (_req: Request, _file: Express.Multer.File, cb: FileFilterCallback) => cb(null, true),
});

const PANEL_MAX_ATTACHMENTS_PER_TASK = 5;

// =============================================================
// Helpers
// =============================================================

const taskInclude = {
  delegatedBy: { select: { id: true, email: true, name: true } },
  assignees: { select: { email: true }, orderBy: { id: 'asc' as const } },
  checklist: { orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }] },
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: { select: { id: true, email: true, name: true } } },
  },
  attachments: {
    orderBy: { createdAt: 'asc' as const },
    include: { uploader: { select: { id: true, email: true, name: true } } },
  },
};

const taskListInclude = {
  delegatedBy: { select: { id: true, email: true, name: true } },
  assignees: { select: { email: true }, orderBy: { id: 'asc' as const } },
  checklist: {
    select: { id: true, content: true, done: true, position: true },
    orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
  },
  _count: { select: { comments: true, attachments: true, checklist: true } },
};

async function loadActivePanelEmails(): Promise<string[]> {
  const users = await prisma.panelUser.findMany({
    where: { status: 'ativo' },
    select: { email: true },
  });
  return users.map((u) => u.email);
}

async function disparaEmailDelegacao(
  taskId: number,
  title: string,
  description: string | null,
  priority: 'LOW' | 'MEDIUM' | 'HIGH',
  dueDate: Date | null,
  assigneeEmails: string[],
  delegatedByName: string,
  tags: string | null,
  checklist: { content: string; done: boolean }[]
) {
  if (assigneeEmails.length === 0) return;
  // Resolve nomes dos assignees (apenas os que tem conta no painel)
  const allAssignees = await prisma.panelUser.findMany({
    where: { email: { in: assigneeEmails } },
    select: { email: true, name: true },
  });
  const assigneeMap = new Map(allAssignees.map((u) => [u.email, u.name]));
  const enrichedAssignees = assigneeEmails.map((email) => ({
    email,
    name: assigneeMap.get(email) ?? null,
  }));

  // Notifica os que tem conta ativa
  const activeUsers = await prisma.panelUser.findMany({
    where: { email: { in: assigneeEmails }, status: 'ativo' },
    select: { email: true },
  });
  await Promise.allSettled(
    activeUsers.map((u) =>
      sendTaskAssignedEmail({
        to: u.email,
        taskId,
        title,
        description,
        priority,
        dueDate,
        delegatedByName,
        assignees: enrichedAssignees,
        checklist,
        tags,
      })
    )
  );
}

async function broadcastConclusao(taskId: number, completedByName: string) {
  const recipients = await loadActivePanelEmails();
  if (recipients.length === 0) return;

  // Recarrega a task com tudo pra montar o email rico
  const task = await prisma.panelTask.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      description: true,
      assignees: { select: { email: true } },
      checklist: { select: { content: true, done: true } },
    },
  });
  if (!task) return;

  const assigneeEmails = task.assignees.map((a) => a.email);
  const allAssignees = await prisma.panelUser.findMany({
    where: { email: { in: assigneeEmails } },
    select: { email: true, name: true },
  });
  const assigneeMap = new Map(allAssignees.map((u) => [u.email, u.name]));
  const enrichedAssignees = assigneeEmails.map((email) => ({
    email,
    name: assigneeMap.get(email) ?? null,
  }));

  await sendTaskCompletedBroadcast({
    recipients,
    taskId,
    title: task.title,
    completedByName,
    description: task.description,
    assignees: enrichedAssignees,
    checklist: task.checklist,
  });
}

/**
 * Verifica se TODOS os itens do checklist (existentes) estão "done".
 * Retorna true se há itens E todos estão concluídos.
 * Usado pra auto-conclusão da tarefa.
 */
async function checklistTotalmenteConcluido(taskId: number): Promise<boolean> {
  const total = await prisma.panelTaskChecklistItem.count({ where: { taskId } });
  if (total === 0) return false;
  const done = await prisma.panelTaskChecklistItem.count({ where: { taskId, done: true } });
  return done === total;
}

function safeStoragePath(storedAs: string): string | null {
  if (!/^[a-f0-9]{32}(\.[a-z0-9]{1,5})?$/.test(storedAs)) return null;
  const base = path.resolve(env.PANEL_UPLOAD_DIR);
  const full = path.resolve(base, storedAs);
  if (!full.startsWith(base + path.sep) && full !== base) return null;
  return full;
}

async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(env.PANEL_UPLOAD_DIR, { recursive: true, mode: 0o700 });
}

// =============================================================
// TASKS
// =============================================================

router.get('/', validate(panelListTasksSchema), async (req, res, next) => {
  try {
    const q = req.validated!.query as PanelListTasksQuery;
    const where: Prisma.PanelTaskWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.priority) where.priority = q.priority;
    if (q.tag) where.tags = { contains: q.tag };
    if (q.assignee) where.assignees = { some: { email: q.assignee } };

    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await Promise.all([
      prisma.panelTask.findMany({
        where,
        orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: q.pageSize,
        include: taskListInclude,
      }),
      prisma.panelTask.count({ where }),
    ]);

    return sendSuccess(res, { items, total, page: q.page, pageSize: q.pageSize });
  } catch (e) {
    return next(e);
  }
});

router.get('/:id', validate(panelTaskIdParamSchema), async (req, res, next) => {
  try {
    const { id } = req.validated!.params as { id: number };
    const task = await prisma.panelTask.findUnique({ where: { id }, include: taskInclude });
    if (!task) throw AppError.notFound('Tarefa');
    return sendSuccess(res, task);
  } catch (e) {
    return next(e);
  }
});

router.post(
  '/',
  rateLimiter.sensitive,
  validate(panelCreateTaskSchema),
  async (req, res, next) => {
    try {
      const body = req.validated!.body as PanelCreateTaskInput;
      const uniqueAssignees = Array.from(new Set(body.assignees.map((e) => e.toLowerCase())));

      const task = await prisma.panelTask.create({
        data: {
          title: body.title,
          description: body.description ?? null,
          delegatedById: req.panelUser!.id,
          dueDate: body.dueDate ?? null,
          priority: body.priority,
          tags: body.tags ?? null,
          assignees: { create: uniqueAssignees.map((email) => ({ email })) },
          checklist:
            body.checklist && body.checklist.length > 0
              ? {
                  create: body.checklist.map((content, idx) => ({
                    content: content.trim(),
                    position: idx,
                  })),
                }
              : undefined,
        },
        include: taskInclude,
      });

      // Email assíncrono pros assignees que são usuários do painel
      disparaEmailDelegacao(
        task.id,
        task.title,
        task.description,
        task.priority,
        task.dueDate,
        uniqueAssignees,
        req.panelUser!.name,
        task.tags,
        task.checklist.map((c) => ({ content: c.content, done: c.done }))
      ).catch(() => undefined);

      return sendSuccess(res, task, 201);
    } catch (e) {
      return next(e);
    }
  }
);

router.patch('/:id', validate(panelUpdateTaskSchema), async (req, res, next) => {
  try {
    const { id } = req.validated!.params as { id: number };
    const body = req.validated!.body as PanelUpdateTaskInput;

    const existing = await prisma.panelTask.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Tarefa');

    const data: Prisma.PanelTaskUpdateInput = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.tags !== undefined) data.tags = body.tags;

    let virouDone = false;
    if (body.status !== undefined && body.status !== existing.status) {
      data.status = body.status;
      if (body.status === 'DONE') {
        data.completedAt = new Date();
        data.completedBy = req.panelUser!.email;
        virouDone = true;
      } else {
        data.completedAt = null;
        data.completedBy = null;
      }
    }

    // Atualiza assignees (replace all) em transação
    let updated;
    if (body.assignees !== undefined) {
      const uniqueAssignees = Array.from(new Set(body.assignees.map((e) => e.toLowerCase())));
      updated = await prisma.$transaction(async (tx) => {
        await tx.panelTaskAssignee.deleteMany({ where: { taskId: id } });
        await tx.panelTaskAssignee.createMany({
          data: uniqueAssignees.map((email) => ({ taskId: id, email })),
        });
        return tx.panelTask.update({ where: { id }, data, include: taskInclude });
      });
    } else {
      updated = await prisma.panelTask.update({ where: { id }, data, include: taskInclude });
    }

    if (virouDone) {
      broadcastConclusao(updated.id, req.panelUser!.name).catch(() => undefined);
    }

    return sendSuccess(res, updated);
  } catch (e) {
    return next(e);
  }
});

router.delete('/:id', validate(panelTaskIdParamSchema), async (req, res, next) => {
  try {
    const { id } = req.validated!.params as { id: number };
    const task = await prisma.panelTask.findUnique({
      where: { id },
      include: { attachments: { select: { storedAs: true } } },
    });
    if (!task) throw AppError.notFound('Tarefa');

    await Promise.all(
      task.attachments.map(async (a) => {
        const file = safeStoragePath(a.storedAs);
        if (file) await fs.unlink(file).catch(() => undefined);
      })
    );

    await prisma.panelTask.delete({ where: { id } });
    return sendSuccess(res, { ok: true });
  } catch (e) {
    return next(e);
  }
});

// =============================================================
// CHECKLIST
// =============================================================

router.post(
  '/:taskId/checklist',
  validate(panelCreateChecklistItemSchema),
  async (req, res, next) => {
    try {
      const { taskId } = req.validated!.params as { taskId: number };
      const { content } = req.validated!.body as PanelCreateChecklistItemInput;

      const task = await prisma.panelTask.findUnique({ where: { id: taskId } });
      if (!task) throw AppError.notFound('Tarefa');

      const max = await prisma.panelTaskChecklistItem.aggregate({
        where: { taskId },
        _max: { position: true },
      });
      const item = await prisma.panelTaskChecklistItem.create({
        data: {
          taskId,
          content,
          position: (max._max.position ?? -1) + 1,
        },
      });
      return sendSuccess(res, item, 201);
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:taskId/checklist/:itemId',
  validate(panelUpdateChecklistItemSchema),
  async (req, res, next) => {
    try {
      const { taskId, itemId } = req.validated!.params as { taskId: number; itemId: number };
      const body = req.validated!.body as PanelUpdateChecklistItemInput;

      const item = await prisma.panelTaskChecklistItem.findUnique({ where: { id: itemId } });
      if (!item || item.taskId !== taskId) throw AppError.notFound('Item');

      const data: Prisma.PanelTaskChecklistItemUpdateInput = {};
      if (body.content !== undefined) data.content = body.content;
      if (body.position !== undefined) data.position = body.position;
      if (body.done !== undefined && body.done !== item.done) {
        data.done = body.done;
        if (body.done) {
          data.doneAt = new Date();
          data.doneBy = req.panelUser!.email;
        } else {
          data.doneAt = null;
          data.doneBy = null;
        }
      }

      const updated = await prisma.panelTaskChecklistItem.update({ where: { id: itemId }, data });

      // Auto-conclusão da tarefa: se ficamos com todos os itens "done", marcar PENDING -> DONE
      if (body.done === true) {
        const task = await prisma.panelTask.findUnique({
          where: { id: taskId },
          select: { id: true, status: true, title: true },
        });
        if (task && task.status === 'PENDING' && (await checklistTotalmenteConcluido(taskId))) {
          await prisma.panelTask.update({
            where: { id: taskId },
            data: {
              status: 'DONE',
              completedAt: new Date(),
              completedBy: req.panelUser!.email,
            },
          });
          broadcastConclusao(taskId, req.panelUser!.name).catch(() => undefined);
        }
      }

      return sendSuccess(res, updated);
    } catch (e) {
      return next(e);
    }
  }
);

router.delete(
  '/:taskId/checklist/:itemId',
  validate(panelDeleteChecklistItemSchema),
  async (req, res, next) => {
    try {
      const { taskId, itemId } = req.validated!.params as { taskId: number; itemId: number };
      const item = await prisma.panelTaskChecklistItem.findUnique({ where: { id: itemId } });
      if (!item || item.taskId !== taskId) throw AppError.notFound('Item');
      await prisma.panelTaskChecklistItem.delete({ where: { id: itemId } });
      return sendSuccess(res, { ok: true });
    } catch (e) {
      return next(e);
    }
  }
);

// =============================================================
// COMMENTS
// =============================================================

router.post(
  '/:taskId/comments',
  rateLimiter.sensitive,
  validate(panelCreateCommentSchema),
  async (req, res, next) => {
    try {
      const { taskId } = req.validated!.params as { taskId: number };
      const { content } = req.validated!.body as PanelCreateCommentInput;
      const task = await prisma.panelTask.findUnique({ where: { id: taskId } });
      if (!task) throw AppError.notFound('Tarefa');
      const comment = await prisma.panelTaskComment.create({
        data: { taskId, authorId: req.panelUser!.id, content },
        include: { author: { select: { id: true, email: true, name: true } } },
      });
      return sendSuccess(res, comment, 201);
    } catch (e) {
      return next(e);
    }
  }
);

router.delete(
  '/:taskId/comments/:id',
  validate(panelDeleteCommentSchema),
  async (req, res, next) => {
    try {
      const { id, taskId } = req.validated!.params as { id: number; taskId: number };
      const comment = await prisma.panelTaskComment.findUnique({ where: { id } });
      if (!comment || comment.taskId !== taskId) throw AppError.notFound('Comentário');
      if (comment.authorId !== req.panelUser!.id) {
        throw AppError.forbidden('Apenas o autor pode deletar o comentário');
      }
      await prisma.panelTaskComment.delete({ where: { id } });
      return sendSuccess(res, { ok: true });
    } catch (e) {
      return next(e);
    }
  }
);

// =============================================================
// ATTACHMENTS
// =============================================================

router.post(
  '/:taskId/attachments',
  rateLimiter.sensitive,
  validate(panelAttachmentTaskParamSchema),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const { taskId } = req.validated!.params as { taskId: number };
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) throw AppError.badRequest('Arquivo ausente');

      const task = await prisma.panelTask.findUnique({
        where: { id: taskId },
        include: { _count: { select: { attachments: true } } },
      });
      if (!task) throw AppError.notFound('Tarefa');

      if (task._count.attachments >= PANEL_MAX_ATTACHMENTS_PER_TASK) {
        throw AppError.badRequest(
          `Esta tarefa j&aacute; tem ${PANEL_MAX_ATTACHMENTS_PER_TASK} anexos (m&aacute;ximo permitido).`
        );
      }

      const kind = detectKind(file.buffer);
      if (!kind) {
        throw AppError.badRequest(
          'Tipo de arquivo não permitido. Aceitos: PDF, PNG, JPG, GIF, WEBP, TXT, CSV.'
        );
      }

      await ensureUploadDir();
      const storedAs = `${crypto.randomBytes(16).toString('hex')}.${kind.ext}`;
      const fullPath = safeStoragePath(storedAs);
      if (!fullPath) throw AppError.internal('Falha ao montar caminho seguro');
      await fs.writeFile(fullPath, file.buffer, { mode: 0o600 });

      const displayName = sanitizeDisplayFilename(file.originalname || `arquivo.${kind.ext}`);

      const attachment = await prisma.panelTaskAttachment.create({
        data: {
          taskId,
          uploaderId: req.panelUser!.id,
          filename: displayName,
          storedAs,
          mimetype: kind.mime,
          size: file.size,
        },
        include: { uploader: { select: { id: true, email: true, name: true } } },
      });

      return sendSuccess(res, attachment, 201);
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/:taskId/attachments/:id',
  validate(panelAttachmentIdParamSchema),
  async (req, res, next) => {
    try {
      const { id, taskId } = req.validated!.params as { id: number; taskId: number };
      const att = await prisma.panelTaskAttachment.findUnique({ where: { id } });
      if (!att || att.taskId !== taskId) throw AppError.notFound('Anexo');

      const file = safeStoragePath(att.storedAs);
      if (!file) throw AppError.internal('Anexo com caminho inválido');

      const data = await fs.readFile(file).catch(() => null);
      if (!data) throw AppError.notFound('Anexo');

      const kind = detectKind(data);
      if (!kind || kind.mime !== att.mimetype) {
        throw AppError.internal('Anexo corrompido ou com tipo inconsistente');
      }

      res.setHeader('Content-Type', kind.mime);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${att.filename.replace(/"/g, '')}"`
      );
      res.setHeader('Cache-Control', 'private, no-store');
      return res.send(data);
    } catch (e) {
      return next(e);
    }
  }
);

router.delete(
  '/:taskId/attachments/:id',
  validate(panelAttachmentIdParamSchema),
  async (req, res, next) => {
    try {
      const { id, taskId } = req.validated!.params as { id: number; taskId: number };
      const att = await prisma.panelTaskAttachment.findUnique({ where: { id } });
      if (!att || att.taskId !== taskId) throw AppError.notFound('Anexo');
      if (att.uploaderId !== req.panelUser!.id) {
        throw AppError.forbidden('Apenas quem enviou pode deletar o anexo');
      }

      const file = safeStoragePath(att.storedAs);
      if (file) await fs.unlink(file).catch(() => undefined);
      await prisma.panelTaskAttachment.delete({ where: { id } });
      return sendSuccess(res, { ok: true });
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
