-- LGPD - aceite de termos de uso/privacidade no User
-- NÃO aplicar via prisma migrate deploy: o projeto usa `prisma db push` em produção.
-- Esta migration serve como histórico/referência.

ALTER TABLE `users` ADD COLUMN `termsAcceptedAt` DATETIME(3) NULL;
ALTER TABLE `users` ADD COLUMN `privacyVersion` VARCHAR(20) NULL;
