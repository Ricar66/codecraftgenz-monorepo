import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import {
  purchaseSchema,
  updatePaymentSchema,
  searchPaymentsSchema,
} from '../schemas/payment.schema.js';

const router = Router();

// Webhook do Mercado Pago (público, mas com rate limit)
router.post('/webhook', rateLimiter.sensitive, paymentController.webhook);

// Rotas de compra (com rate limit)
router.post(
  '/apps/:id/purchase',
  rateLimiter.sensitive,
  validate(purchaseSchema),
  paymentController.purchase
);

router.get(
  '/apps/:id/purchase/status',
  rateLimiter.sensitive,
  paymentController.getPurchaseStatus
);

router.get('/apps/:id/payment/last', paymentController.getLastByApp);

// Rotas admin
router.get(
  '/search',
  authenticate,
  authorizeAdmin,
  validate(searchPaymentsSchema),
  paymentController.search
);

router.get(
  '/:id',
  authenticate,
  authorizeAdmin,
  paymentController.getById
);

router.put(
  '/:id',
  authenticate,
  authorizeAdmin,
  validate(updatePaymentSchema),
  paymentController.updateStatus
);

router.get(
  '/admin/app-payments',
  authenticate,
  authorizeAdmin,
  paymentController.getAppPaymentsAdmin
);

router.get(
  '/admin/app-payments/:pid',
  authenticate,
  authorizeAdmin,
  paymentController.getAppPaymentById
);

export default router;
