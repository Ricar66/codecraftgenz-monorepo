import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ColorResolvable } from 'discord.js';

const BRAND_COLOR = 0xD12BF2 as ColorResolvable;
const CYAN_COLOR = 0x00E4F2 as ColorResolvable;
const GOLD_COLOR = 0xF59E0B as ColorResolvable;

export function welcomeEmbed(username: string) {
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`👋 Bem-vindo(a), ${username}! Você chegou à CodeCraft Gen-Z 🚀`)
    .setDescription(
      'Aqui devs crescem de verdade — não só aprendem, **constroem e vendem**.\n\n' +
      '🎯 **O que você pode fazer aqui:**\n' +
      '• Resolver desafios e subir no ranking\n' +
      '• Vender seus apps no marketplace\n' +
      '• Encontrar mentores e parceiros\n' +
      '• Ver vagas e freelas todo dia\n\n' +
      '📋 **Comece agora:**\n' +
      '→ Se apresente em **#apresentações** (+3 pts)\n' +
      '→ Use `/meu-rank` para ver seus pontos\n' +
      '→ Acesse **codecraftgenz.com.br** para criar sua conta\n\n' +
      '💡 **Quanto mais você participa, mais você sobe:**\n' +
      'Novato → Crafter (100 pts) → Crafter Elite (500 pts)'
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

const DIFFICULTY_EMOJI: Record<string, string> = {
  facil: '🟢',
  easy: '🟢',
  medio: '🟡',
  médio: '🟡',
  medium: '🟡',
  dificil: '🔴',
  difícil: '🔴',
  hard: '🔴',
};

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
  const diffRaw = challenge.difficulty ?? challenge.dificuldade ?? 'medio';
  const diffEmoji = DIFFICULTY_EMOJI[diffRaw.toLowerCase()] ?? '🎯';
  const reward = challenge.reward ?? challenge.recompensa ?? 0;
  const descricao = challenge.description ?? challenge.descricao ?? '';

  const embed = new EmbedBuilder()
    .setColor(CYAN_COLOR)
    .setTitle(`🚀 Novo Desafio: ${name}`)
    .addFields(
      { name: 'Dificuldade', value: `${diffEmoji} ${diffRaw}`, inline: true },
      { name: 'Recompensa', value: `⭐ ${reward} pts`, inline: true },
    )
    .setDescription(
      (descricao ? descricao.slice(0, 300) + '\n\n' : '') +
      '🔗 Acesse a plataforma para participar!\n' +
      'https://codecraftgenz.com.br/desafios'
    )
    .setURL('https://codecraftgenz.com.br/desafios')
    .setFooter({ text: 'CodeCraft Gen-Z • Desafios' })
    .setTimestamp();

  return embed;
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

// ── Detecção de stack no título/snippet ───────────────────────────────────────
const STACK_KEYWORDS: Record<string, string> = {
  'react':       'React',
  'vue':         'Vue.js',
  'angular':     'Angular',
  'next':        'Next.js',
  'nuxt':        'Nuxt',
  'svelte':      'Svelte',
  'node':        'Node.js',
  'nestjs':      'NestJS',
  'express':     'Express',
  'typescript':  'TypeScript',
  'javascript':  'JavaScript',
  'python':      'Python',
  'django':      'Django',
  'fastapi':     'FastAPI',
  'flask':       'Flask',
  'java':        'Java',
  'spring':      'Spring',
  'kotlin':      'Kotlin',
  'php':         'PHP',
  'laravel':     'Laravel',
  'ruby':        'Ruby',
  'rails':       'Rails',
  'go':          'Go',
  'rust':        'Rust',
  'aws':         'AWS',
  'gcp':         'GCP',
  'azure':       'Azure',
  'docker':      'Docker',
  'kubernetes':  'Kubernetes',
  'postgresql':  'PostgreSQL',
  'mysql':       'MySQL',
  'mongodb':     'MongoDB',
  'mobile':      'Mobile',
  'flutter':     'Flutter',
  'react native':'React Native',
  'ios':         'iOS',
  'android':     'Android',
};

function detectStacks(text: string): string {
  const lower = text.toLowerCase();
  const found = Object.entries(STACK_KEYWORDS)
    .filter(([key]) => lower.includes(key))
    .map(([, label]) => label);
  const unique = [...new Set(found)].slice(0, 5);
  return unique.join(' • ');
}

// Extrai "Empresa" do padrão "Cargo @ Empresa" (usado pelo Remotive)
function parseTitle(raw: string): { jobTitle: string; company: string | null } {
  const at = raw.lastIndexOf(' @ ');
  if (at !== -1) {
    return { jobTitle: raw.slice(0, at).trim(), company: raw.slice(at + 3).trim() };
  }
  return { jobTitle: raw, company: null };
}

// Cor por fonte
const SOURCE_COLORS: Record<string, number> = {
  'ProgramaThor':      0x00B140,
  'We Work Remotely':  0x4A90D9,
  'RemoteOK':          0x00D1A7,
  'Remotive':          0xFF6B6B,
  'Nerdin':            0xF59E0B,
};

// Emoji por fonte
const SOURCE_EMOJIS: Record<string, string> = {
  'ProgramaThor':      '🇧🇷',
  'We Work Remotely':  '🌎',
  'RemoteOK':          '💻',
  'Remotive':          '🌐',
  'Nerdin':            '🇧🇷',
};

export function vagaEmbed(vaga: { title: string; link: string; contentSnippet?: string; company?: string }) {
  const { jobTitle, company: parsedCompany } = parseTitle(vaga.title);
  const empresa = parsedCompany ?? vaga.company ?? '';
  const color = (SOURCE_COLORS[vaga.company ?? ''] ?? 0x22C55E) as ColorResolvable;
  const sourceEmoji = SOURCE_EMOJIS[vaga.company ?? ''] ?? '💼';

  const stackLine = detectStacks(`${vaga.title} ${vaga.contentSnippet ?? ''}`);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${sourceEmoji} ${jobTitle}`)
    .setURL(vaga.link);

  // Campos estruturados
  const fields: { name: string; value: string; inline: boolean }[] = [];

  if (empresa) {
    fields.push({ name: '🏢 Empresa', value: empresa, inline: true });
  }

  if (vaga.contentSnippet) {
    // Snippet pode conter localização/modalidade
    const snippet = vaga.contentSnippet.slice(0, 120);
    fields.push({ name: '📍 Local / Modalidade', value: snippet, inline: true });
  }

  if (stackLine) {
    fields.push({ name: '🛠️ Stack detectada', value: stackLine, inline: false });
  }

  if (fields.length > 0) embed.addFields(fields);

  embed
    .setFooter({ text: `via ${vaga.company ?? 'Job Board'} • CodeCraft Gen-Z` })
    .setTimestamp();

  // Botão de candidatura
  const button = new ButtonBuilder()
    .setLabel('Ver vaga e candidatar-se')
    .setURL(vaga.link)
    .setStyle(ButtonStyle.Link)
    .setEmoji('🔗');

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  return { embed, row };
}
