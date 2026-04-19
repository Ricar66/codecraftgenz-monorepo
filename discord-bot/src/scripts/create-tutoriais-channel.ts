import 'dotenv/config';
import {
  Client, GatewayIntentBits, ChannelType, PermissionsBitField,
  TextChannel, CategoryChannel,
} from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID!);
  await guild.channels.fetch();

  // Encontra a categoria APRENDIZADO
  const category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory &&
         c.name.toLowerCase().includes('aprendizado')
  ) as CategoryChannel | undefined;

  if (!category) {
    console.error('Categoria APRENDIZADO não encontrada.');
    await client.destroy();
    process.exit(1);
  }

  // Verifica se o canal já existe
  const existing = guild.channels.cache.find(
    c => c.name.includes('tutoriais') || c.name.includes('conteudo-educativo')
  ) as TextChannel | undefined;

  if (existing) {
    console.log(`Canal já existe: #${existing.name}`);
    await client.destroy();
    process.exit(0);
  }

  // Permissões:
  // @everyone → pode ver e reagir, mas NÃO pode enviar mensagens
  // Admin/Manage Messages → pode enviar
  const everyoneRole = guild.roles.everyone;

  const channel = await guild.channels.create({
    name: '📖・tutoriais',
    type: ChannelType.GuildText,
    parent: category.id,
    topic: 'Conteúdo educativo criado pela equipe CodeCraft Gen-Z. Leia, aprenda e reaja! 🚀',
    permissionOverwrites: [
      {
        id: everyoneRole.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AddReactions,
        ],
        deny: [
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.CreatePublicThreads,
          PermissionsBitField.Flags.CreatePrivateThreads,
        ],
      },
    ],
  });

  console.log(`✅ Canal criado: #${channel.name} (ID: ${channel.id})`);
  console.log(`   Categoria: ${category.name}`);
  console.log(`   Membros: só leitura e reações`);
  console.log(`   Admins: podem postar normalmente (herdam da categoria)`);

  await client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN!);
