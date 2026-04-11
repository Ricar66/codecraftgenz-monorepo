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
    logger.error({
      hasEmailUser: !!env.EMAIL_USER,
      hasEmailPass: !!env.EMAIL_PASS,
      emailUserPartial: env.EMAIL_USER ? `${env.EMAIL_USER.substring(0, 3)}...` : 'não definido',
    }, 'ERRO CRITICO: Credenciais de email não configuradas. EMAIL_USER e EMAIL_PASS são obrigatórios para envio de emails.');
    return null;
  }

  logger.info({ emailUser: env.EMAIL_USER }, 'Criando transporter de email');

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
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
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
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Cria transporter para o email team@ (crafter/boas-vindas)
 * Usa EMAIL_TEAM_USER/EMAIL_TEAM_PASS se disponíveis, senão fallback para EMAIL_USER
 */
function createTeamTransporter() {
  const user = env.EMAIL_TEAM_USER || env.EMAIL_USER;
  const pass = env.EMAIL_TEAM_PASS || env.EMAIL_PASS;

  if (!user || !pass) {
    logger.warn('Team email credentials not configured');
    return null;
  }

  logger.info({ emailUser: user }, 'Criando transporter de email (team)');

  return nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

// URL do logo da empresa (hospedado no site de produção)
// Usando o logo-principal.png que está na raiz do public
const LOGO_URL = 'https://codecraftgenz.com.br/logo-principal.png';

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
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d0d1a;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0d0d1a;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,228,242,0.15);">

          <!-- Header com logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 40px; text-align: center; border-bottom: 2px solid #D12BF2;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <!-- Logo da empresa -->
                    <img src="${LOGO_URL}" alt="CodeCraft Gen-Z" title="CodeCraft Gen-Z" style="max-width: 280px; height: auto; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto;" />
                    <h1 style="margin: 0; color: #00E4F2; font-size: 28px; font-weight: 700;">
                      Compra Confirmada!
                    </h1>
                    <p style="margin: 8px 0 0; color: #D12BF2; font-size: 16px; font-weight: 500;">
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
              <p style="margin: 0; color: #ffffff; font-size: 18px;">
                Olá, <strong style="color: #00E4F2;">${data.customerName}</strong>!
              </p>
              <p style="margin: 12px 0 0; color: #b0b0b0; font-size: 15px; line-height: 1.6;">
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
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0d0d1a; border-radius: 12px; border: 1px solid #333;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 16px; color: #00E4F2; font-size: 16px; font-weight: 600;">
                      Detalhes da Compra
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; color: #888888; font-size: 14px; border-bottom: 1px solid #333;">ID do Pedido:</td>
                        <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #333;">${data.paymentId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #888888; font-size: 14px; border-bottom: 1px solid #333;">Data:</td>
                        <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #333;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #888888; font-size: 14px; border-bottom: 1px solid #333;">Email:</td>
                        <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #333;">${data.customerEmail}</td>
                      </tr>
                      ${data.licenseKey ? `
                      <tr>
                        <td style="padding: 8px 0; color: #888888; font-size: 14px;">Chave de Licença:</td>
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
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: rgba(0,228,242,0.1); border-radius: 12px; border-left: 4px solid #00E4F2;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px; color: #00E4F2; font-size: 14px; font-weight: 600;">
                      Dicas Importantes
                    </p>
                    <ul style="margin: 0; padding: 0 0 0 20px; color: #b0b0b0; font-size: 13px; line-height: 1.8;">
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
            <td style="background: linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 100%); padding: 32px 40px; text-align: center; border-top: 1px solid #333;">
              <!-- Logo pequeno no footer -->
              <img src="${LOGO_URL}" alt="CodeCraft Gen-Z" title="CodeCraft Gen-Z" style="max-width: 150px; height: auto; margin-bottom: 16px; opacity: 0.9; display: block; margin-left: auto; margin-right: auto;" />
              <p style="margin: 0 0 8px; color: #D12BF2; font-size: 14px; font-weight: 500;">
                Transformando ideias em código
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 16px auto;">
                <tr>
                  <td style="padding: 0 12px;">
                    <a href="https://codecraftgenz.com.br" style="color: #00E4F2; text-decoration: none; font-size: 13px;">Site</a>
                  </td>
                  <td style="color: #444444;">|</td>
                  <td style="padding: 0 12px;">
                    <a href="https://codecraftgenz.com.br/aplicativos" style="color: #00E4F2; text-decoration: none; font-size: 13px;">Apps</a>
                  </td>
                  <td style="color: #444444;">|</td>
                  <td style="padding: 0 12px;">
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
 * Interface para email de boas-vindas ao crafter
 */
interface WelcomeEmailData {
  nome: string;
  to: string;
  from?: string;
}

/**
 * Interface para notificação de nova inscrição ao admin
 */
interface NotifyAdminData {
  to: string;
  subject: string;
  nome: string;
  email: string;
  telefone?: string;
  rede_social?: string;
  area_interesse?: string;
  cidade?: string;
  estado?: string;
  mensagem?: string;
}

/**
 * Gera o template HTML do email de boas-vindas ao crafter
 */
function generateWelcomeEmailHtml(data: WelcomeEmailData): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#1a1a2e;border-radius:12px;overflow:hidden;border:1px solid rgba(209,43,242,0.2);">
    <div style="background:linear-gradient(135deg,#D12BF2,#68007B);padding:32px 24px;text-align:center;">
      <img src="${LOGO_URL}" alt="CodeCraft Gen-Z" style="height:48px;margin-bottom:16px;" />
      <h1 style="color:#fff;margin:0;font-size:24px;">Bem-vindo(a), ${data.nome}! 🎉</h1>
    </div>
    <div style="padding:32px 24px;color:#d0d0d8;font-size:15px;line-height:1.7;">
      <p>Olá <strong style="color:#fff;">${data.nome}</strong>,</p>
      <p>Sua inscrição como <strong style="color:#00E4F2;">Crafter</strong> foi recebida com sucesso!</p>
      <p>Nossa seleção de novos Crafters acontece <strong style="color:#D12BF2;">mensalmente</strong>. Entraremos em contato.</p>
      <div style="background:rgba(0,228,242,0.08);border:1px solid rgba(0,228,242,0.2);border-radius:8px;padding:16px;margin:24px 0;">
        <p style="margin:0;color:#00E4F2;font-weight:600;">📅 O que esperar:</p>
        <ul style="color:#d0d0d8;margin:8px 0 0 0;padding-left:20px;">
          <li>Nosso time avaliará sua inscrição</li>
          <li>Você receberá um retorno por e-mail</li>
          <li>Se selecionado(a), receberá os próximos passos</li>
        </ul>
      </div>
      <p>Enquanto isso, conheça mais sobre nossos projetos e desafios em <a href="https://codecraftgenz.com.br" style="color:#00E4F2;text-decoration:none;">codecraftgenz.com.br</a></p>
      <p style="margin-top:32px;">Até breve! 🚀<br/><strong style="color:#fff;">Equipe CodeCraft Gen-Z</strong></p>
    </div>
    <div style="background:rgba(255,255,255,0.03);padding:16px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="color:#666;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} CodeCraft Gen-Z. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Gera o template HTML de notificação ao admin
 */
function generateNotifyAdminHtml(data: NotifyAdminData): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#D12BF2;padding:20px 24px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">🆕 Nova Inscrição de Crafter</h1>
    </div>
    <div style="padding:24px;color:#333;font-size:14px;line-height:1.6;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 12px;font-weight:600;color:#666;width:140px;">Nome:</td><td style="padding:8px 12px;color:#111;">${data.nome}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:600;color:#666;">Email:</td><td style="padding:8px 12px;"><a href="mailto:${data.email}" style="color:#D12BF2;">${data.email}</a></td></tr>
        <tr><td style="padding:8px 12px;font-weight:600;color:#666;">Telefone:</td><td style="padding:8px 12px;">${data.telefone || '—'}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:600;color:#666;">Rede Social:</td><td style="padding:8px 12px;">${data.rede_social ? `<a href="${data.rede_social}" style="color:#D12BF2;">${data.rede_social}</a>` : '—'}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:600;color:#666;">Área:</td><td style="padding:8px 12px;">${data.area_interesse || '—'}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:600;color:#666;">Localização:</td><td style="padding:8px 12px;">${[data.cidade, data.estado].filter(Boolean).join(', ') || '—'}</td></tr>
        ${data.mensagem ? `<tr><td style="padding:8px 12px;font-weight:600;color:#666;vertical-align:top;">Mensagem:</td><td style="padding:8px 12px;">${data.mensagem}</td></tr>` : ''}
      </table>
      <p style="margin-top:20px;text-align:center;"><a href="https://codecraftgenz.com.br/admin/inscricoes" style="display:inline-block;background:#D12BF2;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Ver no Painel Admin</a></p>
    </div>
  </div>
</body>
</html>`;
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
   * Envia email de boas-vindas ao crafter inscrito
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const transporter = createTeamTransporter();
    if (!transporter) {
      logger.warn({ email: data.to }, 'Welcome email not sent - credentials not configured');
      return false;
    }

    try {
      const teamEmail = env.EMAIL_TEAM_USER || env.EMAIL_USER;
      const mailOptions = {
        from: `"Equipe CodeCraft Gen-Z" <${teamEmail}>`,
        to: data.to,
        subject: `🎉 Bem-vindo(a) à CodeCraft Gen-Z, ${data.nome}!`,
        text: `Olá ${data.nome},\n\nSua inscrição como Crafter foi recebida com sucesso!\n\nNossa seleção de novos Crafters acontece mensalmente. Avaliaremos seu perfil e entraremos em contato em breve.\n\nAté breve!\nEquipe CodeCraft Gen-Z\nhttps://codecraftgenz.com.br`,
        html: generateWelcomeEmailHtml(data),
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info({ messageId: info.messageId, to: data.to }, 'Welcome email sent');
      return true;
    } catch (error) {
      logger.error({ error, email: data.to }, 'Failed to send welcome email');
      return false;
    }
  },

  /**
   * Envia notificação de nova inscrição ao admin
   */
  async sendAdminNotification(data: NotifyAdminData): Promise<boolean> {
    const transporter = createTeamTransporter();
    if (!transporter) {
      logger.warn('Admin notification not sent - credentials not configured');
      return false;
    }

    try {
      const teamEmail = env.EMAIL_TEAM_USER || env.EMAIL_USER;
      const mailOptions = {
        from: `"CodeCraft Gen-Z" <${teamEmail}>`,
        to: data.to,
        subject: data.subject,
        text: `Nova inscrição de Crafter:\n\nNome: ${data.nome}\nEmail: ${data.email}\nTelefone: ${data.telefone || '—'}\nRede Social: ${data.rede_social || '—'}\nÁrea: ${data.area_interesse || '—'}\nLocalização: ${[data.cidade, data.estado].filter(Boolean).join(', ') || '—'}\nMensagem: ${data.mensagem || '—'}`,
        html: generateNotifyAdminHtml(data),
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info({ messageId: info.messageId, to: data.to }, 'Admin notification email sent');
      return true;
    } catch (error) {
      logger.error({ error, to: data.to }, 'Failed to send admin notification');
      return false;
    }
  },

  /**
   * Envia email de boas-vindas ao parceiro
   */
  async sendPartnerWelcomeEmail(data: { to: string; nome: string; empresa?: string }): Promise<boolean> {
    const transporter = createTeamTransporter();
    if (!transporter) return false;

    try {
      const teamEmail = env.EMAIL_TEAM_USER || env.EMAIL_USER;
      const mailOptions = {
        from: `"Equipe CodeCraft Gen-Z" <${teamEmail}>`,
        to: data.to,
        subject: `🤝 Proposta recebida, ${data.nome}!`,
        text: `Olá ${data.nome},\n\nRecebemos sua proposta de parceria${data.empresa ? ` pela ${data.empresa}` : ''}.\n\nAnalisamos propostas semanalmente e entraremos em contato em breve.\n\nEquipe CodeCraft Gen-Z`,
        html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#1a1a2e;border-radius:12px;overflow:hidden;border:1px solid rgba(0,228,242,0.2);">
    <div style="background:linear-gradient(135deg,#00E4F2,#0891b2);padding:32px 24px;text-align:center;">
      <img src="${LOGO_URL}" alt="CodeCraft Gen-Z" style="height:48px;margin-bottom:16px;" />
      <h1 style="color:#fff;margin:0;font-size:24px;">Proposta recebida! 🤝</h1>
    </div>
    <div style="padding:32px 24px;color:#d0d0d8;font-size:15px;line-height:1.7;">
      <p>Olá <strong style="color:#fff;">${data.nome}</strong>,</p>
      <p>Recebemos sua proposta de parceria${data.empresa ? ` pela <strong style="color:#00E4F2;">${data.empresa}</strong>` : ''} com muito interesse!</p>
      <p>Analisamos propostas de parceria <strong style="color:#00E4F2;">semanalmente</strong> e nossa equipe entrará em contato em breve para agendar uma conversa.</p>
      <div style="background:rgba(0,228,242,0.08);border:1px solid rgba(0,228,242,0.2);border-radius:8px;padding:16px;margin:24px 0;">
        <p style="margin:0;color:#00E4F2;font-weight:600;">📋 Próximos passos:</p>
        <ul style="color:#d0d0d8;margin:8px 0 0 0;padding-left:20px;">
          <li>Nossa equipe avaliará sua proposta</li>
          <li>Entraremos em contato para alinhar detalhes</li>
          <li>Agendaremos uma reunião para conhecer melhor</li>
        </ul>
      </div>
      <p>Conheça mais sobre nós em <a href="https://codecraftgenz.com.br/para-empresas" style="color:#00E4F2;text-decoration:none;">codecraftgenz.com.br/para-empresas</a></p>
      <p style="margin-top:32px;">Até breve! 🚀<br/><strong style="color:#fff;">Equipe CodeCraft Gen-Z</strong></p>
    </div>
    <div style="background:rgba(255,255,255,0.03);padding:16px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="color:#666;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} CodeCraft Gen-Z. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`,
      };
      const info = await transporter.sendMail(mailOptions);
      logger.info({ messageId: info.messageId, to: data.to }, 'Partner welcome email sent');
      return true;
    } catch (error) {
      logger.error({ error, email: data.to }, 'Failed to send partner welcome email');
      return false;
    }
  },

  /**
   * Envia notificação de nova parceria ao admin
   */
  async sendPartnerNotification(data: {
    to: string; subject: string; nomeContato: string; email: string;
    telefone?: string; empresa?: string; cargo?: string; site?: string;
    tipoParceria?: string; mensagem?: string;
  }): Promise<boolean> {
    const transporter = createTeamTransporter();
    if (!transporter) return false;

    const TIPO_LABELS: Record<string, string> = {
      tecnologia: 'Parceria Tecnológica', investimento: 'Investimento', patrocinio: 'Patrocínio',
      squads: 'Contratação de Squads', mentoria_corporativa: 'Mentoria Corporativa',
      estagio: 'Programa de Estágio', outro: 'Outro',
    };

    try {
      const teamEmail = env.EMAIL_TEAM_USER || env.EMAIL_USER;
      const mailOptions = {
        from: `"CodeCraft Gen-Z" <${teamEmail}>`,
        to: data.to,
        subject: data.subject,
        text: `Nova proposta de parceria:\n\nContato: ${data.nomeContato}\nEmpresa: ${data.empresa || '—'}\nEmail: ${data.email}\nTelefone: ${data.telefone || '—'}\nCargo: ${data.cargo || '—'}\nSite: ${data.site || '—'}\nTipo: ${TIPO_LABELS[data.tipoParceria || ''] || data.tipoParceria || '—'}\nMensagem: ${data.mensagem || '—'}`,
        html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#00E4F2,#0891b2);padding:20px 24px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">🤝 Nova Proposta de Parceria</h1>
    </div>
    <div style="padding:24px;color:#333;font-size:14px;line-height:1.6;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 12px;font-weight:600;color:#666;width:140px;">Contato:</td><td style="padding:8px 12px;color:#111;">${data.nomeContato}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:600;color:#666;">Empresa:</td><td style="padding:8px 12px;color:#111;font-weight:600;">${data.empresa || '—'}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:600;color:#666;">Email:</td><td style="padding:8px 12px;"><a href="mailto:${data.email}" style="color:#0891b2;">${data.email}</a></td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:600;color:#666;">Telefone:</td><td style="padding:8px 12px;">${data.telefone || '—'}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:600;color:#666;">Cargo:</td><td style="padding:8px 12px;">${data.cargo || '—'}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:600;color:#666;">Site:</td><td style="padding:8px 12px;">${data.site ? `<a href="${data.site}" style="color:#0891b2;">${data.site}</a>` : '—'}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:600;color:#666;">Tipo:</td><td style="padding:8px 12px;"><strong>${TIPO_LABELS[data.tipoParceria || ''] || data.tipoParceria || '—'}</strong></td></tr>
        ${data.mensagem ? `<tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:600;color:#666;vertical-align:top;">Mensagem:</td><td style="padding:8px 12px;">${data.mensagem}</td></tr>` : ''}
      </table>
      <p style="margin-top:20px;text-align:center;"><a href="https://codecraftgenz.com.br/admin/parcerias" style="display:inline-block;background:#0891b2;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Ver no Painel Admin</a></p>
    </div>
  </div>
</body>
</html>`,
      };
      const info = await transporter.sendMail(mailOptions);
      logger.info({ messageId: info.messageId, to: data.to }, 'Partner notification sent');
      return true;
    } catch (error) {
      logger.error({ error, to: data.to }, 'Failed to send partner notification');
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

  /**
   * Envia convite de reunião para os participantes de uma meta
   */
  async sendMeetingInvite(data: {
    recipients: { name: string; email: string }[];
    meetingTitle: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    callLink?: string;
    organizerName: string;
  }): Promise<void> {
    const transporter = createTeamTransporter();
    if (!transporter) {
      logger.warn('Meeting invite not sent - email credentials not configured');
      return;
    }

    const teamEmail = env.EMAIL_TEAM_USER || env.EMAIL_USER;

    const fmt = (d: Date) => new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(d);

    const fmtTime = (d: Date) => new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(d);

    const startFormatted = fmt(data.startDate);
    const endFormatted = data.endDate ? fmtTime(data.endDate) : null;
    const duration = endFormatted ? ` até ${endFormatted}` : '';

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(209,43,242,0.2);box-shadow:0 4px 32px rgba(0,0,0,0.4);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px 40px;text-align:center;border-bottom:2px solid #D12BF2;">
        <img src="${LOGO_URL}" alt="CodeCraft Gen-Z" style="max-width:200px;height:auto;margin-bottom:20px;display:block;margin-left:auto;margin-right:auto;" />
        <div style="display:inline-block;background:rgba(209,43,242,0.15);border:1px solid rgba(209,43,242,0.4);border-radius:8px;padding:6px 16px;margin-bottom:12px;">
          <span style="color:#D12BF2;font-size:13px;font-weight:600;letter-spacing:0.05em;">📅 CONVITE DE REUNIÃO</span>
        </div>
        <h1 style="margin:0;color:#F5F5F7;font-size:22px;font-weight:700;line-height:1.3;">${data.meetingTitle}</h1>
      </div>

      <!-- Body -->
      <div style="padding:32px 40px;">

        <!-- Data e hora -->
        <div style="background:rgba(0,228,242,0.06);border:1px solid rgba(0,228,242,0.2);border-radius:12px;padding:20px 24px;margin-bottom:24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:12px;">
                <span style="color:#a0a0b0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">📅 Data e Horário</span><br/>
                <span style="color:#F5F5F7;font-size:16px;font-weight:600;text-transform:capitalize;">${startFormatted}${duration}</span>
              </td>
            </tr>
            ${data.callLink ? `
            <tr>
              <td style="padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);">
                <span style="color:#a0a0b0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">🎥 Link da Call</span><br/>
                <a href="${data.callLink}" style="color:#00E4F2;font-size:15px;font-weight:500;text-decoration:none;word-break:break-all;">${data.callLink}</a>
              </td>
            </tr>` : ''}
          </table>
        </div>

        ${data.description ? `
        <!-- Descrição -->
        <div style="margin-bottom:24px;">
          <p style="margin:0 0 8px;color:#a0a0b0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">📝 Pauta</p>
          <p style="margin:0;color:#d1d5db;font-size:15px;line-height:1.7;white-space:pre-wrap;">${data.description}</p>
        </div>` : ''}

        <!-- Botão de entrar na call -->
        ${data.callLink ? `
        <div style="text-align:center;margin:28px 0;">
          <a href="${data.callLink}" style="display:inline-block;background:linear-gradient(135deg,#D12BF2,#a020c0);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:16px;font-weight:700;letter-spacing:0.02em;">
            Entrar na Reunião →
          </a>
        </div>` : ''}

        <!-- Organizador -->
        <p style="margin:24px 0 0;color:#6b7280;font-size:13px;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
          Convite enviado por <strong style="color:#a0a0b0;">${data.organizerName}</strong> via CodeCraft Gen-Z
        </p>
      </div>

      <!-- Footer -->
      <div style="background:rgba(255,255,255,0.02);padding:16px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
        <p style="color:#4b5563;font-size:12px;margin:0;">© ${new Date().getFullYear()} CodeCraft Gen-Z · <a href="https://codecraftgenz.com.br" style="color:#6366f1;text-decoration:none;">codecraftgenz.com.br</a></p>
      </div>

    </div>
  </div>
</body>
</html>`;

    // Dispara para todos os recipients em paralelo — fire and forget
    await Promise.allSettled(
      data.recipients.map(recipient =>
        transporter.sendMail({
          from: `"CodeCraft Gen-Z" <${teamEmail}>`,
          to: recipient.email,
          subject: `📅 Reunião: ${data.meetingTitle}`,
          text: `Olá ${recipient.name},\n\nVocê foi convidado(a) para a reunião "${data.meetingTitle}".\n\nData: ${startFormatted}${duration}\n${data.callLink ? `\nLink: ${data.callLink}` : ''}\n${data.description ? `\nPauta: ${data.description}` : ''}\n\nEquipe CodeCraft Gen-Z`,
          html: html.replace('</h1>', `</h1>`), // html já pronto
        }).then(info => {
          logger.info({ messageId: info.messageId, to: recipient.email }, 'Meeting invite sent');
        }).catch(err => {
          logger.warn({ err, to: recipient.email }, 'Failed to send meeting invite');
        })
      )
    );
  },

  /**
   * Envia email de redefinição de senha
   */
  async sendPasswordReset(data: { to: string; name: string; resetLink: string }): Promise<boolean> {
    const transporter = createTransporter();
    if (!transporter) {
      logger.warn({ email: data.to }, 'Password reset email not sent - credentials not configured');
      return false;
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Inter',system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#1a1a2e,#0d0d1a);border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
      <div style="background:linear-gradient(135deg,#6366f1,#D12BF2);padding:32px 40px;text-align:center;">
        <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0;">🔒 Redefinição de Senha</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">CodeCraft Gen-Z</p>
      </div>
      <div style="padding:32px 40px;">
        <p style="color:#e0e0e0;font-size:15px;margin:0 0 16px;">Olá, <strong>${data.name}</strong></p>
        <p style="color:#a0a0b0;font-size:14px;margin:0 0 24px;">Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha. O link é válido por <strong style="color:#e0e0e0;">1 hora</strong>.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${data.resetLink}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#D12BF2);color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">Redefinir Senha</a>
        </div>
        <p style="color:#6b7280;font-size:12px;margin:24px 0 0;">Se você não solicitou a redefinição de senha, ignore este email — sua senha permanece a mesma.</p>
        <p style="color:#6b7280;font-size:12px;margin:8px 0 0;">Caso o botão não funcione, copie e cole este link no navegador:<br><a href="${data.resetLink}" style="color:#6366f1;word-break:break-all;">${data.resetLink}</a></p>
      </div>
      <div style="background:rgba(255,255,255,0.02);padding:16px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
        <p style="color:#4b5563;font-size:12px;margin:0;">© ${new Date().getFullYear()} CodeCraft Gen-Z · <a href="https://codecraftgenz.com.br" style="color:#6366f1;text-decoration:none;">codecraftgenz.com.br</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

    try {
      const info = await transporter.sendMail({
        from: `"CodeCraft Gen-Z" <${env.EMAIL_USER}>`,
        to: data.to,
        subject: '🔒 Redefinição de senha — CodeCraft Gen-Z',
        text: `Olá ${data.name},\n\nClique no link abaixo para redefinir sua senha (válido por 1 hora):\n${data.resetLink}\n\nSe você não solicitou, ignore este email.\n\nEquipe CodeCraft Gen-Z`,
        html,
      });
      logger.info({ messageId: info.messageId, to: data.to }, 'Password reset email sent');
      return true;
    } catch (err) {
      logger.warn({ err, to: data.to }, 'Failed to send password reset email');
      return false;
    }
  },
};
