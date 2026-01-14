import { Router } from 'express';
import { licenseController } from '../controllers/license.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import {
  activateDeviceSchema,
  verifyLicenseSchema,
  claimByEmailSchema,
  purchasesByEmailSchema,
  downloadByEmailSchema,
} from '../schemas/license.schema.js';

const router = Router();

// Rotas públicas com rate limit
router.post(
  '/public/license/activate-device',
  rateLimiter.sensitive,
  validate(activateDeviceSchema),
  licenseController.activateDevice
);

// Ativação de licença com autenticação (gera assinatura RSA)
router.post(
  '/licenses/activate',
  authenticate,
  rateLimiter.sensitive,
  licenseController.activateAuthenticated
);

router.post(
  '/verify-license',
  rateLimiter.sensitive,
  validate(verifyLicenseSchema),
  licenseController.verifyLicense
);

// Compatibilidade com formato antigo
router.get(
  '/compat/license-check',
  rateLimiter.sensitive,
  licenseController.compatLicenseCheck
);

router.post(
  '/compat/license-check',
  rateLimiter.sensitive,
  licenseController.compatLicenseCheck
);

// Resgatar licenças por email
router.post(
  '/licenses/claim-by-email',
  rateLimiter.sensitive,
  validate(claimByEmailSchema),
  licenseController.claimByEmail
);

// Buscar compras por email
router.get(
  '/purchases/by-email',
  rateLimiter.sensitive,
  validate(purchasesByEmailSchema),
  licenseController.getPurchasesByEmail
);

// Download por email
router.post(
  '/apps/:id/download/by-email',
  rateLimiter.sensitive,
  validate(downloadByEmailSchema),
  licenseController.downloadByEmail
);

// Download autenticado
router.post(
  '/apps/:id/download',
  authenticate,
  rateLimiter.sensitive,
  licenseController.downloadAuthenticated
);

export default router;
