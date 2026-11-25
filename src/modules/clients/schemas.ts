import { z } from "zod";

export const CLIENT_STATUSES = ["active", "inactive", "blocked"] as const;

export const clientInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do cliente (mínimo 2 caracteres).")
    .max(120),
  cpf: z.string().trim().max(20).optional().or(z.literal("")),
  phone: z.string().trim().max(25).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(25).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
  birthDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento inválida.")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  origin: z.string().trim().max(60).optional().or(z.literal("")),
  status: z.enum(CLIENT_STATUSES).default("active"),
  whatsappOptIn: z.boolean().default(true),
  emailOptIn: z.boolean().default(true),
  lgpdConsent: z.boolean().default(false),
});

export type ClientInput = z.infer<typeof clientInputSchema>;

