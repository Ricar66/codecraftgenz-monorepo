import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware para configurar Cache-Control headers
 * @param options - Opções de cache
 * @param options.maxAge - Tempo máximo de cache em segundos (default: 0)
 * @param options.isPrivate - Se deve ser cache privado (default: false)
 * @param options.noStore - Se deve desabilitar cache completamente (default: false)
 */
export function cacheControl(options: { maxAge?: number; isPrivate?: boolean; noStore?: boolean } = {}) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (options.noStore) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    } else if (options.isPrivate) {
      res.set('Cache-Control', `private, max-age=${options.maxAge || 0}`);
    } else {
      res.set('Cache-Control', `public, max-age=${options.maxAge || 0}`);
    }
    next();
  };
}

/**
 * Middleware para APIs - desabilita cache completamente
 * Deve ser aplicado em todas as rotas de API para garantir dados atualizados
 */
export function noCache(_req: Request, res: Response, next: NextFunction) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}

/**
 * Middleware para recursos estáticos com hash - cache imutável
 * Usado para assets que incluem hash no nome (ex: main.a1b2c3d4.js)
 */
export function immutableCache(maxAge: number = 31536000) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', `public, immutable, max-age=${maxAge}`);
    next();
  };
}

/**
 * Middleware para dados que podem ser cacheados por curto período
 * @param seconds - Tempo de cache em segundos (default: 60)
 */
export function shortCache(seconds: number = 60) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', `public, max-age=${seconds}`);
    next();
  };
}
