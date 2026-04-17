import { TextChannel, EmbedBuilder, ColorResolvable } from 'discord.js';
import { client } from '../client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

const INDIGO_COLOR = 0x6366F1 as ColorResolvable;

type Enquete = { pergunta: string; opcoes: string[] };

const ENQUETES: Enquete[] = [
  { pergunta: 'Qual stack você mais usa no dia a dia?', opcoes: ['React/Next.js', 'Vue/Nuxt', 'Angular', 'Outro frontend'] },
  { pergunta: 'Qual é seu maior desafio como dev?', opcoes: ['Conseguir o primeiro emprego', 'Subir de nível (jr→pl→sr)', 'Freelancer vs CLT', 'Empreender/produto próprio'] },
  { pergunta: 'Como você aprende programação?', opcoes: ['Projetos próprios', 'Cursos/YouTube', 'Trabalho/empresa', 'Comunidades como essa'] },
  { pergunta: 'Qual backend você prefere?', opcoes: ['Node.js/TypeScript', 'Python/Django/FastAPI', 'Java/Spring', 'PHP/Laravel'] },
  { pergunta: 'Onde você quer estar em 1 ano?', opcoes: ['Emprego CLT nacional', 'Emprego remoto internacional', 'Freelancer full-time', 'Produto/startup própria'] },
  { pergunta: 'Qual área você quer dominar?', opcoes: ['Frontend/UX', 'Backend/APIs', 'DevOps/Cloud', 'Mobile/Apps'] },
  { pergunta: 'Qual editor você usa?', opcoes: ['VS Code', 'Cursor', 'WebStorm/JetBrains', 'Neovim/Vim'] },
  { pergunta: 'O que te fez entrar na programação?', opcoes: ['Salário/mercado', 'Paixão por criar', 'Influência de alguém', 'Por acaso/curiosidade'] },
];

const REACTION_EMOJIS = ['🇦', '🇧', '🇨', '🇩'];

function getWeekNumber(date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function runEnqueteJob() {
  try {
    const enabled = await prisma.botConfig.findUnique({ where: { key: 'enquete_enabled' } });
    if (enabled?.value === 'false') return;

    const channelId = env.DISCORD_CHANNEL_GERAL ?? env.DISCORD_CHANNEL_APRESENTACOES;
    if (!channelId) {
      logger.warn('Nenhum canal configurado para enquete (DISCORD_CHANNEL_GERAL/APRESENTACOES)');
      return;
    }

    const channel = client.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      logger.warn({ channelId }, 'Canal de enquete não encontrado no cache');
      return;
    }

    // Evitar duplicidade: se já postou nos últimos 6 dias, pula
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    const recent = await prisma.botLog.findFirst({
      where: { action: 'enquete_posted', createdAt: { gte: sixDaysAgo } },
    });
    if (recent) {
      logger.info('Enquete já postada nesta semana — pulando');
      return;
    }

    const weekNum = getWeekNumber();
    const enquete = ENQUETES[weekNum % ENQUETES.length];

    // Tentar usar Poll API nativa do Discord (v14.15+)
    let msg: any = null;
    let usedPoll = false;
    try {
      msg = await (channel as any).send({
        poll: {
          question: { text: enquete.pergunta },
          answers: enquete.opcoes.map(text => ({ text })),
          duration: 48, // 48 horas
          allowMultiselect: false,
        },
      });
      usedPoll = true;
    } catch (pollErr: any) {
      logger.warn({ err: pollErr?.message }, 'Poll API não disponível — usando embed com reações');
    }

    if (!usedPoll) {
      // Fallback: embed com reações
      const optionsText = enquete.opcoes
        .map((opt, i) => `${REACTION_EMOJIS[i]} ${opt}`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(INDIGO_COLOR)
        .setTitle('📊 Enquete da Semana')
        .setDescription(`**${enquete.pergunta}**\n\n${optionsText}\n\n_Vote reagindo com o emoji correspondente!_`)
        .setFooter({ text: 'CodeCraft Gen-Z • Enquete semanal' })
        .setTimestamp();

      msg = await channel.send({ embeds: [embed] });

      // Adicionar reações
      for (let i = 0; i < enquete.opcoes.length && i < REACTION_EMOJIS.length; i++) {
        try {
          await msg.react(REACTION_EMOJIS[i]);
        } catch (err) {
          logger.warn({ err }, 'Erro ao reagir na enquete');
        }
      }
    }

    await prisma.botLog.create({
      data: {
        action: 'enquete_posted',
        status: 'ok',
        channelId,
        messageId: msg.id,
        details: JSON.stringify({ pergunta: enquete.pergunta, usedPoll, weekNum }),
      },
    });

    await prisma.jobState.upsert({
      where: { jobName: 'enquete' },
      update: { lastRunAt: new Date(), lastSuccess: new Date(), runCount: { increment: 1 } },
      create: { jobName: 'enquete', lastRunAt: new Date(), lastSuccess: new Date(), runCount: 1 },
    });

    logger.info({ usedPoll, pergunta: enquete.pergunta }, 'Enquete semanal postada');
  } catch (err: any) {
    logger.error({ err }, 'Erro no job de enquete');
    await prisma.jobState.upsert({
      where: { jobName: 'enquete' },
      update: { lastRunAt: new Date(), lastError: err.message },
      create: { jobName: 'enquete', lastRunAt: new Date(), lastError: err.message },
    }).catch(() => {});
  }
}
