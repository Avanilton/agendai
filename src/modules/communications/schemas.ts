import { z } from "zod";

export const MESSAGE_CHANNELS = ["whatsapp", "email"] as const;
export const MESSAGE_CATEGORIES = [
  "confirmation",
  "reminder",
  "cancellation",
  "reschedule",
  "billing",
  "birthday",
  "budget",
  "custom",
] as const;

export const templateInputSchema = z.object({
  channel: z.enum(MESSAGE_CHANNELS).default("whatsapp"),
  category: z.enum(MESSAGE_CATEGORIES).default("reminder"),
  name: z.string().trim().min(2, "Informe o nome do template.").max(100),
  subject: z.string().trim().max(180).optional().or(z.literal("")),
  body: z
    .string()
    .trim()
    .min(5, "Escreva a mensagem do template (mínimo 5 caracteres).")
    .max(2000),
  isActive: z.boolean().default(true),
});

export type TemplateInput = z.infer<typeof templateInputSchema>;

export const logCommunicationSchema = z.object({
  clientId: z.string().uuid().optional().or(z.literal("")),
  appointmentId: z.string().uuid().optional().or(z.literal("")),
  templateId: z.string().uuid().optional().or(z.literal("")),
  channel: z.enum(MESSAGE_CHANNELS),
  category: z.enum(MESSAGE_CATEGORIES),
  recipient: z.string().trim().min(3).max(160),
  subject: z.string().trim().max(180).optional().or(z.literal("")),
  renderedBody: z.string().trim().min(1).max(4000),
});

export type LogCommunicationInput = z.infer<typeof logCommunicationSchema>;

