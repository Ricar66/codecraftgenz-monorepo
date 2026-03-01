-- CreateTable: ideias
CREATE TABLE `ideias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(256) NOT NULL,
    `descricao` TEXT NOT NULL,
    `autorId` INTEGER NULL,
    `autorNome` VARCHAR(256) NULL,
    `votos` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(32) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ideias_autorId_idx`(`autorId`),
    INDEX `ideias_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: ideia_comentarios
CREATE TABLE `ideia_comentarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ideiaId` INTEGER NOT NULL,
    `autorId` INTEGER NULL,
    `autorNome` VARCHAR(256) NULL,
    `texto` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ideia_comentarios_ideiaId_idx`(`ideiaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ideia_comentarios` ADD CONSTRAINT `ideia_comentarios_ideiaId_fkey` FOREIGN KEY (`ideiaId`) REFERENCES `ideias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
