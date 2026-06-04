import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Mailer do painel — usa EMAIL_TEAM_USER (fallback para EMAIL_USER).
 * Falha silenciosa: notificação é best-effort, nunca bloqueia a operação.
 */

function getTransporter() {
  const user = env.EMAIL_TEAM_USER || env.EMAIL_USER;
  const pass = env.EMAIL_TEAM_PASS || env.EMAIL_PASS;
  if (!user || !pass) {
    logger.warn('Panel mailer: credenciais ausentes (EMAIL_TEAM_USER/EMAIL_USER)');
    return null;
  }
  return nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
};

const PRIORITY_BG: Record<string, string> = {
  LOW: 'rgba(99, 102, 241, 0.18)',
  MEDIUM: 'rgba(245, 158, 11, 0.18)',
  HIGH: 'rgba(239, 68, 68, 0.22)',
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#a5b4fc',
  MEDIUM: '#fcd34d',
  HIGH: '#fca5a5',
};

const PANEL_URL = 'https://painel.codecraftgenz.com.br';

const COLORS = {
  bg: '#0a0a0f',
  card: '#16162a',
  cardSoft: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  text: '#f5f5f7',
  muted: '#a0a0b0',
  dim: '#6b7280',
  primary: '#d12bf2',
  primaryDeep: '#6366f1',
  success: '#10b981',
  successDeep: '#00e4f2',
};

function initials(label: string): string {
  if (!label) return '?';
  const name = label.includes('@') ? label.split('@')[0] : label;
  const parts = name.replace(/[._-]/g, ' ').trim().split(/\s+/);
  const first = parts[0]?.[0] || '?';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

interface AssigneeLike {
  email: string;
  name?: string | null;
}

interface ChecklistLike {
  content: string;
  done: boolean;
}

function renderAssigneeChips(assignees: AssigneeLike[]): string {
  if (!assignees || assignees.length === 0) return '';
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px;">
    <tr>${assignees
      .slice(0, 6)
      .map(
        (a) => `
      <td style="padding:0 6px 6px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.cardSoft};border:1px solid ${COLORS.border};border-radius:999px;">
          <tr>
            <td style="padding:4px 10px 4px 4px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,${COLORS.primary} 0%,${COLORS.primaryDeep} 100%);color:#fff;font-size:9px;font-weight:700;text-align:center;line-height:22px;padding:0;">
                    ${escapeHtml(initials(a.name || a.email))}
                  </td>
                  <td style="padding-left:8px;color:${COLORS.text};font-size:12px;font-weight:500;">
                    ${escapeHtml(a.name || a.email.split('@')[0])}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>`
      )
      .join('')}${
        assignees.length > 6
          ? `
      <td style="padding:0 6px 6px 0;color:${COLORS.muted};font-size:12px;line-height:30px;">+${assignees.length - 6}</td>`
          : ''
      }
    </tr>
  </table>`;
}

function renderChecklist(items: ChecklistLike[]): string {
  if (!items || items.length === 0) return '';
  const visible = items.slice(0, 8);
  const overflow = items.length - visible.length;
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${COLORS.cardSoft};border:1px solid ${COLORS.border};border-radius:10px;margin:0 0 20px;">
    <tr><td style="padding:14px 18px;">
      ${visible
        .map(
          (i) => `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:22px;vertical-align:top;padding:2px 10px 4px 0;">
            <span style="display:inline-block;width:14px;height:14px;border-radius:4px;border:1.5px solid ${
              i.done ? COLORS.success : COLORS.dim
            };background:${i.done ? COLORS.success : 'transparent'};color:#fff;font-size:10px;text-align:center;line-height:11px;font-weight:700;">${i.done ? '&#10003;' : ''}</span>
          </td>
          <td style="padding:0 0 4px;color:${i.done ? COLORS.muted : COLORS.text};font-size:13px;${
            i.done ? 'text-decoration:line-through;' : ''
          }">
            ${escapeHtml(i.content)}
          </td>
        </tr>
      </table>`
        )
        .join('')}
      ${
        overflow > 0
          ? `<p style="margin:6px 0 0;color:${COLORS.muted};font-size:11px;">+${overflow} ${overflow === 1 ? 'item' : 'itens'} a mais no painel</p>`
          : ''
      }
    </td></tr>
  </table>`;
}

function shell(opts: {
  accent: string;
  accentDeep: string;
  kicker: string;
  headline: string;
  bodyHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:${COLORS.bg};color:${COLORS.text};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${COLORS.bg};">
    <tr><td style="padding:40px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="margin:0 auto;background:${COLORS.card};border-radius:16px;overflow:hidden;border:1px solid ${COLORS.border};box-shadow:0 8px 32px rgba(0,0,0,0.35);">

        <!-- HERO -->
        <tr><td style="padding:36px 36px 28px;background:linear-gradient(135deg,${opts.accent} 0%,${opts.accentDeep} 100%);position:relative;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="font-family:'Poppins',Arial,sans-serif;font-size:13px;letter-spacing:0.22em;color:rgba(255,255,255,0.9);font-weight:600;">
                CODECRAFT &middot; PAINEL
              </td>
              <td align="right" style="font-size:11px;color:rgba(255,255,255,0.7);">
                ${new Date().toLocaleDateString('pt-BR')}
              </td>
            </tr>
          </table>
          <p style="margin:14px 0 4px;font-size:13px;color:rgba(255,255,255,0.85);letter-spacing:0.04em;text-transform:uppercase;font-weight:600;">${opts.kicker}</p>
          <h1 style="margin:0;font-family:'Poppins',Arial,sans-serif;font-size:26px;font-weight:700;color:#fff;line-height:1.25;">
            ${opts.headline}
          </h1>
        </td></tr>

        <!-- BODY -->
        <tr><td style="padding:28px 36px 8px;color:${COLORS.text};">
          ${opts.bodyHtml}
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:20px 36px 32px;border-top:1px solid ${COLORS.border};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="font-size:11px;color:${COLORS.dim};line-height:1.6;">
                Você recebeu este email porque seu endereço está na allowlist do painel interno.<br>
                Acesso restrito ao time. Se foi engano, ignore esta mensagem.
              </td>
              <td align="right" style="font-size:11px;color:${COLORS.dim};">
                <a href="${PANEL_URL}" style="color:${COLORS.primary};text-decoration:none;font-weight:600;">painel.codecraftgenz.com.br</a>
              </td>
            </tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function metaRow(label: string, value: string, color = COLORS.text): string {
  return `
  <tr>
    <td style="padding:8px 0;width:120px;font-size:12px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.04em;">${label}</td>
    <td style="padding:8px 0;font-size:13px;color:${color};">${value}</td>
  </tr>`;
}

function ctaButton(label: string, link: string, accent: string, accentDeep: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 24px;">
    <tr><td align="center">
      <a href="${link}" style="display:inline-block;padding:15px 38px;background:linear-gradient(135deg,${accent} 0%,${accentDeep} 100%);color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;letter-spacing:0.02em;">
        ${label}
      </a>
    </td></tr>
  </table>`;
}

// =============================================================
// TASK ASSIGNED EMAIL
// =============================================================

export interface TaskAssignedEmailInput {
  to: string;
  taskId: number;
  title: string;
  description?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: Date | null;
  delegatedByName: string;
  assignees?: AssigneeLike[];
  checklist?: ChecklistLike[];
  tags?: string | null;
}

function renderAssignedHtml(input: TaskAssignedEmailInput): string {
  const link = `${PANEL_URL}/task/${input.taskId}`;
  const dueLabel = input.dueDate
    ? new Intl.DateTimeFormat('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(input.dueDate))
    : 'Sem prazo definido';
  const priorityLabel = PRIORITY_LABEL[input.priority];
  const priorityChip = `<span style="display:inline-block;padding:3px 12px;border-radius:999px;background:${PRIORITY_BG[input.priority]};color:${PRIORITY_COLOR[input.priority]};font-weight:600;font-size:11px;letter-spacing:0.04em;">${priorityLabel.toUpperCase()}</span>`;

  const body = `
    <p style="margin:0 0 18px;font-size:14px;color:${COLORS.muted};line-height:1.6;">
      <strong style="color:${COLORS.text};">${escapeHtml(input.delegatedByName)}</strong> delegou uma nova tarefa para você.
    </p>

    <div style="background:${COLORS.cardSoft};border:1px solid ${COLORS.border};border-radius:12px;padding:22px;margin:0 0 22px;">
      <h2 style="margin:0 0 ${input.description ? '10px' : '0'};font-family:'Poppins',Arial,sans-serif;font-size:20px;color:${COLORS.text};line-height:1.3;font-weight:600;">${escapeHtml(input.title)}</h2>
      ${
        input.description
          ? `<p style="margin:0;color:${COLORS.muted};font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(input.description)}</p>`
          : ''
      }
    </div>

    ${
      input.assignees && input.assignees.length > 0
        ? `
    <p style="margin:0 0 8px;font-size:11px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">
      Responsáveis (${input.assignees.length})
    </p>
    ${renderAssigneeChips(input.assignees)}
    <div style="height:18px;"></div>
    `
        : ''
    }

    ${
      input.checklist && input.checklist.length > 0
        ? `
    <p style="margin:0 0 8px;font-size:11px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">
      Checklist (${input.checklist.length} ${input.checklist.length === 1 ? 'item' : 'itens'})
    </p>
    ${renderChecklist(input.checklist)}
    `
        : ''
    }

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px;">
      ${metaRow('Prioridade', priorityChip)}
      ${metaRow('Prazo', escapeHtml(dueLabel), input.dueDate ? COLORS.text : COLORS.muted)}
      ${input.tags ? metaRow('Tags', escapeHtml(input.tags)) : ''}
    </table>

    ${ctaButton('Abrir tarefa &rarr;', link, COLORS.primary, COLORS.primaryDeep)}
  `;

  return shell({
    accent: COLORS.primary,
    accentDeep: COLORS.primaryDeep,
    kicker: 'NOVA TAREFA ATRIBUÍDA',
    headline: 'Você recebeu uma tarefa',
    bodyHtml: body,
  });
}

export async function sendTaskAssignedEmail(input: TaskAssignedEmailInput): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: `"CodeCraft Painel" <${env.EMAIL_TEAM_USER || env.EMAIL_USER}>`,
      to: input.to,
      subject: `[Painel] ${input.title}`,
      html: renderAssignedHtml(input),
    });
    logger.info({ to: input.to, taskId: input.taskId }, 'Panel: email de delegação enviado');
  } catch (e) {
    logger.warn({ err: e, to: input.to, taskId: input.taskId }, 'Panel: falha ao enviar email');
  }
}

// =============================================================
// TASK COMPLETED BROADCAST
// =============================================================

export interface TaskCompletedBroadcastInput {
  recipients: string[];
  taskId: number;
  title: string;
  completedByName: string;
  description?: string | null;
  assignees?: AssigneeLike[];
  checklist?: ChecklistLike[];
}

function renderCompletedHtml(input: TaskCompletedBroadcastInput): string {
  const link = `${PANEL_URL}/task/${input.taskId}`;
  const checklistDone = input.checklist?.filter((c) => c.done).length ?? 0;
  const checklistTotal = input.checklist?.length ?? 0;

  const body = `
    <p style="margin:0 0 18px;font-size:14px;color:${COLORS.muted};line-height:1.6;">
      <strong style="color:${COLORS.text};">${escapeHtml(input.completedByName)}</strong> marcou esta tarefa como concluída.
    </p>

    <div style="background:${COLORS.cardSoft};border:1px solid ${COLORS.border};border-radius:12px;padding:22px;margin:0 0 22px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="vertical-align:top;padding-right:12px;width:36px;">
            <span style="display:inline-block;width:30px;height:30px;border-radius:50%;background:${COLORS.success};color:#fff;font-size:16px;font-weight:700;text-align:center;line-height:30px;">&#10003;</span>
          </td>
          <td>
            <h2 style="margin:0 0 ${input.description ? '8px' : '0'};font-family:'Poppins',Arial,sans-serif;font-size:18px;color:${COLORS.text};line-height:1.35;font-weight:600;text-decoration:line-through;text-decoration-color:${COLORS.success};">${escapeHtml(input.title)}</h2>
            ${
              input.description
                ? `<p style="margin:0;color:${COLORS.muted};font-size:13px;line-height:1.6;">${escapeHtml(input.description.length > 240 ? input.description.slice(0, 240) + '...' : input.description)}</p>`
                : ''
            }
          </td>
        </tr>
      </table>
    </div>

    ${
      checklistTotal > 0
        ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;background:${COLORS.cardSoft};border:1px solid ${COLORS.border};border-radius:10px;">
      <tr><td style="padding:14px 18px;">
        <p style="margin:0 0 4px;font-size:11px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Checklist</p>
        <p style="margin:0;font-size:16px;color:${COLORS.text};font-weight:600;">
          ${checklistDone}/${checklistTotal} itens concluídos
        </p>
      </td></tr>
    </table>`
        : ''
    }

    ${
      input.assignees && input.assignees.length > 0
        ? `
    <p style="margin:0 0 8px;font-size:11px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">
      Responsáveis
    </p>
    ${renderAssigneeChips(input.assignees)}
    <div style="height:18px;"></div>
    `
        : ''
    }

    ${ctaButton('Ver no painel &rarr;', link, COLORS.success, COLORS.successDeep)}
  `;

  return shell({
    accent: COLORS.success,
    accentDeep: COLORS.successDeep,
    kicker: 'TAREFA CONCLUÍDA',
    headline: 'Mais uma fechada pelo time',
    bodyHtml: body,
  });
}

export async function sendTaskCompletedBroadcast(input: TaskCompletedBroadcastInput): Promise<void> {
  const transporter = getTransporter();
  if (!transporter || input.recipients.length === 0) return;
  try {
    await transporter.sendMail({
      from: `"CodeCraft Painel" <${env.EMAIL_TEAM_USER || env.EMAIL_USER}>`,
      to: env.EMAIL_TEAM_USER || env.EMAIL_USER,
      bcc: input.recipients,
      subject: `[Painel] Concluída: ${input.title}`,
      html: renderCompletedHtml(input),
    });
    logger.info(
      { count: input.recipients.length, taskId: input.taskId },
      'Panel: broadcast de conclusão enviado'
    );
  } catch (e) {
    logger.warn({ err: e, taskId: input.taskId }, 'Panel: falha no broadcast de conclusão');
  }
}
