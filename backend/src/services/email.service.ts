import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Interface para dados de compra no email
 */
interface PurchaseEmailData {
  customerName: string;
  customerEmail: string;
  appName: string;
  appVersion?: string;
  price: number;
  paymentId: string;
  downloadUrl: string;
  licenseKey?: string;
  purchaseDate: Date;
}

/**
 * Cria o transporter do nodemailer
 * Detecta automaticamente se é Gmail ou Hostinger baseado no email
 */
function createTransporter() {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    logger.warn('Email credentials not configured. Emails will not be sent.');
    return null;
  }

  const isGmail = env.EMAIL_USER.toLowerCase().includes('@gmail.com');

  if (isGmail) {
    // Gmail requer "App Password" (não a senha normal)
    // Configurar em: Google Account > Security > 2-Step Verification > App passwords
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    });
  }

  // Hostinger ou outro provedor
  return nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  });
}

/**
 * Gera o template HTML do email de compra
 */
function generatePurchaseEmailHtml(data: PurchaseEmailData): string {
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(data.price);

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data.purchaseDate);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compra Confirmada - CodeCraft Gen-Z</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">

          <!-- Header com gradiente -->
          <tr>
            <td style="background: linear-gradient(135deg, #00E4F2 0%, #D12BF2 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">
                      ✓
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                      Compra Confirmada!
                    </h1>
                    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                      Seu aplicativo está pronto para download
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Saudação -->
          <tr>
            <td style="padding: 32px 40px 16px;">
              <p style="margin: 0; color: #333333; font-size: 18px;">
                Olá, <strong style="color: #D12BF2;">${data.customerName}</strong>! 👋
              </p>
              <p style="margin: 12px 0 0; color: #666666; font-size: 15px; line-height: 1.6;">
                Sua compra foi processada com sucesso! Agradecemos por escolher a CodeCraft Gen-Z.
              </p>
            </td>
          </tr>

          <!-- Card do Produto -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td>
                          <p style="margin: 0 0 4px; color: #00E4F2; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                            Aplicativo
                          </p>
                          <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                            ${data.appName}
                          </h2>
                          ${data.appVersion ? `<p style="margin: 4px 0 0; color: #888888; font-size: 14px;">Versão ${data.appVersion}</p>` : ''}
                        </td>
                        <td style="text-align: right; vertical-align: top;">
                          <p style="margin: 0; color: #00E4F2; font-size: 24px; font-weight: 700;">
                            ${formattedPrice}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Botão de Download -->
          <tr>
            <td style="padding: 24px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <a href="${data.downloadUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #D12BF2 0%, #9B1FD4 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 16px rgba(209,43,242,0.4);">
                      ⬇️ Baixar Agora
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-top: 12px;">
                    <p style="margin: 0; color: #999999; font-size: 13px;">
                      Ou copie o link: <a href="${data.downloadUrl}" style="color: #D12BF2; word-break: break-all;">${data.downloadUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Detalhes da Compra -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; border: 1px solid #e9ecef;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 16px; color: #333333; font-size: 16px; font-weight: 600;">
                      📋 Detalhes da Compra
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; color: #666666; font-size: 14px; border-bottom: 1px solid #e9ecef;">ID do Pedido:</td>
                        <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #e9ecef;">${data.paymentId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666666; font-size: 14px; border-bottom: 1px solid #e9ecef;">Data:</td>
                        <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #e9ecef;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666666; font-size: 14px; border-bottom: 1px solid #e9ecef;">Email:</td>
                        <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #e9ecef;">${data.customerEmail}</td>
                      </tr>
                      ${data.licenseKey ? `
                      <tr>
                        <td style="padding: 8px 0; color: #666666; font-size: 14px;">Chave de Licença:</td>
                        <td style="padding: 8px 0; color: #D12BF2; font-size: 14px; font-weight: 600; text-align: right; font-family: monospace;">${data.licenseKey}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Dicas -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #e8f5e9; border-radius: 12px; border-left: 4px solid #4caf50;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px; color: #2e7d32; font-size: 14px; font-weight: 600;">
                      💡 Dicas Importantes
                    </p>
                    <ul style="margin: 0; padding: 0 0 0 20px; color: #558b2f; font-size: 13px; line-height: 1.8;">
                      <li>Guarde este email como comprovante de compra</li>
                      <li>O link de download não expira</li>
                      <li>Em caso de dúvidas, entre em contato conosco</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a2e; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 8px; color: #ffffff; font-size: 16px; font-weight: 600;">
                CodeCraft Gen-Z
              </p>
              <p style="margin: 0 0 16px; color: #888888; font-size: 13px;">
                Transformando ideias em código
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 8px;">
                    <a href="https://codecraftgenz.com.br" style="color: #00E4F2; text-decoration: none; font-size: 13px;">Site</a>
                  </td>
                  <td style="color: #444444;">|</td>
                  <td style="padding: 0 8px;">
                    <a href="https://codecraftgenz.com.br/aplicativos" style="color: #00E4F2; text-decoration: none; font-size: 13px;">Apps</a>
                  </td>
                  <td style="color: #444444;">|</td>
                  <td style="padding: 0 8px;">
                    <a href="mailto:suporte@codecraftgenz.com.br" style="color: #00E4F2; text-decoration: none; font-size: 13px;">Suporte</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0; color: #666666; font-size: 11px;">
                © ${new Date().getFullYear()} CodeCraft Gen-Z. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Gera a versão texto do email
 */
function generatePurchaseEmailText(data: PurchaseEmailData): string {
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(data.price);

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data.purchaseDate);

  return `
COMPRA CONFIRMADA - CODECRAFT GEN-Z
====================================

Olá, ${data.customerName}!

Sua compra foi processada com sucesso!

DETALHES DO PRODUTO
-------------------
Aplicativo: ${data.appName}
${data.appVersion ? `Versão: ${data.appVersion}` : ''}
Valor: ${formattedPrice}

DETALHES DA COMPRA
------------------
ID do Pedido: ${data.paymentId}
Data: ${formattedDate}
Email: ${data.customerEmail}
${data.licenseKey ? `Chave de Licença: ${data.licenseKey}` : ''}

DOWNLOAD
--------
Link: ${data.downloadUrl}

DICAS IMPORTANTES
-----------------
• Guarde este email como comprovante de compra
• O link de download não expira
• Em caso de dúvidas, entre em contato conosco

---
CodeCraft Gen-Z
https://codecraftgenz.com.br
suporte@codecraftgenz.com.br
`;
}

/**
 * Serviço de Email
 */
export const emailService = {
  /**
   * Envia email de confirmação de compra
   */
  async sendPurchaseConfirmation(data: PurchaseEmailData): Promise<boolean> {
    const transporter = createTransporter();

    if (!transporter) {
      logger.warn({ email: data.customerEmail }, 'Email not sent - credentials not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: `"CodeCraft Gen-Z" <${env.EMAIL_USER}>`,
        to: data.customerEmail,
        subject: `✅ Compra Confirmada - ${data.appName}`,
        text: generatePurchaseEmailText(data),
        html: generatePurchaseEmailHtml(data),
      };

      const info = await transporter.sendMail(mailOptions);

      logger.info(
        { messageId: info.messageId, to: data.customerEmail, app: data.appName },
        'Purchase confirmation email sent'
      );

      return true;
    } catch (error) {
      logger.error({ error, email: data.customerEmail }, 'Failed to send purchase email');
      return false;
    }
  },

  /**
   * Testa a conexão com o servidor de email
   */
  async testConnection(): Promise<boolean> {
    const transporter = createTransporter();

    if (!transporter) {
      return false;
    }

    try {
      await transporter.verify();
      logger.info('Email connection verified successfully');
      return true;
    } catch (error) {
      logger.error({ error }, 'Email connection failed');
      return false;
    }
  },
};
