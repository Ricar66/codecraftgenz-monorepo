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
  port: env.FTP_PORT ?? 21,
  secure: false, // FTP padrão (não FTPS)
  remotePath: env.FTP_REMOTE_PATH || '/domains/codecraftgenz.com.br/public_html/downloads',
  publicUrl: env.FTP_PUBLIC_URL || 'https://codecraftgenz.com.br/downloads',
};

// Log de inicialização para debug
logger.info({
  ftpHost: FTP_CONFIG.host ? `${FTP_CONFIG.host.substring(0, 10)}...` : '(não configurado)',
  ftpUser: FTP_CONFIG.user ? `${FTP_CONFIG.user.substring(0, 5)}...` : '(não configurado)',
  ftpPort: FTP_CONFIG.port,
  ftpRemotePath: FTP_CONFIG.remotePath,
  ftpPublicUrl: FTP_CONFIG.publicUrl,
}, 'Configuração FTP carregada');

/**
 * Verifica se o FTP está configurado
 */
export const isFtpConfigured = (): boolean => {
  const configured = !!(FTP_CONFIG.host && FTP_CONFIG.user && FTP_CONFIG.password);
  logger.info({
    configured,
    hasHost: !!FTP_CONFIG.host,
    hasUser: !!FTP_CONFIG.user,
    hasPassword: !!FTP_CONFIG.password,
    host: FTP_CONFIG.host ? FTP_CONFIG.host.substring(0, 10) + '...' : '(vazio)',
  }, 'Verificação de configuração FTP');
  return configured;
};

/**
 * Faz upload de um arquivo para a Hostinger via FTP
 *
 * @param fileName - Nome do arquivo (ex: MeuApp.exe) ou caminho com subdir (ex: images/foto.png)
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
  client.ftp.verbose = false;

  try {
    logger.info({ host: FTP_CONFIG.host, user: FTP_CONFIG.user }, 'Conectando ao FTP...');

    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      port: FTP_CONFIG.port,
      secure: FTP_CONFIG.secure,
    });

    const ftpRoot = await client.pwd();
    logger.info({ ftpRoot }, 'Conexão FTP estabelecida');

    // Suporte a subdiretorios (ex: "images/foto.png" -> subDir="images", actualFileName="foto.png")
    const parts = fileName.split('/');
    const actualFileName = parts.pop()!;
    const subDir = parts.join('/');

    const targetDir = subDir
      ? `${FTP_CONFIG.remotePath}/${subDir}`
      : FTP_CONFIG.remotePath;

    // Garantir que o diretorio de destino existe
    try {
      await client.ensureDir(targetDir);
      logger.info({ path: targetDir }, 'Diretório verificado/criado');
    } catch (dirError) {
      logger.warn({ error: dirError, path: targetDir }, 'Erro ao criar diretório (pode já existir)');
    }

    await client.cd(targetDir);

    const readableStream = Readable.from(fileBuffer);

    const remotePath = `${targetDir}/${actualFileName}`;
    logger.info({ fileName: actualFileName, remotePath, size: fileBuffer.length }, 'Iniciando upload FTP...');

    await client.uploadFrom(readableStream, actualFileName);

    const publicUrl = subDir
      ? `${FTP_CONFIG.publicUrl}/${subDir}/${actualFileName}`
      : `${FTP_CONFIG.publicUrl}/${actualFileName}`;
    logger.info({ fileName: actualFileName, publicUrl, size: fileBuffer.length }, 'Upload FTP concluído com sucesso');

    return publicUrl;

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    logger.error({
      error: errMsg,
      stack: errStack,
      fileName,
      host: FTP_CONFIG.host,
      port: FTP_CONFIG.port,
      remotePath: FTP_CONFIG.remotePath,
    }, 'Erro no upload FTP');
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

/**
 * Baixa um arquivo da Hostinger via FTP e salva localmente
 *
 * @param fileName - Nome do arquivo (pode incluir subdir, ex: images/projetos/foto.jpg)
 * @param localPath - Caminho completo onde salvar o arquivo localmente
 * @returns true se baixou com sucesso, false se o arquivo não existe no FTP
 */
export const downloadFromHostinger = async (
  fileName: string,
  localPath: string
): Promise<boolean> => {
  if (!isFtpConfigured()) {
    logger.warn('FTP não configurado - download da Hostinger desabilitado');
    return false;
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

    const ftpRoot = await client.pwd();
    logger.info({ ftpRoot, remotePath: FTP_CONFIG.remotePath }, 'Download FTP - diretório raiz');

    // Suporte a subdiretorios (ex: "images/projetos/foto.jpg")
    const parts = fileName.split('/');
    const actualFileName = parts.pop()!;
    const subDir = parts.join('/');

    const targetDir = subDir
      ? `${FTP_CONFIG.remotePath}/${subDir}`
      : FTP_CONFIG.remotePath;

    logger.info({ fileName, actualFileName, targetDir, localPath }, 'Baixando arquivo da Hostinger via FTP...');
    await client.cd(targetDir);

    const currentDir = await client.pwd();
    const files = await client.list();
    const fileNames = files.map(f => f.name);
    logger.info({ currentDir, filesInDir: fileNames.slice(0, 20) }, 'Download FTP - diretório atual e conteúdo');

    await client.downloadTo(localPath, actualFileName);
    logger.info({ fileName, localPath }, 'Download FTP concluído com sucesso');

    return true;
  } catch (error) {
    logger.warn({ error, fileName }, 'Erro ao baixar arquivo via FTP (pode não existir)');
    return false;
  } finally {
    client.close();
  }
};

export const ftpService = {
  isFtpConfigured,
  uploadToHostinger,
  deleteFromHostinger,
  downloadFromHostinger,
};
