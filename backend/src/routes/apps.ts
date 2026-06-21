import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { prisma } from '../db/prisma.js';
import { appController } from '../controllers/app.controller.js';
import { paymentController } from '../controllers/payment.controller.js';
import { licenseController } from '../controllers/license.controller.js';
import { authenticate, authorizeAdmin, optionalAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import {
  createAppSchema,
  updateAppSchema,
  appIdSchema,
  feedbackSchema,
  createFromProjectSchema,
} from '../schemas/app.schema.js';
import {
  purchaseSchema,
  directPaymentSchema,
} from '../schemas/payment.schema.js';
import { downloadByEmailSchema } from '../schemas/license.schema.js';

const router = Router();

// Configuração do multer para upload de executáveis
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 }, // 150MB
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedMimes = [
      'application/x-msdownload',
      'application/x-msi',
      'application/zip',
      'application/x-7z-compressed',
      'application/octet-stream',
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(exe|msi|zip|7z)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use .exe, .msi, .zip ou .7z'));
    }
  },
});

// Rotas públicas
router.get('/public', appController.getPublic);
router.get('/history', appController.getHistory);
router.get('/:id', validate(appIdSchema), appController.getById);

// Rotas autenticadas
router.get('/mine', authenticate, appController.getMine);

router.post(
  '/:id/feedback',
  authenticate,
  validate(feedbackSchema),
  appController.addFeedback
);

// Rotas admin
router.get('/', authenticate, authorizeAdmin, appController.getAll);

router.post(
  '/',
  authenticate,
  authorizeAdmin,
  validate(createAppSchema),
  appController.create
);

router.post(
  '/from-project/:projectId',
  authenticate,
  authorizeAdmin,
  validate(createFromProjectSchema),
  appController.createFromProject
);

router.put(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(updateAppSchema),
  appController.update
);

router.delete(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(appIdSchema),
  appController.delete
);

// Upload de executável
router.post(
  '/:id/executable/upload',
  authenticate,
  authorizeAdmin,
  upload.single('file'),
  appController.uploadExecutable
);

// Rota de dev para inserção rápida
router.post(
  '/dev/insert',
  authenticate,
  authorizeAdmin,
  appController.devInsert
);

// Webhook do Mercado Pago — delega ao handler com validação HMAC
// NOTA: paymentController.webhook valida x-signature antes de processar
router.post('/webhook', rateLimiter.sensitive, paymentController.webhook);
router.get('/webhook', appController.webhookVerify);

// =============================================
// ROTAS DE PAGAMENTO (compatibilidade com server.js)
// =============================================

// Compra (checkout hospedado Asaas). Público: visitante anônimo precisa conseguir comprar.
// optionalAuth = se logado, vincula a compra ao usuário; se anônimo, segue com dados do form.
router.post(
  '/:id/purchase',
  optionalAuth,
  rateLimiter.sensitive,
  validate(purchaseSchema),
  paymentController.purchase
);

// Status da compra
router.get(
  '/:id/purchase/status',
  rateLimiter.sensitive,
  paymentController.getPurchaseStatus
);

// Último pagamento do app (admin only — expõe dados de payment)
router.get('/:id/payment/last', authenticate, authorizeAdmin, paymentController.getLastByApp);

// Pagamento direto (cartão, PIX, boleto - sem redirecionamento). Público (compra anônima).
router.post(
  '/:id/payment/direct',
  optionalAuth,
  rateLimiter.sensitive,
  validate(directPaymentSchema),
  paymentController.directPayment
);

// =============================================
// ROTAS DE DOWNLOAD (público após pagamento)
// =============================================

// Download por email
router.post(
  '/:id/download/by-email',
  rateLimiter.sensitive,
  validate(downloadByEmailSchema),
  licenseController.downloadByEmail
);

// Download por payment_id (para retorno do MP)
router.post(
  '/:id/download/by-payment',
  rateLimiter.sensitive,
  licenseController.downloadByPaymentId
);

// Download público (aceita email ou payment_id no body)
router.post(
  '/:id/download',
  rateLimiter.sensitive,
  licenseController.downloadPublic
);

// Reenviar email de confirmação de compra
router.post(
  '/:id/resend-email',
  rateLimiter.sensitive,
  paymentController.resendConfirmationEmail
);

// =============================================
// RELEASE — publicação de nova versão (auto-update)
// =============================================
router.post(
  '/:id/release',
  authenticate,
  authorizeAdmin,
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { version, executableUrl, changelog, signature, slug } = req.body ?? {};

    if (!version || typeof version !== 'string') {
      return res.status(400).json({ error: 'Campo "version" é obrigatório' });
    }
    if (!executableUrl || typeof executableUrl !== 'string') {
      return res.status(400).json({ error: 'Campo "executableUrl" é obrigatório' });
    }

    // Semver validation (ex: 1.2.0 ou 1.2.0.0)
    const SEMVER_RE = /^\d+\.\d+\.\d+(\.\d+)?(-[a-zA-Z0-9.]+)?$/;
    if (!SEMVER_RE.test(version)) {
      return res.status(400).json({ error: 'version deve ser semver: ex: 1.2.0 ou 1.2.0.0' });
    }

    // executableUrl — somente HTTPS e domínio codecraftgenz.com.br
    const ALLOWED_DOWNLOAD_ORIGINS = [
      'https://codecraftgenz.com.br',
      'https://files.codecraftgenz.com.br',
    ];
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(executableUrl);
    } catch {
      return res.status(400).json({ error: 'executableUrl inválida' });
    }
    if (parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'executableUrl deve usar HTTPS' });
    }
    if (!ALLOWED_DOWNLOAD_ORIGINS.some(o => parsedUrl.origin === o)) {
      return res.status(400).json({ error: 'executableUrl fora do domínio permitido (codecraftgenz.com.br)' });
    }

    const data: {
      version: string;
      executableUrl: string;
      changelog: string | null;
      signature: string | null;
      releaseDate: Date;
      slug?: string;
    } = {
      version,
      executableUrl,
      changelog: typeof changelog === 'string' ? changelog : null,
      signature: typeof signature === 'string' ? signature : null,
      releaseDate: new Date(),
    };

    // Slug validation — apenas letras minúsculas, números e hífens
    const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;
    if (typeof slug === 'string' && slug.trim().length > 0) {
      const normalizedSlug = slug.trim().toLowerCase();
      if (!SLUG_RE.test(normalizedSlug)) {
        return res.status(400).json({ error: 'slug inválido — use apenas letras minúsculas, números e hífens' });
      }
      data.slug = normalizedSlug;
    }

    try {
      const updated = await prisma.app.update({
        where: { id },
        data,
      });
      return res.json({
        id: updated.id,
        name: updated.name,
        version: updated.version,
        slug: updated.slug,
        executableUrl: updated.executableUrl,
        releaseDate: updated.releaseDate,
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'P2025') {
        return res.status(404).json({ error: 'App não encontrado' });
      }
      if (code === 'P2002') {
        return res.status(409).json({ error: 'Slug já está em uso' });
      }
      throw err;
    }
  }
);

export default router;
