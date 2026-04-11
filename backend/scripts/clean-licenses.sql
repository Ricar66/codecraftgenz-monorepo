-- Limpar todas as ativações de licença
DELETE FROM license_activations;

-- Limpar todas as licenças
DELETE FROM user_licenses;

-- Verificar se foi limpo
SELECT 'Licenças restantes:' as info, COUNT(*) as total FROM user_licenses;
SELECT 'Ativações restantes:' as info, COUNT(*) as total FROM license_activations;
