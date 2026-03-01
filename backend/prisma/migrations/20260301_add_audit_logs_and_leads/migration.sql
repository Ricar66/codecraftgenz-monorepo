-- CreateTable: audit_logs
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `userName` VARCHAR(256) NULL,
    `action` VARCHAR(32) NOT NULL,
    `entity` VARCHAR(128) NOT NULL,
    `entityId` VARCHAR(64) NULL,
    `endpoint` VARCHAR(512) NOT NULL,
    `method` VARCHAR(10) NOT NULL,
    `statusCode` INTEGER NULL,
    `oldData` TEXT NULL,
    `newData` TEXT NULL,
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(512) NULL,
    `duration` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_entity_idx`(`entity`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: leads
CREATE TABLE `leads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(256) NULL,
    `email` VARCHAR(256) NOT NULL,
    `telefone` VARCHAR(32) NULL,
    `origin` VARCHAR(64) NOT NULL,
    `originId` INTEGER NULL,
    `originRef` VARCHAR(256) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'new',
    `metadata` TEXT NULL,
    `utmSource` VARCHAR(256) NULL,
    `utmMedium` VARCHAR(256) NULL,
    `utmCampaign` VARCHAR(256) NULL,
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(512) NULL,
    `convertedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `leads_email_idx`(`email`),
    INDEX `leads_origin_idx`(`origin`),
    INDEX `leads_status_idx`(`status`),
    INDEX `leads_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
