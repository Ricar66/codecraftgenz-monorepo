// src/services/ftp.service.ts
// Serviço para upload de arquivos via FTP para a Hostinger

import * as ftp from 'basic-ftp';
import { Readable } from 'stream';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Configurações FTP da Hostinger (via variáveis de ambiente)
const FTP_CONFIG = {
  host: env.FTP_HOST || '',
  user: env.FTP_USER || '',
  password: env.FTP_PASSWORD || '',
  port: Number(env.FTP_PORT) || 21,
  secure: false, // FTP padrão (não FTPS)
  remotePath: env.FTP_REMOTE_PATH || '/public_html/downloads',
  publicUrl: env.FTP_PUBLIC_URL || 'https://codecraftgenz.com.br/downloads',
};

/**
 * Verifica se o FTP está configurado
 */
export const isFtpConfigured = (): boolean => {
  return !!(FTP_CONFIG.host && FTP_CONFIG.user && FTP_CONFIG.password);
};

/**
 * Faz upload de um arquivo para a Hostinger via FTP
 *
 * @param fileName - Nome do arquivo (ex: MeuApp.exe)
 * @param fileBuffer - Buffer do arquivo
 * @returns URL pública do arquivo na Hostinger
 */
export const uploadToHostinger = async (
  fileName: string,
  fileBuffer: Buffer
): Promise<string> => {
  if (!isFtpConfigured()) {
    logger.warn('FTP não configurado - upload para Hostinger desabilitado');
    throw new Error('FTP não configurado');
  }

  const client = new ftp.Client();
  client.ftp.verbose = false; // Desabilitar logs verbosos em produção

  try {
    logger.info({ host: FTP_CONFIG.host, user: FTP_CONFIG.user }, 'Conectando ao FTP...');

    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      port: FTP_CONFIG.port,
      secure: FTP_CONFIG.secure,
    });

    logger.info('Conexão FTP estabelecida');

    // Garantir que a pasta de downloads existe
    try {
      await client.ensureDir(FTP_CONFIG.remotePath);
      logger.info({ path: FTP_CONFIG.remotePath }, 'Diretório verificado/criado');
    } catch (dirError) {
      logger.warn({ error: dirError, path: FTP_CONFIG.remotePath }, 'Erro ao criar diretório (pode já existir)');
    }

    // Navegar para a pasta de downloads
    await client.cd(FTP_CONFIG.remotePath);

    // Converter Buffer para Readable Stream
    const readableStream = Readable.from(fileBuffer);

    // Fazer upload do arquivo
    const remotePath = `${FTP_CONFIG.remotePath}/${fileName}`;
    logger.info({ fileName, remotePath, size: fileBuffer.length }, 'Iniciando upload FTP...');

    await client.uploadFrom(readableStream, fileName);

    const publicUrl = `${FTP_CONFIG.publicUrl}/${fileName}`;
    logger.info({ fileName, publicUrl, size: fileBuffer.length }, 'Upload FTP concluído com sucesso');

    return publicUrl;

  } catch (error) {
    logger.error({ error, fileName }, 'Erro no upload FTP');
    throw error;
  } finally {
    client.close();
  }
};

/**
 * Deleta um arquivo da Hostinger via FTP
 *
 * @param fileName - Nome do arquivo a ser deletado
 */
export const deleteFromHostinger = async (fileName: string): Promise<void> => {
  if (!isFtpConfigured()) {
    logger.warn('FTP não configurado - delete desabilitado');
    return;
  }

  const client = new ftp.Client();

  try {
    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      port: FTP_CONFIG.port,
      secure: FTP_CONFIG.secure,
    });

    await client.cd(FTP_CONFIG.remotePath);
    await client.remove(fileName);

    logger.info({ fileName }, 'Arquivo deletado da Hostinger via FTP');

  } catch (error) {
    logger.warn({ error, fileName }, 'Erro ao deletar arquivo via FTP (pode não existir)');
  } finally {
    client.close();
  }
};

export const ftpService = {
  isFtpConfigured,
  uploadToHostinger,
  deleteFromHostinger,
};
