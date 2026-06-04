-- AlterTable
ALTER TABLE `apps` ADD COLUMN `originalPrice` DECIMAL(10, 2) NULL;

-- CreateTable
CREATE TABLE `panel_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(190) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ativo',
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `panel_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `panel_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `ip` VARCHAR(45) NULL,
    `userAgent` VARCHAR(255) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `panel_sessions_tokenHash_key`(`tokenHash`),
    INDEX `panel_sessions_userId_idx`(`userId`),
    INDEX `panel_sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `panel_tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `delegatedById` INTEGER NOT NULL,
    `delegatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
    `tags` VARCHAR(500) NULL,
    `status` ENUM('PENDING', 'DONE') NOT NULL DEFAULT 'PENDING',
    `completedAt` DATETIME(3) NULL,
    `completedBy` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `panel_tasks_status_priority_idx`(`status`, `priority`),
    INDEX `panel_tasks_delegatedById_idx`(`delegatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `panel_task_assignees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `taskId` INTEGER NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `panel_task_assignees_email_idx`(`email`),
    UNIQUE INDEX `panel_task_assignees_taskId_email_key`(`taskId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `panel_task_checklist_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `taskId` INTEGER NOT NULL,
    `content` VARCHAR(300) NOT NULL,
    `done` BOOLEAN NOT NULL DEFAULT false,
    `doneAt` DATETIME(3) NULL,
    `doneBy` VARCHAR(120) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `panel_task_checklist_items_taskId_position_idx`(`taskId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `panel_task_comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `taskId` INTEGER NOT NULL,
    `authorId` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `panel_task_comments_taskId_idx`(`taskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `panel_task_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `taskId` INTEGER NOT NULL,
    `uploaderId` INTEGER NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `storedAs` VARCHAR(255) NOT NULL,
    `mimetype` VARCHAR(120) NOT NULL,
    `size` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `panel_task_attachments_storedAs_key`(`storedAs`),
    INDEX `panel_task_attachments_taskId_idx`(`taskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `panel_sessions` ADD CONSTRAINT `panel_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `panel_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `panel_tasks` ADD CONSTRAINT `panel_tasks_delegatedById_fkey` FOREIGN KEY (`delegatedById`) REFERENCES `panel_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `panel_task_assignees` ADD CONSTRAINT `panel_task_assignees_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `panel_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `panel_task_checklist_items` ADD CONSTRAINT `panel_task_checklist_items_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `panel_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `panel_task_comments` ADD CONSTRAINT `panel_task_comments_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `panel_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `panel_task_comments` ADD CONSTRAINT `panel_task_comments_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `panel_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `panel_task_attachments` ADD CONSTRAINT `panel_task_attachments_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `panel_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `panel_task_attachments` ADD CONSTRAINT `panel_task_attachments_uploaderId_fkey` FOREIGN KEY (`uploaderId`) REFERENCES `panel_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

