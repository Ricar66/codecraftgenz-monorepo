import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import * as rank from './rank';
import * as desafios from './desafios';
import * as meuRank from './meu-rank';
import * as vagasCmd from './vagas-cmd';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;
const guildId = process.env.DISCORD_GUILD_ID!;

const commands = [
  rank.data.toJSON(),
  desafios.data.toJSON(),
  meuRank.data.toJSON(),
  vagasCmd.data.toJSON(),
];

const rest = new REST().setToken(token);

(async () => {
  console.log(`Registrando ${commands.length} comando(s)...`);
  const data: any = await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands },
  );
  console.log(`✅ ${data.length} comando(s) registrado(s) com sucesso.`);
})();
