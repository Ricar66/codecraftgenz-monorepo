/**
 * verify-server.ts
 * Verifica se todas as configurações do servidor estão corretas.
 *
 * Executa:
 *   npx tsx src/scripts/verify-server.ts
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
} from 'discord.js';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TOKEN       = process.env.DISCORD_TOKEN!;
const GUILD_ID    = process.env.DISCORD_GUILD_ID!;
const ROLE_CRAFTER = process.env.DISCORD_ROLE_CRAFTER;
const ROLE_NOVATO  = process.env.DISCORD_ROLE_NOVATO;

// Mesma tabela do setup
type Rule = 'view_only' | 'open' | 'vip' | 'voice_open';

const CHANNEL_RULES: Record<string, Rule> = {
  'boas-vindas':             'view_only',
  'regras':                  'view_only',
  'anuncios':                'view_only',
  'anúncios':                'view_only',
  'como-funciona':           'view_only',
  'apresentacoes':           'open',
  'apresentações':           'open',
  'geral':                   'open',
  'humor-e-memes':           'open',
  'tire-suas-duvidas':       'open',
  'code-review':             'open',
  'mostre-seu-projeto':      'open',
  'noticias-tech':           'view_only',
  'ferramentas-e-recursos':  'open',
  'freela-e-oportunidades':  'open',
  'vagas-e-freelas':         'open',
  'empreendedorismo':        'open',
  'metas-e-progresso':       'open',
  'recursos-gratuitos':      'open',
  'desafios-codecraft':      'view_only',
  'ranking-semanal':         'view_only',
  'apps-codecraft':          'view_only',
  'ideias-de-produto':       'open',
  'busco-parceiro':          'open',
  'elite-lounge':            'vip',
  'acesso-antecipado':       'vip',
  'feedback-direto':         'vip',
  'Lounge Geral':            'voice_open',
  'Coworking':               'voice_open',
  'eventos-codecraft':       'voice_open',
};

const ENV_CHANNELS: Record<string, string> = {
  'DISCORD_CHANNEL_NEWS':         'noticias',
  'DISCORD_CHANNEL_VAGAS':        'vagas (freela-e-oportunidades)',
  'DISCORD_CHANNEL_DESAFIOS':     'desafios-codecraft',
  'DISCORD_CHANNEL_ANUNCIOS':     'anúncios',
  'DISCORD_CHANNEL_APRESENTACOES':'apresentações',
};

function normalizeChannelName(name: string): string {
  return name
    .replace(/[\u{1F000}-\u{1FFFF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}|\u{FE00}-\u{FE0F}|\u{1F900}-\u{1F9FF}|\u{1FA00}-\u{1FA9F}]/gu, '')
    .replace(/[^a-zA-Z0-9\-]/g, '')
    .toLowerCase()
    .trim();
}

function findChannel(guild: Guild, name: string) {
  const normalizedTarget = normalizeChannelName(name);
  return guild.channels.cache.find(ch => {
    const norm = normalizeChannelName(ch.name);
    return norm === normalizedTarget || ch.name.toLowerCase().includes(name.toLowerCase());
  });
}

let ok = 0;
let warn = 0;
let fail = 0;

function log(status: '✅' | '⚠️' | '❌', msg: string) {
  console.log(`  ${status} ${msg}`);
  if (status === '✅') ok++;
  else if (status === '⚠️') warn++;
  else fail++;
}

async function main() {
  console.log('\n========================================');
  console.log('  CodeCraftGenZ — Verificação do Servidor');
  console.log('========================================\n');

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(TOKEN);

  const guild = await client.guilds.fetch(GUILD_ID) as Guild;
  await guild.channels.fetch();
  await guild.roles.fetch();

  const everyoneRole  = guild.roles.everyone;
  const crafterRole   = ROLE_CRAFTER ? guild.roles.cache.get(ROLE_CRAFTER) : undefined;
  const novatoRole    = ROLE_NOVATO  ? guild.roles.cache.get(ROLE_NOVATO)  : undefined;
  const botMember     = await guild.members.fetch(client.user!.id).catch(() => null);

  // ── 1. Cargos ──────────────────────────────────────────────
  console.log('── CARGOS ─────────────────────────────');

  if (crafterRole) {
    log('✅', `Cargo Crafter encontrado: ${crafterRole.name} (${crafterRole.id})`);
  } else {
    log('❌', `Cargo Crafter NÃO encontrado (DISCORD_ROLE_CRAFTER=${ROLE_CRAFTER ?? 'não definido'})`);
  }

  if (novatoRole) {
    log('✅', `Cargo Novato encontrado: ${novatoRole.name} (${novatoRole.id})`);
  } else {
    log('❌', `Cargo Novato NÃO encontrado (DISCORD_ROLE_NOVATO=${ROLE_NOVATO ?? 'não definido'})`);
  }

  // Hierarquia do bot
  if (botMember) {
    const botHighestRole = botMember.roles.highest;
    const crafterPos = crafterRole?.position ?? 0;
    const novatoPos  = novatoRole?.position ?? 0;

    if (botHighestRole.position > crafterPos && botHighestRole.position > novatoPos) {
      log('✅', `Bot (${botHighestRole.name}) está acima de Crafter e Novato na hierarquia`);
    } else {
      log('❌', `Bot (pos ${botHighestRole.position}) deve estar ACIMA de Crafter (pos ${crafterPos}) e Novato (pos ${novatoPos})`);
    }

    const hasAdmin = botMember.permissions.has(PermissionFlagsBits.Administrator);
    const hasManageChannels = botMember.permissions.has(PermissionFlagsBits.ManageChannels);
    const hasManageRoles = botMember.permissions.has(PermissionFlagsBits.ManageRoles);

    if (hasAdmin) {
      log('✅', 'Bot tem permissão Administrador');
    } else {
      if (hasManageChannels) log('✅', 'Bot tem Gerenciar Canais');
      else log('❌', 'Bot NÃO tem Gerenciar Canais');
      if (hasManageRoles) log('✅', 'Bot tem Gerenciar Cargos');
      else log('❌', 'Bot NÃO tem Gerenciar Cargos');
    }
  }

  // ── 2. Variáveis de ambiente (IDs de canais) ───────────────
  console.log('\n── VARIÁVEIS DE AMBIENTE ──────────────');

  for (const [envKey, label] of Object.entries(ENV_CHANNELS)) {
    const val = process.env[envKey];
    if (!val) {
      log('❌', `${envKey} não definido (canal: ${label})`);
      continue;
    }
    const ch = guild.channels.cache.get(val);
    if (ch) {
      log('✅', `${envKey} → #${ch.name}`);
    } else {
      log('❌', `${envKey}=${val} — canal NÃO encontrado no servidor`);
    }
  }

  if (!process.env.DISCORD_ROLE_CRAFTER) log('❌', 'DISCORD_ROLE_CRAFTER não definido');
  if (!process.env.DISCORD_ROLE_NOVATO)  log('❌', 'DISCORD_ROLE_NOVATO não definido');
  if (process.env.DISCORD_ROLE_CRAFTER && crafterRole) log('✅', 'DISCORD_ROLE_CRAFTER definido e válido');
  if (process.env.DISCORD_ROLE_NOVATO  && novatoRole)  log('✅', 'DISCORD_ROLE_NOVATO definido e válido');

  // ── 3. Permissões dos canais ───────────────────────────────
  console.log('\n── PERMISSÕES DOS CANAIS ──────────────');

  for (const [channelName, rule] of Object.entries(CHANNEL_RULES)) {
    const channel = findChannel(guild, channelName);
    if (!channel) continue; // ignora não encontrados (já verificado no setup)

    if (rule === 'voice_open') {
      if (channel.type !== ChannelType.GuildVoice) continue;
      const vc = channel as VoiceChannel;
      const evPerms = vc.permissionOverwrites.cache.get(everyoneRole.id);
      const canConnect = evPerms?.allow.has(PermissionFlagsBits.Connect);
      if (canConnect) {
        log('✅', `#${channel.name} — voz aberta para todos`);
      } else {
        log('⚠️', `#${channel.name} — voz pode estar restrita para @everyone`);
      }
      continue;
    }

    if (channel.type !== ChannelType.GuildText) continue;
    const tc = channel as TextChannel;
    const evPerms = tc.permissionOverwrites.cache.get(everyoneRole.id);

    if (rule === 'view_only') {
      const canView  = evPerms?.allow.has(PermissionFlagsBits.ViewChannel);
      const noSend   = evPerms?.deny.has(PermissionFlagsBits.SendMessages);
      if (canView && noSend) {
        log('✅', `#${channel.name} — só leitura`);
      } else if (canView && !noSend) {
        log('⚠️', `#${channel.name} — pode ver mas SendMessages não está explicitamente negado`);
      } else {
        log('❌', `#${channel.name} — deveria ser só leitura mas permissões incorretas`);
      }

    } else if (rule === 'open') {
      const canView = evPerms?.allow.has(PermissionFlagsBits.ViewChannel);
      const canSend = evPerms?.allow.has(PermissionFlagsBits.SendMessages);
      if (canView && canSend) {
        log('✅', `#${channel.name} — leitura + escrita`);
      } else {
        log('⚠️', `#${channel.name} — aberto mas permissões podem estar incompletas`);
      }

    } else if (rule === 'vip') {
      const evDenied = evPerms?.deny.has(PermissionFlagsBits.ViewChannel);
      if (!evDenied) {
        log('❌', `#${channel.name} — VIP mas @everyone consegue ver o canal!`);
        continue;
      }
      if (crafterRole) {
        const crafterPerms = tc.permissionOverwrites.cache.get(crafterRole.id);
        const crafterCanView = crafterPerms?.allow.has(PermissionFlagsBits.ViewChannel);
        if (crafterCanView) {
          log('✅', `#${channel.name} — VIP: @everyone bloqueado, Crafter liberado`);
        } else {
          log('⚠️', `#${channel.name} — VIP: @everyone bloqueado, mas Crafter não tem acesso explícito`);
        }
      } else {
        log('⚠️', `#${channel.name} — VIP: @everyone bloqueado, mas cargo Crafter não encontrado para verificar`);
      }
    }
  }

  // ── 4. Resumo ──────────────────────────────────────────────
  console.log('\n========================================');
  console.log(`  ✅ OK:       ${ok}`);
  console.log(`  ⚠️  Avisos:  ${warn}`);
  console.log(`  ❌ Falhas:   ${fail}`);
  console.log('========================================\n');

  if (fail === 0 && warn === 0) {
    console.log('  🎉 Servidor 100% configurado corretamente!\n');
  } else if (fail === 0) {
    console.log('  🟡 Configuração OK com pequenos avisos.\n');
  } else {
    console.log('  🔴 Existem falhas que precisam de atenção.\n');
  }

  await client.destroy();
  process.exit(0);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
