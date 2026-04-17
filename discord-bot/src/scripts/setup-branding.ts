/**
 * setup-branding.ts
 * Configura o visual e branding completo do servidor CodeCraftGenZ.
 *
 * O que faz:
 *   1. Renomeia canais com emoji prefixes (look profissional)
 *   2. Adiciona topics (descrições) em todos os canais
 *   3. Atualiza nomes das categorias
 *   4. Define descrição do servidor
 *   5. Configura canal de sistema (boas-vindas)
 *   6. Adiciona emojis personalizados tech
 *   7. Configura cargo Crafter Elite com cor dourada e ícone
 *
 * Executa:
 *   npx tsx src/scripts/setup-branding.ts
 */

import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';
import https from 'https';
import { Client, GatewayIntentBits, ChannelType, TextChannel, VoiceChannel, CategoryChannel, Guild, REST, Routes } from 'discord.js';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TOKEN    = process.env.DISCORD_TOKEN!;
const GUILD_ID = process.env.DISCORD_GUILD_ID!;

if (!TOKEN || !GUILD_ID) {
  console.error('❌ DISCORD_TOKEN e DISCORD_GUILD_ID são obrigatórios');
  process.exit(1);
}

// ── Mapeamento: nome atual → novo nome com emoji ─────────────────────────────
// Usa · (middle dot U+00B7) como separador — padrão nos servidores top do Discord

const CHANNEL_RENAMES: Record<string, string> = {
  // INÍCIO
  'boas-vindas':          '👋・boas-vindas',
  'regras':               '📋・regras',
  'anuncios':             '📢・anúncios',
  'anúncios':             '📢・anúncios',
  'como-funciona':        '❓・como-funciona',

  // COMUNIDADE
  'apresentacoes':        '🌟・apresentações',
  'apresentações':        '🌟・apresentações',
  'geral':                '💬・geral',
  'humor-e-memes':        '😂・humor-e-memes',

  // DESENVOLVIMENTO
  'noticias-tech':        '📰・noticias-tech',
  'tire-suas-duvidas':    '🙋・tire-suas-duvidas',
  'code-review':          '👨‍💻・code-review',
  'mostre-seu-projeto':   '🚀・mostre-seu-projeto',
  'ferramentas-e-recursos':'🛠️・ferramentas-e-recursos',

  // CARREIRA
  'freela-e-oportunidades':'💼・freela-e-oportunidades',
  'vagas-e-freelas':      '💸・vagas-e-freelas',
  'empreendedorismo':     '💡・empreendedorismo',
  'metas-e-progresso':    '🎯・metas-e-progresso',

  // APRENDIZADO
  'recursos-gratuitos':   '📚・recursos-gratuitos',
  'desafios-codecraft':   '⚔️・desafios-codecraft',
  'ranking-semanal':      '🏆・ranking-semanal',

  // MARKETPLACE
  'apps-codecraft':       '🛍️・apps-codecraft',
  'ideias-de-produto':    '💡・ideias-de-produto',
  'busco-parceiro':       '🤝・busco-parceiro',

  // VIP
  'elite-lounge':         '💎・elite-lounge',
  'acesso-antecipado':    '⚡・acesso-antecipado',
  'feedback-direto':      '🎙️・feedback-direto',
};

// Canais de voz
const VOICE_RENAMES: Record<string, string> = {
  'Lounge Geral':      '🎧 Lounge Geral',
  'Coworking':         '💻 Coworking',
  'eventos-codecraft': '🎭 Eventos',
};

// ── Topics dos canais — busca por substring do nome ──────────────────────────
// chave: substring que identifica o canal (sem emojis, lowercase)
const CHANNEL_TOPICS: Record<string, string> = {
  'boas-vindas':           '🏠 Bem-vindo(a) à CodeCraft Gen-Z! Leia as regras e se apresente aqui.',
  'regras':                '📌 Regras da comunidade. Leia antes de participar.',
  'anúncios':              '🔔 Anúncios oficiais, novidades da plataforma e novos apps. Somente admins postam aqui.',
  'anuncios':              '🔔 Anúncios oficiais, novidades da plataforma e novos apps. Somente admins postam aqui.',
  'como-funciona':         '💡 Entenda o sistema de pontos, cargos e como aproveitar a comunidade ao máximo.',
  'apresentações':         '👋 Se apresente! Conte quem você é, sua stack e seus objetivos. Ganhe +3 pts!',
  'apresentacoes':         '👋 Se apresente! Conte quem você é, sua stack e seus objetivos. Ganhe +3 pts!',
  'geral':                 '💬 Conversa livre sobre tech, carreira, vida de dev e tudo mais.',
  'humor-e-memes':         '😂 Memes, humor dev e o clássico "funciona na minha máquina".',
  'noticias-tech':         '📰 Notícias do mundo tech postadas automaticamente 2x por dia. Fique por dentro.',
  'tire-suas-duvidas':     '🙋 Tem dúvida? Pergunte! Threads abertas automaticamente. +3 pts por ajudar.',
  'code-review':           '🔍 Poste seu código e peça feedback. Seja construtivo. Ganhe +3 pts por participar.',
  'mostre-seu-projeto':    '🚀 Mostre o que você está construindo! Projetos, portfólios, side projects. +3 pts.',
  'ferramentas-e-recursos':'🛠️ Ferramentas, extensões, libs e recursos úteis para devs.',
  'freela-e-oportunidades':'💼 Vagas de freela, projetos e parcerias. Vagas postadas diariamente pelo bot.',
  'vagas-e-freelas':       '💸 Vagas tech de 5 plataformas diferentes, postadas todo dia às 10h. Use /vagas para ver as últimas.',
  'empreendedorismo':      '💡 Negócios, produtos, SaaS e empreendedorismo tech. Compartilhe sua jornada.',
  'metas-e-progresso':     '🎯 Compartilhe suas metas de estudo e carreira. Accountability coletivo funciona!',
  'recursos-gratuitos':    '📚 Cursos, documentações, livros e materiais gratuitos. Só links de qualidade.',
  'desafios-codecraft':    '⚔️ Desafios de programação. Novo desafio toda segunda-feira! Participe em codecraftgenz.com.br/desafios',
  'ranking-semanal':       '🏆 Top 10 Crafters mais ativos. Postado toda segunda-feira às 12h. Compete!',
  'apps-codecraft':        '🛍️ Novos apps no marketplace. Acesse codecraftgenz.com.br/aplicativos para comprar.',
  'ideias-de-produto':     '💡 Tem ideia de feature ou produto? Proponha aqui! A comunidade vota.',
  'busco-parceiro':        '🤝 Quer montar equipe ou achar parceiro de projeto? Poste sua stack aqui.',
  'elite-lounge':          '💎 Canal exclusivo Crafter Elite (500+ pts). Acesso direto à equipe CodeCraft.',
  'acesso-antecipado':     '⚡ Beta de novos recursos antes de todo mundo. Feedback vale muito aqui.',
  'feedback-direto':       '🎙️ Feedback direto para o time CodeCraft. Sua opinião molda o produto.',
};

// ── Nomes das categorias ──────────────────────────────────────────────────────
const CATEGORY_RENAMES: Record<string, string> = {
  'INICIO':           '🏠 ── INÍCIO ──',
  'INÍCIO':           '🏠 ── INÍCIO ──',
  'COMUNIDADE':       '👥 ── COMUNIDADE ──',
  'DESENVOLVIMENTO':  '⚙️ ── DESENVOLVIMENTO ──',
  'CARREIRA':         '💼 ── CARREIRA & MERCADO ──',
  'CARREIRA & MERCADO': '💼 ── CARREIRA & MERCADO ──',
  'APRENDIZADO':      '📚 ── APRENDIZADO ──',
  'MARKETPLACE':      '🛍️ ── MARKETPLACE ──',
  'VIP':              '💎 ── ÁREA VIP ──',
  'VOZ':              '🔊 ── VOZ & EVENTOS ──',
  'VOZ & EVENTOS':    '🔊 ── VOZ & EVENTOS ──',
};

// ── Emojis personalizados a adicionar ────────────────────────────────────────
// Pares [nome, url da imagem PNG 128x128]
const CUSTOM_EMOJIS: Array<{ name: string; url: string }> = [
  { name: 'typescript',   url: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg' },
  { name: 'reactjs',      url: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg' },
  { name: 'nodejs',       url: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg' },
  { name: 'python_dev',   url: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg' },
  { name: 'docker_dev',   url: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/docker/docker-original.svg' },
  { name: 'git_dev',      url: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/git/git-original.svg' },
  { name: 'javascript',   url: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg' },
  { name: 'vuejs',        url: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/vuejs/vuejs-original.svg' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(name: string): string {
  return name
    .replace(/[・🏠👥⚙️💼📚🛍️💎🔊──\s]/gu, '')
    .replace(/[^a-zA-ZÀ-ÿ0-9\-]/g, '')
    .toLowerCase()
    .trim();
}

function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  CodeCraftGenZ — Setup de Branding');
  console.log('══════════════════════════════════════════\n');

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(TOKEN);
  console.log(`✅ Bot conectado como ${client.user?.tag}\n`);

  const guild = await client.guilds.fetch(GUILD_ID) as Guild;
  await guild.channels.fetch();
  await guild.roles.fetch();

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  let renamed = 0, topicSet = 0, skipped = 0;

  // ── 1. Renomear canais de texto ─────────────────────────────────────────────
  console.log('── 1. RENOMEANDO CANAIS DE TEXTO ──────────');

  for (const channel of guild.channels.cache.values()) {
    if (channel.type !== ChannelType.GuildText) continue;

    const raw = channel.name;
    // Verificar se já tem emoji prefix (·)
    if (raw.includes('・')) {
      console.log(`  ⏭  Já renomeado: #${raw}`);
      skipped++;
      continue;
    }

    const newName = CHANNEL_RENAMES[raw];
    if (!newName) {
      console.log(`  ⚠️  Sem mapeamento: #${raw}`);
      continue;
    }

    try {
      await (channel as TextChannel).edit({ name: newName, reason: 'Branding CodeCraftGenZ' });
      console.log(`  ✅  #${raw} → #${newName}`);
      renamed++;
      await sleep(600); // respeitar rate limit
    } catch (err: any) {
      console.error(`  ❌  Erro em #${raw}: ${err.message}`);
    }
  }

  // ── 2. Adicionar topics nos canais ──────────────────────────────────────────
  console.log('\n── 2. CONFIGURANDO TOPICS ─────────────────');

  for (const channel of guild.channels.cache.values()) {
    if (channel.type !== ChannelType.GuildText) continue;

    const normalizedChannelName = normalize(channel.name);
    const topicKey = Object.keys(CHANNEL_TOPICS).find(key => normalizedChannelName.includes(normalize(key)));
    const topic = topicKey ? CHANNEL_TOPICS[topicKey] : undefined;
    if (!topic) continue;

    const tc = channel as TextChannel;
    if (tc.topic === topic) {
      console.log(`  ⏭  Topic já definido: #${channel.name}`);
      continue;
    }

    try {
      await tc.edit({ topic, reason: 'Branding CodeCraftGenZ' });
      console.log(`  ✅  Topic em #${channel.name}`);
      topicSet++;
      await sleep(600);
    } catch (err: any) {
      console.error(`  ❌  Erro topic #${channel.name}: ${err.message}`);
    }
  }

  // ── 3. Renomear canais de voz ───────────────────────────────────────────────
  console.log('\n── 3. RENOMEANDO CANAIS DE VOZ ────────────');

  for (const channel of guild.channels.cache.values()) {
    if (channel.type !== ChannelType.GuildVoice) continue;

    const newName = VOICE_RENAMES[channel.name];
    if (!newName || channel.name === newName) continue;

    try {
      await (channel as VoiceChannel).edit({ name: newName, reason: 'Branding CodeCraftGenZ' });
      console.log(`  ✅  ${channel.name} → ${newName}`);
      await sleep(600);
    } catch (err: any) {
      console.error(`  ❌  Erro voz ${channel.name}: ${err.message}`);
    }
  }

  // ── 4. Renomear categorias ──────────────────────────────────────────────────
  console.log('\n── 4. RENOMEANDO CATEGORIAS ───────────────');

  for (const channel of guild.channels.cache.values()) {
    if (channel.type !== ChannelType.GuildCategory) continue;

    const raw = channel.name.toUpperCase().trim();
    const newName = CATEGORY_RENAMES[channel.name] ?? CATEGORY_RENAMES[raw];
    if (!newName || channel.name === newName) {
      console.log(`  ⏭  Categoria sem mapeamento: ${channel.name}`);
      continue;
    }

    try {
      await (channel as CategoryChannel).edit({ name: newName, reason: 'Branding CodeCraftGenZ' });
      console.log(`  ✅  ${channel.name} → ${newName}`);
      await sleep(600);
    } catch (err: any) {
      console.error(`  ❌  Erro categoria ${channel.name}: ${err.message}`);
    }
  }

  // ── 5. Descrição do servidor ────────────────────────────────────────────────
  console.log('\n── 5. DESCRIÇÃO DO SERVIDOR ───────────────');

  try {
    await guild.edit({
      description:
        '🚀 A comunidade de devs brasileiros que estão crescendo de verdade.\n' +
        'Desafios • Vagas • Marketplace • Mentorias • Ranking\n' +
        'codecraftgenz.com.br',
      reason: 'Branding CodeCraftGenZ',
    });
    console.log('  ✅  Descrição do servidor atualizada');
  } catch (err: any) {
    console.log(`  ⚠️  Não foi possível definir descrição: ${err.message}`);
  }

  // ── 6. Canal do sistema ─────────────────────────────────────────────────────
  console.log('\n── 6. CANAL DO SISTEMA ────────────────────');

  const boasVindas = guild.channels.cache.find(c =>
    c.name.includes('boas-vindas') && c.type === ChannelType.GuildText
  ) as TextChannel | undefined;

  if (boasVindas) {
    try {
      await guild.edit({
        systemChannel: boasVindas,
        systemChannelFlags: 0, // habilitar todas as mensagens de sistema
        reason: 'Branding CodeCraftGenZ',
      });
      console.log(`  ✅  Canal do sistema → #${boasVindas.name}`);
    } catch (err: any) {
      console.log(`  ⚠️  Canal do sistema: ${err.message}`);
    }
  }

  // ── 7. Cores dos cargos ─────────────────────────────────────────────────────
  console.log('\n── 7. CORES DOS CARGOS ────────────────────');

  const roleColors: Record<string, number> = {
    'Crafter Elite': 0xF59E0B, // Dourado
    'Crafter':       0x00E4F2, // Ciano CodeCraft
    'Novato':        0x6B7280, // Cinza
    'Moderador':     0xD12BF2, // Magenta CodeCraft
    'Core Team':     0xFF4500, // Laranja vibrante
  };

  for (const role of guild.roles.cache.values()) {
    const colorKey = Object.keys(roleColors).find(key => role.name.includes(key));
    const color = colorKey ? roleColors[colorKey] : undefined;
    if (!color) continue;

    try {
      await role.edit({ color, reason: 'Branding CodeCraftGenZ' });
      console.log(`  ✅  Cargo "${role.name}" → cor #${color.toString(16).toUpperCase()}`);
      await sleep(400);
    } catch (err: any) {
      console.error(`  ❌  Erro cargo ${role.name}: ${err.message}`);
    }
  }

  // ── 8. Emojis personalizados ────────────────────────────────────────────────
  console.log('\n── 8. ADICIONANDO EMOJIS TECH ─────────────');

  // Listar emojis existentes
  const existingEmojis = await rest.get(Routes.guildEmojis(GUILD_ID)) as any[];
  const existingNames = new Set(existingEmojis.map((e: any) => e.name));

  for (const emoji of CUSTOM_EMOJIS) {
    if (existingNames.has(emoji.name)) {
      console.log(`  ⏭  Emoji :${emoji.name}: já existe`);
      continue;
    }

    try {
      // Baixar a imagem como base64
      const buffer = await fetchBuffer(emoji.url);

      // Discord exige PNG ou GIF para emojis — SVGs precisam ser convertidos
      // Se for SVG, pular (precisaria de sharp para converter)
      if (emoji.url.endsWith('.svg')) {
        console.log(`  ⚠️  :${emoji.name}: é SVG, pulando (requer conversão manual)`);
        continue;
      }

      const base64 = `data:image/png;base64,${buffer.toString('base64')}`;

      await rest.post(Routes.guildEmojis(GUILD_ID), {
        body: { name: emoji.name, image: base64 },
        reason: 'Branding CodeCraftGenZ',
      });

      console.log(`  ✅  Emoji :${emoji.name}: adicionado`);
      await sleep(1000);
    } catch (err: any) {
      console.error(`  ❌  Emoji :${emoji.name}: ${err.message?.slice(0, 80)}`);
    }
  }

  // ── Resumo ──────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log(`  Canais renomeados:  ${renamed}`);
  console.log(`  Topics definidos:   ${topicSet}`);
  console.log(`  Pulados:            ${skipped}`);
  console.log('══════════════════════════════════════════\n');
  console.log('  ✅ Branding aplicado com sucesso!\n');
  console.log('  💡 PRÓXIMOS PASSOS MANUAIS:');
  console.log('     1. Upload do ícone animado do servidor (gif/png)');
  console.log('        Configurações → Visão geral → Ícone do servidor');
  console.log('     2. Para Banner (Nível 2): precisa de 3 impulsos a mais');
  console.log('        Peça aos membros para impulsionar ou use Nitro Boost');
  console.log('     3. Emojis SVG (tech logos) precisam conversão manual');
  console.log('        Use https://svgtopng.com e faça upload no Discord');
  console.log('══════════════════════════════════════════\n');

  await client.destroy();
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err?.rawError?.message ?? err.message ?? err);
  process.exit(1);
});
