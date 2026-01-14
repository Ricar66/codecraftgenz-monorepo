import { Router } from 'express';
import { success, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

const router = Router();

/**
 * GET /api/mercado-livre/oauth/callback
 * Callback OAuth do Mercado Livre para troca de código por tokens
 */
router.get('/mercado-livre/oauth/callback', async (req, res): Promise<void> => {
  try {
    const { code, error, error_description } = req.query;

    if (error) {
      logger.warn({ error, error_description }, 'OAuth callback erro');
      sendError(res, 400, 'OAUTH_ERROR', String(error_description || error));
      return;
    }

    if (!code) {
      sendError(res, 400, 'NO_CODE', 'Código de autorização não fornecido');
      return;
    }

    // Verificar se temos as credenciais necessárias
    const clientId = process.env.MERCADO_LIVRE_CLIENT_ID || process.env.ML_CLIENT_ID;
    const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET || process.env.ML_CLIENT_SECRET;
    const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI || `${env.FRONTEND_URL}/api/mercado-livre/oauth/callback`;

    if (!clientId || !clientSecret) {
      sendError(res, 503, 'NOT_CONFIGURED', 'Integração com Mercado Livre não configurada');
      return;
    }

    // Trocar código por tokens
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: String(code),
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      scope?: string;
      user_id?: number;
      refresh_token?: string;
      message?: string;
      error?: string;
    };

    if (!tokenResponse.ok) {
      logger.error({ status: tokenResponse.status, error: tokenData }, 'OAuth token exchange failed');
      sendError(res, tokenResponse.status, 'TOKEN_ERROR', tokenData.message || tokenData.error || 'Falha ao obter tokens');
      return;
    }

    // Salvar tokens (em produção, persistir no banco)
    // Por enquanto, apenas log e retorna sucesso
    logger.info({ user_id: tokenData.user_id }, 'OAuth tokens obtidos com sucesso');

    // TODO: Persistir tokens no banco de dados
    // await saveTokens(tokenData);

    res.json(success({
      message: 'Autorização concluída com sucesso',
      user_id: tokenData.user_id,
      expires_in: tokenData.expires_in,
    }));
  } catch (err) {
    logger.error({ error: err }, 'Erro no OAuth callback Mercado Livre');
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao processar callback OAuth');
  }
});

/**
 * GET /api/mercado-livre/oauth/status
 * Verificar status da integração OAuth
 */
router.get('/mercado-livre/oauth/status', (_req, res): void => {
  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID || process.env.ML_CLIENT_ID;
  const hasCredentials = !!clientId;

  res.json(success({
    configured: hasCredentials,
    client_id: clientId ? clientId.substring(0, 8) + '...' : null,
  }));
});

export default router;
