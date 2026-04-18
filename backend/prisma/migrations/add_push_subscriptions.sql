-- Migration: Add push_subscriptions table for PWA push notifications
-- Run manually on the production database: mysql < add_push_subscriptions.sql

CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `userId`    INT          NOT NULL,
  `endpoint`  TEXT         NOT NULL,
  `p256dh`    TEXT         NOT NULL,
  `auth`      VARCHAR(255) NOT NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `push_subscriptions_endpoint_key` (`endpoint`(500)),
  KEY `push_subscriptions_userId_idx` (`userId`),
  CONSTRAINT `push_subscriptions_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
