-- =============================================
-- CRIAÇÃO DAS NOVAS TABELAS - CodeCraft Gen-Z
-- Execute este script no MySQL da Hostinger
-- =============================================

-- 1. Tabela de Finanças
CREATE TABLE IF NOT EXISTS `financas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `item` VARCHAR(255) NOT NULL,
  `valor` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(50) DEFAULT 'pending',
  `type` VARCHAR(50) DEFAULT 'other',
  `projectId` INT DEFAULT NULL,
  `progress` INT DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `financas_projectId_idx` (`projectId`),
  CONSTRAINT `financas_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projetos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Auditoria do Ranking
CREATE TABLE IF NOT EXISTS `ranking_audit` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `action` VARCHAR(255) NOT NULL,
  `crafterId` INT DEFAULT NULL,
  `userId` INT DEFAULT NULL,
  `oldValue` TEXT DEFAULT NULL,
  `newValue` TEXT DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ranking_audit_crafterId_idx` (`crafterId`),
  INDEX `ranking_audit_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Configurações do Ranking
CREATE TABLE IF NOT EXISTS `ranking_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `filtersJson` TEXT DEFAULT NULL,
  `settingsJson` TEXT DEFAULT NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Verificar se tabela ranking_top3 existe (criar se não existir)
CREATE TABLE IF NOT EXISTS `ranking_top3` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `crafterId` INT NOT NULL,
  `position` INT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ranking_top3_crafterId_idx` (`crafterId`),
  CONSTRAINT `ranking_top3_crafterId_fkey` FOREIGN KEY (`crafterId`) REFERENCES `crafters` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- INSERIR CONFIGURAÇÃO INICIAL DO RANKING
-- =============================================
INSERT INTO `ranking_settings` (`id`, `filtersJson`, `settingsJson`)
VALUES (1, '{}', '{}')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- =============================================
-- VERIFICAÇÃO
-- =============================================
-- Execute para verificar se as tabelas foram criadas:
-- SHOW TABLES LIKE 'financas';
-- SHOW TABLES LIKE 'ranking_%';
-- DESCRIBE financas;
-- DESCRIBE ranking_audit;
-- DESCRIBE ranking_settings;
