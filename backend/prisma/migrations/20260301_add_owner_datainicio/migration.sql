-- AlterTable: add owner and dataInicio to projetos
ALTER TABLE `projetos` ADD COLUMN `owner` VARCHAR(256) NULL;
ALTER TABLE `projetos` ADD COLUMN `dataInicio` VARCHAR(191) NULL;
