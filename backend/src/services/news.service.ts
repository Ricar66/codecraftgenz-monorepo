import RSSParser from 'rss-parser';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

const parser = new RSSParser({
  timeout: 15000,
  headers: { 'User-Agent': 'CodeCraftGenZ-NewsBot/1.0' },
});

// Fontes RSS com categorias
const RSS_FEEDS = [
  { url: 'https://www.tabnews.com.br/recentes/rss', source: 'TabNews', category: 'dev' },
  { url: 'https://dev.to/feed', source: 'Dev.to', category: 'dev' },
  { url: 'https://tecnoblog.net/feed/', source: 'Tecnoblog', category: 'tech' },
  { url: 'https://www.tecmundo.com.br/rss', source: 'TecMundo', category: 'tech' },
];

// Keywords para filtrar artigos relevantes
const KEYWORDS = [
  // Dev / Programação
  'programação', 'programacao', 'desenvolvedor', 'developer', 'dev junior',
  'javascript', 'typescript', 'react', 'node', 'python', 'java', 'golang',
  'frontend', 'backend', 'fullstack', 'api', 'github', 'open source',
  'código', 'codigo', 'software', 'web', 'mobile', 'app',
  // IA
  'inteligência artificial', 'inteligencia artificial', 'machine learning',
  'ia ', ' ai ', 'chatgpt', 'gpt', 'claude', 'gemini', 'llm', 'deep learning',
  'automação', 'automacao',
  // Mercado / Carreira
  'mercado de trabalho', 'salário', 'salario', 'vaga', 'emprego', 'carreira',
  'tech', 'startup', 'tecnologia', 'inovação', 'inovacao',
  'junior', 'estágio', 'estagio', 'remoto', 'home office',
];

function matchesKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return KEYWORDS.some(kw => lower.includes(kw));
}

function categorizeArticle(title: string, _source?: string): string {
  const lower = title.toLowerCase();
  if (/salário|salario|vaga|emprego|carreira|mercado.*trabalho|junior|estágio|estagio|remoto/.test(lower)) return 'mercado';
  if (/inteligência artificial|inteligencia artificial|ia |ai |chatgpt|gpt|claude|gemini|llm|machine learning|deep learning/.test(lower)) return 'ia';
  if (/programação|programacao|javascript|typescript|react|python|node|api|código|codigo|frontend|backend|github/.test(lower)) return 'dev';
  return 'tech';
}

export const newsService = {
  /**
   * Busca RSS feeds, filtra por keywords e salva no banco
   */
  async fetchAndSave(): Promise<number> {
    let totalSaved = 0;

    for (const feed of RSS_FEEDS) {
      try {
        const parsed = await parser.parseURL(feed.url);
        const items = (parsed.items || []).slice(0, 20); // máx 20 por fonte

        for (const item of items) {
          if (!item.title || !item.link) continue;

          const fullText = `${item.title} ${item.contentSnippet || item.content || ''}`;
          // Dev.to e TabNews são sempre relevantes, outros filtrar
          const isRelevant = ['TabNews', 'Dev.to'].includes(feed.source) || matchesKeywords(fullText);
          if (!isRelevant) continue;

          const summary = (item.contentSnippet || item.content || '')
            .replace(/<[^>]*>/g, '') // strip HTML
            .slice(0, 300)
            .trim();

          const imageMatch = (item.content || '').match(/<img[^>]+src="([^"]+)"/);
          const imageUrl = item.enclosure?.url || imageMatch?.[1] || null;

          try {
            await prisma.newsArticle.upsert({
              where: { link: item.link },
              update: {},
              create: {
                title: item.title.slice(0, 500),
                link: item.link,
                source: feed.source,
                sourceUrl: parsed.link || feed.url,
                summary: summary || null,
                imageUrl,
                category: categorizeArticle(item.title, feed.source),
                publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
              },
            });
            totalSaved++;
          } catch (e: any) {
            // Duplicate ou erro de inserção — ignora
            if (!e.code?.includes('P2002')) {
              logger.warn({ error: e.message, link: item.link }, 'Failed to save news article');
            }
          }
        }

        logger.info({ source: feed.source, items: items.length }, 'RSS feed processed');
      } catch (error: any) {
        logger.warn({ source: feed.source, error: error.message }, 'Failed to fetch RSS feed');
      }
    }

    // Limpa artigos com mais de 30 dias
    await prisma.newsArticle.deleteMany({
      where: { publishedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    });

    logger.info({ totalSaved }, 'News fetch completed');
    return totalSaved;
  },

  /**
   * Lista notícias para o frontend
   */
  async list(params?: { category?: string; limit?: number; page?: number }) {
    const limit = params?.limit || 12;
    const page = params?.page || 1;
    const where: any = {};
    if (params?.category && params.category !== 'all') where.category = params.category;

    const [data, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.newsArticle.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },
};
