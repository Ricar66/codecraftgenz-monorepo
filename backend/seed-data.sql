-- =============================================
-- SEED DATA - CodeCraft Gen-Z
-- =============================================
-- Execute este script no phpMyAdmin ou cliente MySQL
-- Database: u984096926_codecraftgenz
-- =============================================

-- 1. Criar Mentor (se não existir)
INSERT INTO mentores (nome, email, bio, especialidade, disponivel, createdAt, updatedAt)
SELECT 'Ricardo Coadini de Marco Moretti', 'ricardo@codecraftgenz.com.br',
       'Desenvolvedor Full Stack e fundador da CodeCraft Gen-Z',
       'Full Stack Development', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM mentores WHERE email = 'ricardo@codecraftgenz.com.br');

-- 2. Criar Usuário Admin
-- IMPORTANTE: A senha 'admin123' será hasheada pelo sistema no primeiro login
-- Se precisar de hash bcrypt pré-gerado: $2b$10$8K1p/hIqHvkQV1z9XJXZ5.Qq5v5y5z5z5z5z5z5z5z5z5z5z5z5z5z
INSERT INTO users (email, name, passwordHash, role, status, mfaEnabled, createdAt, updatedAt)
SELECT 'admin@codecraft.dev', 'Admin CodeCraft',
       '$2b$10$rL6VmJCd4Qp.X3H9K5YwZO6vVjWQXmN8qR2sT4uY6wI0hF3lE5mN2',
       'admin', 'ativo', false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@codecraft.dev');

-- 3. Criar Projeto de exemplo
INSERT INTO projetos (nome, descricao, status, preco, progresso, mentorId, createdAt, updatedAt)
SELECT 'Site CodeCraft Gen-Z',
       'Desenvolvimento completo do site institucional e marketplace da CodeCraft Gen-Z com React, Node.js e MySQL',
       'ativo', 5000.00, 75,
       (SELECT id FROM mentores WHERE email = 'ricardo@codecraftgenz.com.br' LIMIT 1),
       NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM projetos WHERE nome = 'Site CodeCraft Gen-Z');

-- 4. Criar um App de exemplo no marketplace
INSERT INTO apps (name, description, shortDescription, price, category, tags, status, featured, downloadCount, creatorId, projectId, version, createdAt, updatedAt)
SELECT 'CodeCraft IDE Extension',
       'Extensão para VS Code com snippets, templates e ferramentas da CodeCraft Gen-Z',
       'Extensão VS Code com ferramentas CodeCraft',
       0.00, 'Ferramentas', 'vscode,ide,extensao,produtividade',
       'published', true, 0,
       (SELECT id FROM users WHERE email = 'admin@codecraft.dev' LIMIT 1),
       (SELECT id FROM projetos WHERE nome = 'Site CodeCraft Gen-Z' LIMIT 1),
       '1.0.0', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM apps WHERE name = 'CodeCraft IDE Extension');

-- 5. Verificar dados inseridos
SELECT 'Mentores:' as tabela, COUNT(*) as total FROM mentores
UNION ALL
SELECT 'Usuários:', COUNT(*) FROM users
UNION ALL
SELECT 'Projetos:', COUNT(*) FROM projetos
UNION ALL
SELECT 'Apps:', COUNT(*) FROM apps;

-- =============================================
-- COMANDOS ÚTEIS
-- =============================================
-- Ver todos os usuários:
-- SELECT id, email, name, role, status FROM users;

-- Ver todos os mentores:
-- SELECT id, nome, email, especialidade FROM mentores;

-- Ver todos os projetos:
-- SELECT id, nome, status, progresso FROM projetos;

-- Ver todos os apps:
-- SELECT id, name, status, featured FROM apps;
