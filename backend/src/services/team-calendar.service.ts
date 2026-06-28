// src/services/team-calendar.service.ts
//
// STUB pós-clean-up Crafter (2026-06-28).
// A integração original com Google Calendar para o time Crafter foi removida.
// Metas ainda funcionam — apenas não disparam mais eventos no calendário compartilhado.
// Quando reativarmos a comunidade Craft, restaurar a implementação completa do
// commit anterior a `chore(crafters): full clean`.

interface CreateEventInput {
  title: string;
  description?: string | null;
  startDate: Date;
  endDate: Date;
  attendees?: Array<{ email: string }>;
}

interface CreateEventResult {
  meetLink: string | null;
  eventId: string | null;
}

export const teamCalendarService = {
  async createEvent(_input: CreateEventInput): Promise<CreateEventResult | null> {
    // Integração desativada — retorna null para que callers façam fallback gracioso
    return null;
  },

  async deleteEvent(_eventId: string | null | undefined): Promise<void> {
    // no-op
  },

  async isConnected(): Promise<boolean> {
    return false;
  },

  getAuthUrl(): string {
    return '';
  },

  async handleCallback(_code: string): Promise<void> {
    // no-op
  },

  async disconnect(): Promise<void> {
    // no-op
  },
};
