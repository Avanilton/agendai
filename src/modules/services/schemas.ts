import { z } from "zod";

export const serviceInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do serviço (mínimo 2 caracteres).")
    .max(120),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  priceReais: z.coerce.number().min(0, "Preço não pode ser negativo.").max(1000000),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(5, "Duração mínima de 5 minutos.")
    .max(1440),
  bufferMinutes: z.coerce.number().int().min(0).max(240).default(0),
  commissionPercent: z.coerce.number().min(0).max(100).default(0),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida.")
    .default("#2563EB"),
  status: z.enum(["active", "inactive"]).default("active"),
  professionalIds: z.array(z.string().uuid()).default([]),
});

export type ServiceInput = z.infer<typeof serviceInputSchema>;

