-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'viewer',
    `status` VARCHAR(191) NOT NULL DEFAULT 'ativo',
    `isGuest` BOOLEAN NOT NULL DEFAULT false,
    `mfaEnabled` BOOLEAN NOT NULL DEFAULT false,
    `mfaSecret` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_resets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_resets_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projetos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ativo',
    `preco` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `progresso` INTEGER NOT NULL DEFAULT 0,
    `thumbUrl` VARCHAR(191) NULL,
    `mentorId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `apps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `shortDescription` VARCHAR(191) NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `category` VARCHAR(191) NULL,
    `tags` VARCHAR(191) NULL,
    `thumbUrl` VARCHAR(191) NULL,
    `screenshots` VARCHAR(191) NULL,
    `executableUrl` VARCHAR(191) NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT '1.0.0',
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `downloadCount` INTEGER NOT NULL DEFAULT 0,
    `creatorId` INTEGER NOT NULL,
    `projectId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_payments` (
    `id` VARCHAR(191) NOT NULL,
    `appId` INTEGER NOT NULL,
    `userId` INTEGER NULL,
    `preferenceId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'BRL',
    `payerEmail` VARCHAR(191) NULL,
    `payerName` VARCHAR(191) NULL,
    `mpResponseJson` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `app_payments_appId_status_idx`(`appId`, `status`),
    INDEX `app_payments_payerEmail_idx`(`payerEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_licenses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `appId` INTEGER NOT NULL,
    `userId` INTEGER NULL,
    `email` VARCHAR(191) NOT NULL,
    `hardwareId` VARCHAR(191) NULL,
    `licenseKey` VARCHAR(191) NULL,
    `appName` VARCHAR(191) NULL,
    `activatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_licenses_appId_email_idx`(`appId`, `email`),
    INDEX `user_licenses_appId_email_hardwareId_idx`(`appId`, `email`, `hardwareId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `license_activations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `appId` INTEGER NOT NULL,
    `email` VARCHAR(191) NULL,
    `hardwareId` VARCHAR(191) NULL,
    `licenseId` INTEGER NULL,
    `action` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `license_activations_appId_email_idx`(`appId`, `email`),
    INDEX `license_activations_hardwareId_idx`(`hardwareId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crafters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `bio` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `githubUrl` VARCHAR(191) NULL,
    `linkedinUrl` VARCHAR(191) NULL,
    `skillsJson` VARCHAR(191) NULL,
    `pontos` INTEGER NOT NULL DEFAULT 0,
    `equipeId` INTEGER NULL,
    `userId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `crafters_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `equipes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ativo',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ranking_top3` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `crafterId` INTEGER NOT NULL,
    `position` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ranking_audit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(191) NOT NULL,
    `crafterId` INTEGER NULL,
    `userId` INTEGER NULL,
    `oldValue` VARCHAR(191) NULL,
    `newValue` VARCHAR(191) NULL,
    `details` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ranking_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `filtersJson` VARCHAR(191) NULL,
    `settingsJson` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mentores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `bio` VARCHAR(191) NULL,
    `especialidade` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `linkedinUrl` VARCHAR(191) NULL,
    `githubUrl` VARCHAR(191) NULL,
    `disponivel` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inscricoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NULL,
    `mensagem` VARCHAR(191) NULL,
    `projetoId` INTEGER NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'geral',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pendente',
    `notas` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `desafios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `objective` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `difficulty` VARCHAR(191) NOT NULL DEFAULT 'medio',
    `deadline` DATETIME(3) NULL,
    `reward` DECIMAL(10, 2) NULL,
    `basePoints` INTEGER NOT NULL DEFAULT 100,
    `tagsJson` VARCHAR(191) NULL,
    `deliveryType` VARCHAR(191) NOT NULL DEFAULT 'link',
    `thumbUrl` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `challenge_submissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `desafioId` INTEGER NOT NULL,
    `oderId` INTEGER NOT NULL,
    `deliveryUrl` VARCHAR(191) NULL,
    `deliveryText` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'subscribed',
    `score` INTEGER NULL,
    `reviewFeedback` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `challenge_submissions_desafioId_oderId_key`(`desafioId`, `oderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(191) NULL DEFAULT 'pending',
    `type` VARCHAR(191) NULL DEFAULT 'other',
    `projectId` INTEGER NULL,
    `progress` INTEGER NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feedbacks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `appId` INTEGER NULL,
    `rating` INTEGER NOT NULL,
    `comment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `password_resets` ADD CONSTRAINT `password_resets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projetos` ADD CONSTRAINT `projetos_mentorId_fkey` FOREIGN KEY (`mentorId`) REFERENCES `mentores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `apps` ADD CONSTRAINT `apps_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `apps` ADD CONSTRAINT `apps_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projetos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `app_payments` ADD CONSTRAINT `app_payments_appId_fkey` FOREIGN KEY (`appId`) REFERENCES `apps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `app_payments` ADD CONSTRAINT `app_payments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_licenses` ADD CONSTRAINT `user_licenses_appId_fkey` FOREIGN KEY (`appId`) REFERENCES `apps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_licenses` ADD CONSTRAINT `user_licenses_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `license_activations` ADD CONSTRAINT `license_activations_licenseId_fkey` FOREIGN KEY (`licenseId`) REFERENCES `user_licenses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crafters` ADD CONSTRAINT `crafters_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `equipes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crafters` ADD CONSTRAINT `crafters_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ranking_top3` ADD CONSTRAINT `ranking_top3_crafterId_fkey` FOREIGN KEY (`crafterId`) REFERENCES `crafters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscricoes` ADD CONSTRAINT `inscricoes_projetoId_fkey` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challenge_submissions` ADD CONSTRAINT `challenge_submissions_desafioId_fkey` FOREIGN KEY (`desafioId`) REFERENCES `desafios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challenge_submissions` ADD CONSTRAINT `challenge_submissions_oderId_fkey` FOREIGN KEY (`oderId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financas` ADD CONSTRAINT `financas_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projetos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedbacks` ADD CONSTRAINT `feedbacks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedbacks` ADD CONSTRAINT `feedbacks_appId_fkey` FOREIGN KEY (`appId`) REFERENCES `apps`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
