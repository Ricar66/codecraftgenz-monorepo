import { ChannelType, EmbedBuilder, TextChannel, ColorResolvable } from 'discord.js';
import { client } from '../client';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { TUTORIAL_POSTS } from '../data/tutorial-posts';

const BRAND_COLOR = 0xD12BF2 as ColorResolvable;
const SITE_URL = 'https://codecraftgenz.com.br';

export async function runTutorialJob(): Promise<void> {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) {
      logger.warn('Tutorial job: guild não encontrada');
      return;
    }

    await guild.channels.fetch();
    const channel = guild.channels.cache.find(
      c => c.name.includes('tutoriais') && c.type === ChannelType.GuildText
    ) as TextChannel | undefined;

    if (!channel) {
      logger.warn('Tutorial job: canal #tutoriais não encontrado');
      return;
    }

    // Busca slugs já enviados
    const sent = await prisma.tutorialPostLog.findMany({ select: { slug: true } });
    const sentSlugs = new Set(sent.map(s => s.slug));

    // Próximo post não enviado (mantém ordem do array)
    const next = TUTORIAL_POSTS.find(p => !sentSlugs.has(p.slug));

    if (!next) {
      logger.info('Tutorial job: todos os posts já foram enviados. Adicione novos conteúdos.');
      // Notifica via log — poderia enviar DM ao owner aqui se quiser
      return;
    }

    // Monta o embed
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(next.title)
      .setDescription(next.description)
      .setFooter({ text: 'CodeCraft Gen-Z • Conteúdo Educativo para Devs' })
      .setTimestamp();

    if (next.code) {
      embed.addFields({
        name: '💡 Exemplo de código',
        value: '```\n' + next.code + '\n```',
      });
    }

    embed.addFields({
      name: '✅ Dica',
      value: next.tip,
    });

    embed.addFields({
      name: '🚀 Quer praticar?',
      value: `[Acesse os desafios CodeCraft](${SITE_URL}/desafios)`,
    });

    await channel.send({ embeds: [embed] });

    // Registra como enviado
    await prisma.tutorialPostLog.create({ data: { slug: next.slug } });

    const remaining = TUTORIAL_POSTS.length - sentSlugs.size - 1;
    logger.info({ slug: next.slug, remaining }, 'Tutorial post enviado');

    if (remaining === 5) {
      logger.warn('Tutorial job: apenas 5 posts restantes. Considere adicionar mais conteúdo.');
    }

  } catch (err) {
    logger.error({ err }, 'Tutorial job: erro ao enviar post');
  }
}
