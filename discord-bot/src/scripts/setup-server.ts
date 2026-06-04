/**
 * setup-server.ts
 * Script de configuração única do servidor Discord CodeCraftGenZ.
 *
 * Executa:
 *   npx tsx src/scripts/setup-server.ts
 *
 * O que faz:
 *   1. Configura permissões de todos os canais de texto
 *   2. Configura permissões dos canais de voz
 *   3. Confirma ao final o que foi feito
 */

import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';
import {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
  VoiceChannel,
  Guild,
  Role,
} from 'discord.js';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TOKEN      = process.env.DISCORD_TOKEN!;
const GUILD_ID   = process.env.DISCORD_GUILD_ID!;
const ROLE_CRAFTER = process.env.DISCORD_ROLE_CRAFTER;

if (!TOKEN || !GUILD_ID) {
  console.error('❌ DISCORD_TOKEN e DISCORD_GUILD_ID são obrigatórios no .env');
  process.exit(1);
}

// ─── Definição de permissões por canal ───────────────────────────────────────
//
// view_only  → @everyone pode ver, NÃO pode escrever
// open       → @everyone pode ver E escrever
// vip        → @everyone NÃO vê; Crafter vê e escreve
// voice_open → @everyone pode entrar no canal de voz

type Rule = 'view_only' | 'open' | 'vip' | 'voice_open';

const CHANNEL_RULES: Record<string, Rule> = {
  // INÍCIO
  'boas-vindas':          'view_only',
  'regras':               'view_only',
  'anuncios':             'view_only',
  'anúncios':             'view_only',
  'como-funciona':        'view_only',

  // COMUNIDADE
  'apresentacoes':        'open',
  'apresentações':        'open',
  'geral':                'open',
  'humor-e-memes':        'open',

  // DESENVOLVIMENTO
  'noticias-tech':          'view_only',
  'tire-suas-duvidas':      'open',
  'code-review':            'open',
  'mostre-seu-projeto':     'open',
  'ferramentas-e-recursos': 'open',

  // CARREIRA & MERCADO
  'freela-e-oportunidades':   'open',
  'vagas-e-freelas':          'open',
  'empreendedorismo':          'open',
  'metas-e-progresso':         'open',

  // APRENDIZADO
  'recursos-gratuitos':    'open',
  'desafios-codecraft':    'view_only',  // bot posta, membros só leem
  'ranking-semanal':       'view_only',  // bot posta automaticamente

  // MARKETPLACE
  'apps-codecraft':        'view_only',  // bot/admin posta
  'ideias-de-produto':     'open',
  'busco-parceiro':        'open',

  // ÁREA VIP
  'elite-lounge':          'vip',
  'acesso-antecipado':     'vip',
  'feedback-direto':       'vip',

  // VOZ & EVENTOS
  'Lounge Geral':          'voice_open',
  'Coworking':             'voice_open',
  'eventos-codecraft':     'voice_open',
};

// ─── Helpers de permissão ─────────────────────────────────────────────────────

function normalizeChannelName(name: string): string {
  // Remove emojis e espaços extras, converte para minúsculas
  return name
    .replace(/[\u{1F000}-\u{1FFFF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}|\u{FE00}-\u{FE0F}|\u{1F900}-\u{1F9FF}|\u{1FA00}-\u{1FA9F}]/gu, '')
    .replace(/[^a-zA-Z0-9\-]/g, '')
    .toLowerCase()
    .trim();
}

async function configureTextChannel(
  channel: TextChannel,
  rule: Rule,
  everyoneRole: Role,
  crafterRole: Role | undefined
) {
  const overwrites: any[] = [];

  if (rule === 'view_only') {
    overwrites.push({
      id: everyoneRole.id,
      allow: [PermissionFlagsBits.ViewChannel],
      deny: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.SendMessagesInThreads,
        PermissionFlagsBits.CreatePublicThreads,
        PermissionFlagsBits.CreatePrivateThreads,
        PermissionFlagsBits.AddReactions,
      ],
    });
  } else if (rule === 'open') {
    overwrites.push({
      id: everyoneRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.UseApplicationCommands,
      ],
    });
  } else if (rule === 'vip') {
    // @everyone não vê
    overwrites.push({
      id: everyoneRole.id,
      deny: [PermissionFlagsBits.ViewChannel],
    });
    // Crafter vê e escreve
    if (crafterRole) {
      overwrites.push({
        id: crafterRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AddReactions,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.UseApplicationCommands,
        ],
      });
    }
  }

  await channel.permissionOverwrites.set(overwrites, 'Setup automático CodeCraftGenZ');
}

async function configureVoiceChannel(
  channel: VoiceChannel,
  everyoneRole: Role
) {
  await channel.permissionOverwrites.set([
    {
      id: everyoneRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream,
      ],
    },
  ], 'Setup automático CodeCraftGenZ');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n========================================');
  console.log('  CodeCraftGenZ — Setup do Servidor');
  console.log('========================================\n');

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  await client.login(TOKEN);
  console.log(`✅ Bot conectado como ${client.user?.tag}\n`);

  const guild = await client.guilds.fetch(GUILD_ID) as Guild;
  await guild.channels.fetch(); // carrega cache
  await guild.roles.fetch();    // carrega cache

  const everyoneRole = guild.roles.everyone;
  const crafterRole = ROLE_CRAFTER
    ? guild.roles.cache.get(ROLE_CRAFTER)
    : guild.roles.cache.find(r => r.name.toLowerCase() === 'crafter');

  if (!crafterRole) {
    console.warn('⚠️  Cargo Crafter não encontrado. Canais VIP só terão @everyone bloqueado.');
  } else {
    console.log(`✅ Cargo Crafter encontrado: ${crafterRole.name} (${crafterRole.id})\n`);
  }

  let configured = 0;
  let skipped = 0;
  const notFound: string[] = [];

  // Para cada canal definido nas regras
  for (const [channelName, rule] of Object.entries(CHANNEL_RULES)) {
    // Procura o canal pelo nome normalizado
    const normalizedTarget = normalizeChannelName(channelName);

    const found = guild.channels.cache.find(ch => {
      const normalizedCh = normalizeChannelName(ch.name);
      return normalizedCh === normalizedTarget || ch.name.toLowerCase().includes(channelName.toLowerCase());
    });

    if (!found) {
      notFound.push(channelName);
      skipped++;
      continue;
    }

    try {
      if (rule === 'voice_open' && found.type === ChannelType.GuildVoice) {
        await configureVoiceChannel(found as VoiceChannel, everyoneRole);
        console.log(`🔊 [VOZ] ${found.name} → todos podem entrar`);
      } else if (found.type === ChannelType.GuildText) {
        await configureTextChannel(found as TextChannel, rule, everyoneRole, crafterRole);
        const label = rule === 'view_only' ? '👁  só leitura' : rule === 'vip' ? '🔒 VIP (Crafter)' : '✏️  leitura + escrita';
        console.log(`📝 [TEXTO] ${found.name} → ${label}`);
      } else {
        skipped++;
        continue;
      }
      configured++;
      // Pequena pausa para não estourar rate limit
      await new Promise(r => setTimeout(r, 500));
    } catch (err: any) {
      console.error(`❌ Erro ao configurar #${found.name}: ${err.message}`);
    }
  }

  console.log('\n========================================');
  console.log(`  Resultado: ${configured} canais configurados`);
  if (skipped > 0) console.log(`  Pulados: ${skipped}`);
  if (notFound.length > 0) {
    console.log(`\n  ⚠️  Canais não encontrados (verifique o nome exato):`);
    notFound.forEach(n => console.log(`     - ${n}`));
  }
  console.log('========================================\n');

  await client.destroy();
  process.exit(0);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
