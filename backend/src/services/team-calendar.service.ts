// src/services/team-calendar.service.ts
// Google Calendar integration for the team Metas module.
// One shared calendar connected by an admin — token stored in SystemConfig.

import { google } from 'googleapis';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const CONFIG_KEY_TOKEN = 'google_calendar_token';

function getOAuth2Client() {
  return new google.auth.OAuth2(
    env.GOOGLE_CALENDAR_CLIENT_ID,
    env.GOOGLE_CALENDAR_CLIENT_SECRET,
    `${env.BACKEND_URL}/api/metas/google/callback`,
  );
}

async function getStoredTokens(): Promise<Record<string, unknown> | null> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY_TOKEN } });
    return row ? (JSON.parse(row.value) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function saveTokens(tokens: Record<string, unknown>): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY_TOKEN },
    create: { key: CONFIG_KEY_TOKEN, value: JSON.stringify(tokens) },
    update: { value: JSON.stringify(tokens) },
  });
}

async function getAuthenticatedClient() {
  const tokens = await getStoredTokens();
  if (!tokens) return null;

  const oauth2 = getOAuth2Client();
  oauth2.setCredentials(tokens as never);

  // Auto-refresh if expired
  if (tokens.expiry_date && (tokens.expiry_date as number) < Date.now()) {
    try {
      const { credentials } = await oauth2.refreshAccessToken();
      await saveTokens(credentials as never);
      oauth2.setCredentials(credentials);
    } catch (err) {
      logger.warn({ err }, 'Falha ao renovar token do Google Calendar');
      return null;
    }
  }

  return oauth2;
}

export const teamCalendarService = {
  /** Returns whether a Google Calendar token is stored */
  async isConnected(): Promise<boolean> {
    const tokens = await getStoredTokens();
    return tokens !== null;
  },

  /** Returns the Google OAuth consent URL for admin to connect the team calendar */
  getAuthUrl(): string {
    const oauth2 = getOAuth2Client();
    return oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
    });
  },

  /** Exchanges the auth code for tokens and persists them */
  async handleCallback(code: string): Promise<void> {
    const oauth2 = getOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    await saveTokens(tokens as never);
    logger.info('Google Calendar conectado à equipe');
  },

  /** Removes the stored tokens (disconnects) */
  async disconnect(): Promise<void> {
    await prisma.systemConfig.deleteMany({ where: { key: CONFIG_KEY_TOKEN } });
    logger.info('Google Calendar desconectado da equipe');
  },

  /**
   * Creates a Google Calendar event with a Google Meet link.
   * Returns the event ID and Meet link, or null if calendar not connected.
   */
  async createEvent(params: {
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
  }): Promise<{ eventId: string; meetLink: string } | null> {
    const auth = await getAuthenticatedClient();
    if (!auth) return null;

    try {
      const calendar = google.calendar({ version: 'v3', auth });
      const response = await calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        requestBody: {
          summary: params.title,
          description: params.description ?? '',
          start: { dateTime: params.startDate.toISOString(), timeZone: 'America/Sao_Paulo' },
          end: { dateTime: params.endDate.toISOString(), timeZone: 'America/Sao_Paulo' },
          conferenceData: {
            createRequest: {
              requestId: `ccgz-meta-${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
              { method: 'email', minutes: 60 },
            ],
          },
        },
      });

      const event = response.data;
      const meetLink = event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri ?? '';
      return { eventId: event.id ?? '', meetLink };
    } catch (err) {
      logger.warn({ err }, 'Falha ao criar evento no Google Calendar');
      return null;
    }
  },

  /** Deletes a Google Calendar event by ID. Fire-and-forget safe. */
  async deleteEvent(googleEventId: string): Promise<void> {
    const auth = await getAuthenticatedClient();
    if (!auth) return;

    try {
      const calendar = google.calendar({ version: 'v3', auth });
      await calendar.events.delete({ calendarId: 'primary', eventId: googleEventId });
    } catch (err) {
      logger.warn({ err, googleEventId }, 'Falha ao deletar evento do Google Calendar');
    }
  },
};
