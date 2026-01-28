// Script para enviar email de teste
// Execute com: node send-test-email.js

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.error('ERRO: EMAIL_USER e EMAIL_PASS devem estar configurados no .env');
  process.exit(1);
}

console.log('Configurando transporter com:', EMAIL_USER);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Compra Confirmada - CodeCraft Gen-Z</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background-color: #0d0d1a;">
  <table width="100%" style="background-color: #0d0d1a; padding: 40px 20px;">
    <tr>
      <td>
        <table width="600" style="margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 40px; text-align: center; border-bottom: 2px solid #D12BF2;">
              <img src="https://codecraftgenz.com.br/assets/logoofficial.png" alt="CodeCraft Gen-Z" style="max-width: 280px; height: auto; margin-bottom: 20px;" />
              <h1 style="margin: 0; color: #00E4F2; font-size: 28px;">Compra Confirmada!</h1>
              <p style="margin: 8px 0 0; color: #D12BF2; font-size: 16px;">Seu aplicativo está pronto para download</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px;">
              <p style="color: #ffffff; font-size: 18px;">Olá, <strong style="color: #00E4F2;">Ricardo</strong>!</p>
              <p style="color: #b0b0b0; font-size: 15px;">Este é um email de teste do sistema de compras da CodeCraft Gen-Z.</p>

              <table width="100%" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px; margin: 20px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0; color: #00E4F2; font-size: 12px; text-transform: uppercase;">Aplicativo</p>
                    <h2 style="margin: 4px 0 0; color: #ffffff; font-size: 24px;">App de Teste</h2>
                    <p style="margin: 4px 0 0; color: #888;">Versão 1.0.0</p>
                  </td>
                  <td style="text-align: right; padding: 24px;">
                    <p style="margin: 0; color: #00E4F2; font-size: 24px; font-weight: bold;">R$ 29,90</p>
                  </td>
                </tr>
              </table>

              <div style="text-align: center; margin: 24px 0;">
                <a href="https://codecraftgenz.com.br" style="display: inline-block; background: linear-gradient(135deg, #D12BF2 0%, #9B1FD4 100%); color: #fff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 18px; font-weight: bold;">
                  ⬇️ Baixar Agora
                </a>
              </div>

              <table width="100%" style="background-color: #0d0d1a; border-radius: 12px; border: 1px solid #333; margin-top: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 16px; color: #00E4F2; font-weight: bold;">Detalhes da Compra</p>
                    <table width="100%">
                      <tr>
                        <td style="padding: 8px 0; color: #888; border-bottom: 1px solid #333;">ID do Pedido:</td>
                        <td style="padding: 8px 0; color: #fff; text-align: right; border-bottom: 1px solid #333;">TEST-${Date.now()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #888; border-bottom: 1px solid #333;">Data:</td>
                        <td style="padding: 8px 0; color: #fff; text-align: right; border-bottom: 1px solid #333;">${new Date().toLocaleString('pt-BR')}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #888;">Chave de Licença:</td>
                        <td style="padding: 8px 0; color: #D12BF2; text-align: right; font-family: monospace;">TEST-XXXX-XXXX-XXXX</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background: linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 100%); padding: 32px 40px; text-align: center; border-top: 1px solid #333;">
              <img src="https://codecraftgenz.com.br/assets/logoofficial.png" alt="CodeCraft Gen-Z" style="max-width: 150px; opacity: 0.8; margin-bottom: 16px;" />
              <p style="margin: 0; color: #D12BF2; font-size: 14px;">Transformando ideias em código</p>
              <p style="margin: 16px 0 0; color: #666; font-size: 11px;">© ${new Date().getFullYear()} CodeCraft Gen-Z. Todos os direitos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

async function sendTestEmail() {
  try {
    console.log('Verificando conexão SMTP...');
    await transporter.verify();
    console.log('Conexão SMTP OK!');

    console.log('Enviando email de teste para: ricardocoradini97@gmail.com');

    const info = await transporter.sendMail({
      from: `"CodeCraft Gen-Z" <${EMAIL_USER}>`,
      to: 'ricardocoradini97@gmail.com',
      subject: '✅ [TESTE] Compra Confirmada - App de Teste',
      html: emailHtml,
      text: `
COMPRA CONFIRMADA - CODECRAFT GEN-Z (TESTE)
============================================

Olá, Ricardo!

Este é um email de teste do sistema de compras.

Aplicativo: App de Teste
Versão: 1.0.0
Valor: R$ 29,90

ID do Pedido: TEST-${Date.now()}
Data: ${new Date().toLocaleString('pt-BR')}
Chave de Licença: TEST-XXXX-XXXX-XXXX

---
CodeCraft Gen-Z
https://codecraftgenz.com.br
      `,
    });

    console.log('✅ Email enviado com sucesso!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
  }
}

sendTestEmail();
