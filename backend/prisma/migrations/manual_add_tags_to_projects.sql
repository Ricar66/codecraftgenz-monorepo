-- Migration: Add tagsJson column to projetos table
-- Run this SQL in your production MySQL database

ALTER TABLE `projetos` ADD COLUMN `tagsJson` VARCHAR(1000) NULL AFTER `thumbUrl`;

-- If the column already exists, use this instead:
-- ALTER TABLE `projetos` MODIFY COLUMN `tagsJson` VARCHAR(1000) NULL;
