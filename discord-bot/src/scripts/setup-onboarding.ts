/**
 * setup-onboarding.ts
 * Configura o Onboarding do servidor Discord:
 * - Define todos os canais públicos como canais padrão
 * - Remove prompts obrigatórios (nenhuma seleção necessária)
 * - Mantém o modo mais simples (ONBOARDING_DEFAULT)
 *
 * Executa:
 *   npx tsx src/scripts/setup-onboarding.ts
 */

import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';
import { Client, GatewayIntentBits, ChannelType, REST, Routes } from 'discord.js';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TOKEN    = process.env.DISCORD_TOKEN!;
const GUILD_ID = process.env.DISCORD_GUILD_ID!;

if (!TOKEN || !GUILD_ID) {
  console.error('❌ DISCORD_TOKEN e DISCORD_GUILD_ID são obrigatórios no .env');
  process.exit(1);
}

// Canais VIP — não devem entrar nos defaults
const VIP_NAMES = ['elite-lounge', 'acesso-antecipado', 'feedback-direto'];

function isVip(name: string) {
  return VIP_NAMES.some(v => name.toLowerCase().includes(v));
}

async function main() {
  console.log('\n========================================');
  console.log('  CodeCraftGenZ — Setup de Onboarding');
  console.log('========================================\n');

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(TOKEN);
  console.log(`✅ Bot conectado como ${client.user?.tag}`);

  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.channels.fetch();

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  // Buscar onboarding atual
  const current = await rest.get(Routes.guildOnboarding(GUILD_ID)) as any;
  console.log(`\n📋 Onboarding atual:`);
  console.log(`   Ativo: ${current.enabled}`);
  console.log(`   Modo: ${current.mode === 0 ? 'Default' : 'Advanced'}`);
  console.log(`   Canais padrão: ${current.default_channel_ids?.length ?? 0}`);
  console.log(`   Prompts: ${current.prompts?.length ?? 0}`);

  // Coletar todos os canais públicos de texto (exceto VIP)
  const publicChannelIds: string[] = [];
  guild.channels.cache.forEach(ch => {
    if (ch.type !== ChannelType.GuildText) return;
    if (isVip(ch.name)) return;
    publicChannelIds.push(ch.id);
  });

  console.log(`\n📢 Canais públicos encontrados: ${publicChannelIds.length}`);
  guild.channels.cache.forEach(ch => {
    if (ch.type !== ChannelType.GuildText) return;
    if (isVip(ch.name)) return;
    console.log(`   ✅ #${ch.name}`);
  });

  console.log(`\n🔒 Canais VIP (excluídos do onboarding):`);
  guild.channels.cache.forEach(ch => {
    if (isVip(ch.name)) console.log(`   🔒 #${ch.name}`);
  });

  // Atualizar onboarding:
  // - default_channel_ids = todos os canais públicos
  // - prompts = [] (sem perguntas obrigatórias)
  // - enabled = true (mantém ativo mas sem seleção obrigatória)
  // - mode = 0 (ONBOARDING_DEFAULT — mais simples)
  console.log('\n⚙️  Aplicando configurações...');

  await rest.put(Routes.guildOnboarding(GUILD_ID), {
    body: {
      prompts: [],
      default_channel_ids: publicChannelIds,
      enabled: true,
      mode: 0,
    },
  });

  // Verificar resultado
  const updated = await rest.get(Routes.guildOnboarding(GUILD_ID)) as any;

  console.log('\n✅ Onboarding atualizado:');
  console.log(`   Ativo: ${updated.enabled}`);
  console.log(`   Modo: ${updated.mode === 0 ? 'Default (sem seleção obrigatória)' : 'Advanced'}`);
  console.log(`   Canais padrão configurados: ${updated.default_channel_ids?.length ?? 0}`);
  console.log(`   Prompts obrigatórios: ${updated.prompts?.length ?? 0}`);

  console.log('\n========================================');
  console.log('  Novos membros verão todos os canais');
  console.log('  automaticamente, sem precisar escolher!');
  console.log('========================================\n');

  await client.destroy();
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Erro:', err?.rawError?.message ?? err.message ?? err);
  process.exit(1);
});
