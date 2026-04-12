import { EmbedBuilder, ColorResolvable } from 'discord.js';

const BRAND_COLOR = 0xD12BF2 as ColorResolvable;
const CYAN_COLOR = 0x00E4F2 as ColorResolvable;
const GOLD_COLOR = 0xF59E0B as ColorResolvable;

export function welcomeEmbed(username: string) {
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`👋 Bem-vindo(a), ${username}!`)
    .setDescription(
      'Seja bem-vindo(a) à **CodeCraft Gen-Z** — a comunidade de devs que estão crescendo de verdade.\n\n' +
      '📋 Leia as regras em <#rules>\n' +
      '👋 Se apresente em <#apresentacoes>\n' +
      '💬 Bata um papo em <#geral>\n\n' +
      '🚀 Acesse a plataforma em **codecraftgenz.com.br**'
    )
    .setFooter({ text: 'CodeCraft Gen-Z • Devs que evoluem juntos' })
    .setTimestamp();
}

export function rankingEmbed(crafters: Array<{ nome: string; pontos: number }>) {
  const medals = ['🥇', '🥈', '🥉'];
  const description = crafters
    .map((c, i) => `${medals[i] ?? `**${i + 1}.**`} **${c.nome}** — ${c.pontos} pts`)
    .join('\n');

  return new EmbedBuilder()
    .setColor(GOLD_COLOR)
    .setTitle('🏆 Ranking Semanal — CodeCraft Gen-Z')
    .setDescription(description || 'Nenhum Crafter encontrado ainda.')
    .setFooter({ text: 'Participe de desafios para acumular pontos!' })
    .setTimestamp();
}

export function challengeEmbed(challenge: {
  nome?: string;
  name?: string;
  difficulty?: string;
  dificuldade?: string;
  description?: string;
  descricao?: string;
  reward?: number;
  recompensa?: number;
}) {
  const name = challenge.nome ?? challenge.name ?? 'Novo Desafio';
  const diff = challenge.difficulty ?? challenge.dificuldade ?? 'N/A';
  const reward = challenge.reward ?? challenge.recompensa ?? 0;

  return new EmbedBuilder()
    .setColor(CYAN_COLOR)
    .setTitle(`🚀 Novo Desafio: ${name}`)
    .addFields(
      { name: 'Dificuldade', value: diff, inline: true },
      { name: 'Recompensa', value: `${reward} pts`, inline: true },
    )
    .setDescription('Acesse a plataforma para participar!')
    .setURL('https://codecraftgenz.com.br/desafios')
    .setFooter({ text: 'CodeCraft Gen-Z • Desafios' })
    .setTimestamp();
}

export function appEmbed(app: { name?: string; nome?: string; category?: string; categoria?: string }) {
  const name = app.name ?? app.nome ?? 'Novo App';
  const category = app.category ?? app.categoria ?? '';

  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`🛍️ Novo App no Marketplace: ${name}`)
    .setDescription(category ? `Categoria: **${category}**\n\nAcesse o marketplace para conferir!` : 'Acesse o marketplace para conferir!')
    .setURL('https://codecraftgenz.com.br/apps')
    .setFooter({ text: 'CodeCraft Gen-Z • Marketplace' })
    .setTimestamp();
}

export function newsEmbed(item: { title: string; link: string; contentSnippet?: string; source?: string }) {
  return new EmbedBuilder()
    .setColor(0x6366F1 as ColorResolvable)
    .setTitle(item.title)
    .setURL(item.link)
    .setDescription(item.contentSnippet ? item.contentSnippet.slice(0, 200) + '...' : '')
    .setFooter({ text: item.source ?? 'Tech News' })
    .setTimestamp();
}

export function vagaEmbed(vaga: { title: string; link: string; contentSnippet?: string; company?: string }) {
  return new EmbedBuilder()
    .setColor(0x22C55E as ColorResolvable)
    .setTitle(`💼 ${vaga.title}`)
    .setURL(vaga.link)
    .setDescription(vaga.contentSnippet ? vaga.contentSnippet.slice(0, 200) + '...' : '')
    .setFooter({ text: vaga.company ?? 'ProgramaThor' })
    .setTimestamp();
}
