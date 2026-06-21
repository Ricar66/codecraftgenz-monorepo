-- Migration: Add site_reviews table for public site feedback / opinions
-- Run manually on the production database: mysql < add_site_reviews.sql

CREATE TABLE IF NOT EXISTS `site_reviews` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `nome`      VARCHAR(120) DEFAULT NULL,
  `email`     VARCHAR(180) DEFAULT NULL,
  `tipo`      VARCHAR(24)  NOT NULL,
  `nota`      INT          NOT NULL,
  `mensagem`  TEXT         NOT NULL,
  `ref`       VARCHAR(40)  DEFAULT NULL,
  `ip`        VARCHAR(64)  DEFAULT NULL,
  `userAgent` VARCHAR(255) DEFAULT NULL,
  `lida`      BOOLEAN      NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `site_reviews_createdAt_idx` (`createdAt`),
  KEY `site_reviews_lida_idx` (`lida`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
