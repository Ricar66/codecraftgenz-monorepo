-- Migration: add_metas_module
-- Run this on the production database after deploying the new backend code.

-- SystemConfig table (multi-purpose key-value store)
CREATE TABLE IF NOT EXISTS `system_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(128) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `system_config_key_key`(`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Metas (Goals) table
CREATE TABLE IF NOT EXISTS `metas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(256) NOT NULL,
    `description` TEXT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
    `type` VARCHAR(32) NOT NULL DEFAULT 'goal',
    `callLink` VARCHAR(1024) NULL,
    `googleEventId` VARCHAR(256) NULL,
    `color` VARCHAR(16) NOT NULL DEFAULT '#D12BF2',
    `authorId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `metas_startDate_idx`(`startDate`),
    INDEX `metas_status_idx`(`status`),
    INDEX `metas_authorId_idx`(`authorId`),
    CONSTRAINT `metas_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Meta Observations
CREATE TABLE IF NOT EXISTS `meta_observations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `metaId` INTEGER NOT NULL,
    `authorId` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `meta_observations_metaId_idx`(`metaId`),
    CONSTRAINT `meta_observations_metaId_fkey` FOREIGN KEY (`metaId`) REFERENCES `metas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `meta_observations_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Meta Assignees (N:N)
CREATE TABLE IF NOT EXISTS `meta_assignees` (
    `metaId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    PRIMARY KEY (`metaId`, `userId`),
    CONSTRAINT `meta_assignees_metaId_fkey` FOREIGN KEY (`metaId`) REFERENCES `metas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `meta_assignees_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
