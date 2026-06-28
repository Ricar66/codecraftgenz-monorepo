import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import * as vagasCmd from './vagas-cmd';

// CRAFTERS · arquivado em 2026-06-27 (docs/CRAFTERS-ARCHIVE.md)
// Pra reativar: descomentar imports e adicionar de volta em `commands`.
// import * as rank from './rank';
// import * as desafios from './desafios';
// import * as meuRank from './meu-rank';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;
const guildId = process.env.DISCORD_GUILD_ID!;

const commands = [
  vagasCmd.data.toJSON(),
  // rank.data.toJSON(),
  // desafios.data.toJSON(),
  // meuRank.data.toJSON(),
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
