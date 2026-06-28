-- Migration: drop_crafters_archive
-- Data: 2026-06-27
-- Decisao de produto: remover toda a vertical Comunidade Craft (Crafters, Desafios, Mentorias,
--                     Equipes, Inscricoes, Ranking, Ideias). Backup completo salvo em
--                     /var/backups/codecraft/crafters-archive-20260628-001118.sql (VPS).
-- Histórico do que existia: docs/CRAFTERS-ARCHIVE.md (codecraft-frontend).

-- IMPORTANTE: rodar no host srv1889.hstgr.io (Hostinger MySQL), nao na VPS.
-- Aplicacao recomendada: via `npx prisma db execute --file ... --schema prisma/schema.prisma`
-- (usa DATABASE_URL do .env do backend automaticamente).

SET FOREIGN_KEY_CHECKS = 0;

-- Tabelas que dependem de outras vao primeiro
DROP TABLE IF EXISTS `challenge_submissions`;
DROP TABLE IF EXISTS `desafios`;
DROP TABLE IF EXISTS `ranking_top3`;
DROP TABLE IF EXISTS `ranking_audit`;
DROP TABLE IF EXISTS `ranking_settings`;
DROP TABLE IF EXISTS `crafters`;
DROP TABLE IF EXISTS `equipes`;
DROP TABLE IF EXISTS `mentores`;
DROP TABLE IF EXISTS `inscricoes`;
DROP TABLE IF EXISTS `ideia_comentarios`;
DROP TABLE IF EXISTS `ideias`;

-- Altera tabelas existentes que tinham coluna relacionada a Crafter
-- users.points: campo de pontuacao do ranking (sem mais sentido sem ranking)
ALTER TABLE `users` DROP COLUMN IF EXISTS `points`;
-- projetos.mentorId: relacao para mentores (tabela ja dropada)
ALTER TABLE `projetos` DROP COLUMN IF EXISTS `mentorId`;
-- discord_links.crafterRoleAssigned: flag para promocao automatica a "Crafter Elite"
ALTER TABLE `discord_links` DROP COLUMN IF EXISTS `crafterRoleAssigned`;

SET FOREIGN_KEY_CHECKS = 1;
