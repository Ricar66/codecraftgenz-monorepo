-- Fix avatarUrl columns to support Base64 images
-- This migration changes VARCHAR(191) to TEXT to allow storing Base64 data URLs

-- Mentors table
ALTER TABLE `mentores` MODIFY COLUMN `avatarUrl` TEXT NULL;
ALTER TABLE `mentores` MODIFY COLUMN `bio` TEXT NULL;

-- Crafters table
ALTER TABLE `crafters` MODIFY COLUMN `avatarUrl` TEXT NULL;
ALTER TABLE `crafters` MODIFY COLUMN `bio` TEXT NULL;
ALTER TABLE `crafters` MODIFY COLUMN `skillsJson` TEXT NULL;
