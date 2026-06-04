import 'dotenv/config';
import {
  Client, GatewayIntentBits, ChannelType, TextChannel,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ColorResolvable,
} from 'discord.js';

// Anúncio único do projeto open-source omnistack-agent.
// Rode no servidor onde o bot vive (DISCORD_TOKEN + DISCORD_GUILD_ID no ambiente):
//   npx tsx src/scripts/post-omnistack.ts
// Para escolher outro canal:  OMNISTACK_CHANNEL=ferramentas-e-recursos npx tsx src/scripts/post-omnistack.ts

const BRAND_COLOR = 0xD12BF2 as ColorResolvable;
const REPO_URL = 'https://github.com/Ricar66/omnistack-agent';
const BANNER_URL = 'https://raw.githubusercontent.com/Ricar66/omnistack-agent/main/assets/banner.png';
const TARGET_CHANNEL_NAME = process.env.OMNISTACK_CHANNEL ?? 'mostre-seu-projeto';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID!);
    await guild.channels.fetch();

    const channel = guild.channels.cache.find(
      c => c.type === ChannelType.GuildText && c.name.includes(TARGET_CHANNEL_NAME)
    ) as TextChannel | undefined;

    if (!channel) {
      console.error(`Canal "${TARGET_CHANNEL_NAME}" não encontrado.`);
      process.exit(1);
    }

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle('🚀 omnistack-agent — novo projeto open-source')
      .setURL(REPO_URL)
      .setDescription(
        'Um **agente de IA "engenheiro full-stack"** escrito UMA vez e compilado em arquivos ' +
        'prontos pra **ChatGPT, Claude, Copilot, Gemini e Cursor**.\n\n' +
        'Você não escreve prompt — **copia um arquivo**. ✅'
      )
      .addFields(
        {
          name: '🧠 Como funciona',
          value: 'O "cérebro" vive em `core/` + `knowledge/`. Um build Node (zero deps, testado) ' +
                 'gera 9 adapters, e o CI quebra se algum sair de sincronia com a fonte.',
        },
        {
          name: '🎭 10 papéis',
          value: 'Arquiteto, backend, frontend, mobile, DBA, DevOps, QA, escritor técnico e mentor — ' +
                 'com orientação a objetos como lente padrão.',
        },
        {
          name: '⚙️ Stack',
          value: 'Node ≥ 18 · zero dependências · licença MIT · docs bilíngues (PT-BR / EN)',
        },
      )
      .setImage(BANNER_URL)
      .setFooter({ text: 'omnistack-agent • open source' })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Ver no GitHub')
        .setURL(REPO_URL)
        .setStyle(ButtonStyle.Link)
        .setEmoji('⭐'),
    );

    await channel.send({ embeds: [embed], components: [row] });
    console.log(`✅ Anúncio postado em #${channel.name}`);

    await client.destroy();
    process.exit(0);
  } catch (err) {
    console.error('Erro ao postar anúncio:', err);
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN!);
