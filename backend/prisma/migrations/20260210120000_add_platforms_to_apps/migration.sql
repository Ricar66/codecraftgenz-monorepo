-- AlterTable: Add platforms column to apps table
ALTER TABLE `apps` ADD COLUMN `platforms` VARCHAR(191) NULL DEFAULT 'windows';
