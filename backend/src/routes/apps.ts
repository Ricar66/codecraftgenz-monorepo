import { Router, Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { appController } from '../controllers/app.controller.js';
import { paymentController } from '../controllers/payment.controller.js';
import { licenseController } from '../controllers/license.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
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
  limits: { fileSize: 512 * 1024 * 1024 }, // 512MB
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

// Webhook do Mercado Pago (para apps)
router.post('/webhook', rateLimiter.sensitive, appController.webhook);
router.get('/webhook', appController.webhookVerify);

// =============================================
// ROTAS DE PAGAMENTO (compatibilidade com server.js)
// =============================================

// Compra via preferência MP (redireciona para checkout)
router.post(
  '/:id/purchase',
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

// Último pagamento do app
router.get('/:id/payment/last', paymentController.getLastByApp);

// Pagamento direto (cartão, PIX, boleto - sem redirecionamento)
router.post(
  '/:id/payment/direct',
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

export default router;
