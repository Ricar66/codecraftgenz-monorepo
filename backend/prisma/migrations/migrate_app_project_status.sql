-- Normaliza Apps para o novo modelo de status: revisar | publicar
UPDATE apps SET status = CASE
  WHEN LOWER(status) IN ('published', 'publicado', 'available', 'disponivel', 'disponível', 'ready', 'finalizado', 'publicar') THEN 'publicar'
  ELSE 'revisar'
END;

-- Normaliza Projetos para o novo modelo de status: aguardando_start | em_andamento | finalizado
UPDATE projetos SET status = CASE
  WHEN LOWER(status) IN ('concluido', 'concluído', 'finalizado', 'completed') THEN 'finalizado'
  WHEN LOWER(status) IN ('ativo', 'active', 'ongoing', 'em_andamento', 'em andamento') THEN 'em_andamento'
  ELSE 'aguardando_start'
END;
