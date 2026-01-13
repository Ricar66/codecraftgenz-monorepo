import { z } from 'zod';

export const activateDeviceSchema = z.object({
  body: z.object({
    app_id: z.number().int().positive().or(z.string().transform(Number)),
    app_name: z.string().optional(),
    email: z.string().email('Email inválido'),
    hardware_id: z.string().min(6).max(64),
  }),
});

export const verifyLicenseSchema = z.object({
  body: z.object({
    app_id: z.number().int().positive().or(z.string().transform(Number)),
    app_name: z.string().optional(),
    email: z.string().email('Email inválido'),
    hardware_id: z.string().min(6).max(64),
  }),
});

export const claimByEmailSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
  }),
});

export const purchasesByEmailSchema = z.object({
  query: z.object({
    email: z.string().email('Email inválido'),
    app_id: z.string().transform(Number).optional(),
  }),
});

export const downloadByEmailSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    email: z.string().email('Email inválido'),
  }),
});

export type ActivateDeviceInput = z.infer<typeof activateDeviceSchema>['body'];
export type VerifyLicenseInput = z.infer<typeof verifyLicenseSchema>['body'];
export type ClaimByEmailInput = z.infer<typeof claimByEmailSchema>['body'];
