import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  DISCORD_CHANNEL_NEWS: z.string().optional(),
  DISCORD_CHANNEL_VAGAS: z.string().optional(),
  DISCORD_CHANNEL_DESAFIOS: z.string().optional(),
  DISCORD_CHANNEL_ANUNCIOS: z.string().optional(),
  DISCORD_CHANNEL_APRESENTACOES: z.string().optional(),
  DISCORD_CHANNEL_GERAL: z.string().optional(),
  DISCORD_ROLE_CRAFTER: z.string().optional(),
  DISCORD_ROLE_CRAFTER_ELITE: z.string().optional(),
  DISCORD_ROLE_NOVATO: z.string().optional(),
  INTERNAL_WEBHOOK_SECRET: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  INTERNAL_PORT: z.coerce.number().default(3001),
});

export const env = envSchema.parse(process.env);
