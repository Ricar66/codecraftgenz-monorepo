// src/services/storage.service.ts
// Serviço de storage usando Supabase para arquivos grandes (executáveis)

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Bucket padrão para downloads
const BUCKET_NAME = 'downloads';

// Cliente Supabase (lazy initialization)
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.warn('Supabase não configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_KEY');
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

export const storageService = {
  /**
   * Verifica se o Supabase está configurado
   */
  isConfigured(): boolean {
    return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;
  },

  /**
   * Faz upload de um arquivo para o Supabase Storage
   * @param fileName Nome do arquivo (será usado como path no bucket)
   * @param fileBuffer Buffer do arquivo
   * @param contentType Tipo MIME do arquivo
   * @returns URL pública do arquivo ou null se falhar
   */
  async upload(
    fileName: string,
    fileBuffer: Buffer,
    contentType = 'application/octet-stream'
  ): Promise<string | null> {
    const client = getSupabaseClient();
    if (!client) {
      logger.error('Supabase não configurado para upload');
      return null;
    }

    try {
      // Upload do arquivo
      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .upload(fileName, fileBuffer, {
          contentType,
          upsert: true, // Sobrescreve se já existir
        });

      if (error) {
        logger.error({ error, fileName }, 'Erro no upload para Supabase');
        return null;
      }

      // Gerar URL pública
      const { data: urlData } = client.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      logger.info({ fileName, path: data?.path }, 'Arquivo enviado para Supabase');

      return urlData.publicUrl;
    } catch (error) {
      logger.error({ error, fileName }, 'Exceção no upload para Supabase');
      return null;
    }
  },

  /**
   * Remove um arquivo do Supabase Storage
   * @param fileName Nome do arquivo a remover
   */
  async delete(fileName: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client.storage
        .from(BUCKET_NAME)
        .remove([fileName]);

      if (error) {
        logger.error({ error, fileName }, 'Erro ao remover arquivo do Supabase');
        return false;
      }

      logger.info({ fileName }, 'Arquivo removido do Supabase');
      return true;
    } catch (error) {
      logger.error({ error, fileName }, 'Exceção ao remover arquivo do Supabase');
      return false;
    }
  },

  /**
   * Gera URL pública para um arquivo
   * @param fileName Nome do arquivo
   */
  getPublicUrl(fileName: string): string | null {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data } = client.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return data.publicUrl;
  },

  /**
   * Lista arquivos no bucket
   * @param prefix Prefixo opcional para filtrar
   */
  async list(prefix?: string): Promise<string[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .list(prefix || '', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        logger.error({ error }, 'Erro ao listar arquivos do Supabase');
        return [];
      }

      return data.map((file) => file.name);
    } catch (error) {
      logger.error({ error }, 'Exceção ao listar arquivos do Supabase');
      return [];
    }
  },
};
