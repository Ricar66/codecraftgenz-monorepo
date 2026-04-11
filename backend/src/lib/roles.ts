/**
 * Definição centralizada de roles do sistema.
 * Use estas constantes em todos os middlewares e guards — nunca compare strings inline.
 */

/** Roles com acesso total ao painel admin */
export const ADMIN_ROLES = ['admin'] as const;

/** Roles com acesso ao painel interno (metas, calendário, etc.) */
export const PRIVILEGED_ROLES = ['admin', 'editor', 'team'] as const;

/** Todos os roles válidos no sistema */
export const ALL_ROLES = ['admin', 'editor', 'team', 'user'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type PrivilegedRole = (typeof PRIVILEGED_ROLES)[number];
export type AppRole = (typeof ALL_ROLES)[number];

export function hasAdminRole(role: string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

export function hasPrivilegedRole(role: string): boolean {
  return (PRIVILEGED_ROLES as readonly string[]).includes(role);
}
