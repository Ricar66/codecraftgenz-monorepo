import 'dotenv/config';
import { Client, GatewayIntentBits, ChannelType, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ColorResolvable } from 'discord.js';

const BRAND_COLOR = 0xD12BF2 as ColorResolvable;

const APPS = [
  { id: 9,  name: 'StudyCraft',    price: 29.90, category: 'Produtividade',  description: 'Organize seus estudos com técnicas de revisão espaçada. Otimize retenção de conhecimento. Para Windows.' },
  { id: 10, name: 'QuizCraft',     price: 29.90, category: 'Educação',       description: 'Crie bancos de questões, estude com repetição espaçada e acompanhe seu progresso com dashboards. Para Windows.' },
  { id: 11, name: 'DeskCraft',     price: 29.90, category: 'Utilitário',     description: 'Organizador automático de arquivos para Desktop e Downloads. 100% offline. Multiplataforma (Windows, macOS, Linux).' },
  { id: 13, name: 'CodeCraft Hub', price: 0,     category: 'Utilitário',     description: 'O launcher central da CodeCraft Gen-Z. Gerencie, baixe e atualize todos os seus apps em um só lugar. Gratuito para todos.' },
  { id: 14, name: 'VaultCraft',    price: 29.90, category: 'Segurança',      description: 'Seu cofre pessoal 100% offline. Organize documentos importantes, notas e checklists com busca instantânea e controle de versões.' },
  { id: 16, name: 'SnipetCraft',   price: 29.90, category: 'Desenvolvimento', description: 'Salve, organize e reutilize trechos de código favoritos. 100% offline, syntax highlighting, busca instantânea com FTS5.' },
  { id: 17, name: 'ReflexCraft',   price: 29.90, category: 'Bem-estar',      description: 'App de journaling pessoal com editor Markdown, prompts reflexivos diários e registro de humor. Todos os dados ficam no seu PC.' },
];

const CATEGORY_EMOJI: Record<string, string> = {
  'Produtividade': '📚', 'Educação': '🎓', 'Utilitário': '🛠️',
  'Segurança': '🔒', 'Desenvolvimento': '👨‍💻', 'Bem-estar': '🧘',
};

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('clientReady', async () => {
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID!);
  await guild.channels.fetch();

  const channel = guild.channels.cache.find(
    c => c.name.includes('apps-codecraft') && c.type === ChannelType.GuildText
  ) as TextChannel | undefined;

  if (!channel) { console.error('Canal #apps-codecraft não encontrado'); process.exit(1); }

  const headerEmbed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('🛍️ Marketplace CodeCraft Gen-Z')
    .setDescription(
      '> Todos os apps abaixo foram desenvolvidos por devs brasileiros e estão disponíveis no marketplace.\n\n' +
      '**Como funciona:**\n' +
      '🔹 Acesse [codecraftgenz.com.br/aplicativos](https://codecraftgenz.com.br/aplicativos)\n' +
      '🔹 Escolha seu app e pague via **Mercado Pago** (Pix ou cartão)\n' +
      '🔹 Receba o link de download por email instantaneamente\n' +
      '🔹 Todos os apps funcionam **100% offline** após o download\n\n' +
      '📦 **' + APPS.length + ' apps disponíveis** | 💡 Novos apps são postados aqui automaticamente'
    )
    .setFooter({ text: 'CodeCraft Gen-Z • Marketplace de Software' })
    .setTimestamp();

  await channel.send({ embeds: [headerEmbed] });
  await sleep(1000);

  for (const app of APPS) {
    const emoji = CATEGORY_EMOJI[app.category] ?? '💡';
    const priceStr = app.price === 0 ? '🆓 Gratuito' : 'R$ ' + app.price.toFixed(2).replace('.', ',');
    const appUrl = 'https://codecraftgenz.com.br/aplicativos/' + app.id;

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(emoji + ' ' + app.name)
      .setDescription(app.description)
      .addFields(
        { name: 'Categoria', value: app.category, inline: true },
        { name: 'Preço', value: priceStr, inline: true },
      )
      .setURL(appUrl)
      .setFooter({ text: 'CodeCraft Gen-Z • Marketplace' })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Ver no Marketplace')
        .setURL(appUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji('🛍️')
    );

    await channel.send({ embeds: [embed], components: [row] });
    console.log('Postado: ' + app.name);
    await sleep(1200);
  }

  console.log('Todos os apps postados!');
  await client.destroy();
  process.exit(0);
});
client.login(process.env.DISCORD_TOKEN!);
