// src/services/email-drip.service.ts
// Onboarding email drip: sequência de 3 emails nos dias 0, 3 e 7 após cadastro.

import nodemailer from 'nodemailer';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const LOGO_URL = 'https://codecraftgenz.com.br/logo-principal.png';
const SITE_URL = 'https://codecraftgenz.com.br';
const DISCORD_INVITE = 'https://discord.gg/jKcuM5u6Qa';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Cria um transporter usando as credenciais team@ (com fallback) — mesmo padrão
 * do emailService para mensagens de relacionamento.
 */
function createDripTransporter() {
  const user = env.EMAIL_TEAM_USER || env.EMAIL_USER;
  const pass = env.EMAIL_TEAM_PASS || env.EMAIL_PASS;

  if (!user || !pass) {
    logger.warn('Email drip credentials not configured');
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

interface DripTemplate {
  subject: string;
  html: (name: string) => string;
  text: (name: string) => string;
}

/**
 * Layout base (header + body + footer) para os emails do drip.
 */
function wrapHtml(titleBadge: string, heading: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(209,43,242,0.2);box-shadow:0 4px 32px rgba(0,0,0,0.4);">
      <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px 40px;text-align:center;border-bottom:2px solid #D12BF2;">
        <img src="${LOGO_URL}" alt="CodeCraft Gen-Z" style="max-width:200px;height:auto;margin-bottom:20px;display:block;margin-left:auto;margin-right:auto;" />
        <div style="display:inline-block;background:rgba(209,43,242,0.15);border:1px solid rgba(209,43,242,0.4);border-radius:8px;padding:6px 16px;margin-bottom:12px;">
          <span style="color:#D12BF2;font-size:13px;font-weight:600;letter-spacing:0.05em;">${titleBadge}</span>
        </div>
        <h1 style="margin:0;color:#F5F5F7;font-size:22px;font-weight:700;line-height:1.3;">${heading}</h1>
      </div>
      <div style="padding:32px 40px;color:#d1d5db;font-size:15px;line-height:1.7;">
        ${inner}
      </div>
      <div style="background:rgba(255,255,255,0.02);padding:16px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
        <p style="color:#6b7280;font-size:12px;margin:0;">© ${new Date().getFullYear()} CodeCraft Gen-Z · <a href="${SITE_URL}" style="color:#6366f1;text-decoration:none;">codecraftgenz.com.br</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

const TEMPLATES: Record<number, DripTemplate> = {
  1: {
    subject: 'Bem-vindo(a) à CodeCraft Gen-Z 🚀',
    html: (name) => wrapHtml(
      '🚀 BOAS-VINDAS',
      `Bem-vindo(a), ${name}!`,
      `
      <p>Que bom te ver por aqui! A <strong style="color:#00E4F2;">CodeCraft Gen-Z</strong> é uma plataforma feita para devs como você: marketplace de apps, desafios pagos, mentorias com profissionais do mercado, ranking de crafters e oportunidades B2B.</p>
      <p>Comece agora:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${SITE_URL}" style="display:inline-block;background:linear-gradient(135deg,#D12BF2,#a020c0);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;letter-spacing:0.02em;">Explorar a plataforma →</a>
      </div>
      <div style="background:rgba(0,228,242,0.08);border:1px solid rgba(0,228,242,0.2);border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;color:#00E4F2;font-weight:600;">💬 Entre na comunidade no Discord</p>
        <p style="margin:0 0 12px;color:#d1d5db;font-size:14px;">Converse com outros devs, participe de eventos e receba dicas diárias.</p>
        <a href="${DISCORD_INVITE}" style="color:#00E4F2;text-decoration:none;font-weight:600;">${DISCORD_INVITE} →</a>
      </div>
      <p style="margin-top:24px;">Até breve! 🚀<br/><strong style="color:#F5F5F7;">Equipe CodeCraft Gen-Z</strong></p>`
    ),
    text: (name) =>
      `Bem-vindo(a), ${name}!\n\nA CodeCraft Gen-Z é uma plataforma para devs: marketplace de apps, desafios pagos, mentorias, ranking e oportunidades B2B.\n\nExplore: ${SITE_URL}\nEntre no Discord: ${DISCORD_INVITE}\n\nAté breve!\nEquipe CodeCraft Gen-Z`,
  },

  2: {
    subject: 'Complete seu perfil e ganhe visibilidade ✨',
    html: (name) => wrapHtml(
      '✨ PRÓXIMO PASSO',
      `${name}, hora de completar seu perfil`,
      `
      <p>Perfis completos são <strong style="color:#00E4F2;">5x mais vistos</strong> por empresas e mentores na plataforma. Leva menos de 2 minutos:</p>
      <ul style="color:#d1d5db;margin:16px 0;padding-left:20px;line-height:1.9;">
        <li>Adicione uma <strong style="color:#F5F5F7;">foto</strong> para personalizar seu perfil</li>
        <li>Escreva uma <strong style="color:#F5F5F7;">bio curta</strong> mostrando quem você é</li>
        <li>Selecione sua <strong style="color:#F5F5F7;">stack de tecnologias</strong> favoritas</li>
      </ul>
      <div style="text-align:center;margin:28px 0;">
        <a href="${SITE_URL}/perfil" style="display:inline-block;background:linear-gradient(135deg,#D12BF2,#a020c0);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;">Completar perfil agora →</a>
      </div>
      <p style="color:#a0a0b0;font-size:13px;">Dica: quem tem bio e foto aparece melhor posicionado no ranking e recebe mais convites para propostas B2B.</p>
      <p style="margin-top:24px;">Bora?<br/><strong style="color:#F5F5F7;">Equipe CodeCraft Gen-Z</strong></p>`
    ),
    text: (name) =>
      `Olá ${name},\n\nPerfis completos são 5x mais vistos por empresas e mentores. Leva 2 minutos:\n\n- Adicione uma foto\n- Escreva uma bio\n- Selecione sua stack\n\nComplete agora: ${SITE_URL}/perfil\n\nEquipe CodeCraft Gen-Z`,
  },

  3: {
    subject: 'Novo desafio disponível esta semana ⚔️',
    html: (name) => wrapHtml(
      '⚔️ HORA DE CODAR',
      `${name}, seu primeiro desafio te espera`,
      `
      <p>A plataforma tem <strong style="color:#00E4F2;">desafios semanais</strong> com recompensas em dinheiro e pontos no ranking. Escolha um que combine com sua stack e mostre pra todo mundo do que você é capaz.</p>
      <div style="background:rgba(209,43,242,0.08);border:1px solid rgba(209,43,242,0.3);border-radius:12px;padding:20px 24px;margin:24px 0;">
        <p style="margin:0 0 8px;color:#D12BF2;font-weight:600;">🏆 Por que participar?</p>
        <ul style="color:#d1d5db;margin:0;padding-left:20px;line-height:1.9;">
          <li>Ganhe pontos e suba no ranking de Crafters</li>
          <li>Receba feedback real de mentores</li>
          <li>Monte um portfólio de projetos reais</li>
        </ul>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${SITE_URL}/desafios" style="display:inline-block;background:linear-gradient(135deg,#D12BF2,#a020c0);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;letter-spacing:0.02em;">Ver desafios desta semana →</a>
      </div>
      <p style="margin-top:24px;">Boa sorte! 🚀<br/><strong style="color:#F5F5F7;">Equipe CodeCraft Gen-Z</strong></p>`
    ),
    text: (name) =>
      `Olá ${name},\n\nTemos desafios semanais com recompensas em dinheiro e pontos no ranking. Escolha um, codifique e mostre seu valor.\n\nVer desafios: ${SITE_URL}/desafios\n\nEquipe CodeCraft Gen-Z`,
  },
};

export const emailDripService = {
  /**
   * Agenda os 3 emails do drip de onboarding para um usuário.
   * Step 1 = agora | Step 2 = +3 dias | Step 3 = +7 dias.
   * Idempotente: se já existirem, reutiliza (@@unique userId+step evita duplicação).
   */
  async scheduleOnboardingDrip(userId: number, _email: string, _name: string): Promise<void> {
    const now = new Date();

    const steps = [
      { step: 1, scheduledFor: now },
      { step: 2, scheduledFor: new Date(now.getTime() + 3 * DAY_MS) },
      { step: 3, scheduledFor: new Date(now.getTime() + 7 * DAY_MS) },
    ];

    try {
      // createMany + skipDuplicates não é suportado em MySQL do Prisma com unique composto
      // de forma totalmente idempotente — então usa upsert por step.
      for (const s of steps) {
        await prisma.emailDrip.upsert({
          where: { userId_step: { userId, step: s.step } },
          update: {}, // não sobrescreve se já existir (idempotente)
          create: {
            userId,
            step: s.step,
            scheduledFor: s.scheduledFor,
          },
        });
      }
      logger.info({ userId }, 'Onboarding drip scheduled');
    } catch (err) {
      logger.warn({ err, userId }, 'Failed to schedule onboarding drip');
    }
  },

  /**
   * Envia um único drip (helper interno).
   */
  async sendDripEmail(to: string, name: string, step: number): Promise<boolean> {
    const tpl = TEMPLATES[step];
    if (!tpl) {
      logger.warn({ step }, 'Unknown drip step');
      return false;
    }

    const transporter = createDripTransporter();
    if (!transporter) return false;

    const teamEmail = env.EMAIL_TEAM_USER || env.EMAIL_USER;

    try {
      const info = await transporter.sendMail({
        from: `"CodeCraft Gen-Z" <${teamEmail}>`,
        to,
        subject: tpl.subject,
        text: tpl.text(name),
        html: tpl.html(name),
      });
      logger.info({ messageId: info.messageId, to, step }, 'Drip email sent');
      return true;
    } catch (err) {
      logger.warn({ err, to, step }, 'Failed to send drip email');
      return false;
    }
  },

  /**
   * Processa todos os drips pendentes (scheduledFor <= now && sentAt = null).
   * Retorna contagem de emails enviados com sucesso.
   */
  async processEmailDrips(): Promise<{ sent: number; failed: number }> {
    const now = new Date();

    const pending = await prisma.emailDrip.findMany({
      where: {
        sentAt: null,
        scheduledFor: { lte: now },
      },
      include: {
        user: { select: { id: true, email: true, name: true, status: true } },
      },
      take: 200, // proteção contra lote gigante
    });

    let sent = 0;
    let failed = 0;

    for (const drip of pending) {
      // Pula usuários inativos/removidos
      if (!drip.user || drip.user.status !== 'ativo') {
        await prisma.emailDrip.update({
          where: { id: drip.id },
          data: { sentAt: new Date() }, // marca como enviado para não reprocessar
        });
        continue;
      }

      const ok = await this.sendDripEmail(drip.user.email, drip.user.name || 'Crafter', drip.step);

      if (ok) {
        await prisma.emailDrip.update({
          where: { id: drip.id },
          data: { sentAt: new Date() },
        });
        sent++;
      } else {
        failed++;
      }
    }

    if (pending.length > 0) {
      logger.info({ total: pending.length, sent, failed }, 'Email drips processed');
    }

    return { sent, failed };
  },
};
