import { z } from "zod";

export const PAYMENT_METHODS = [
  "pix",
  "cash",
  "credit_card",
  "debit_card",
  "bank_transfer",
  "other",
] as const;

export const subscriptionPlanItemSchema = z.object({
  itemType: z.enum(["service", "product"]),
  itemId: z.string().uuid(),
  nameSnapshot: z.string().trim().min(1).max(160),
  quantity: z.coerce.number().int().min(1).max(999).default(1),
});

export const subscriptionPlanInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do plano.").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  priceReais: z.coerce.number().min(0, "Valor inválido.").max(1000000),
  includedItems: z
    .array(subscriptionPlanItemSchema)
    .min(1, "Inclua pelo menos um serviço ou produto no plano."),
  paymentMethod: z.enum(PAYMENT_METHODS).default("pix"),
  billingDueDay: z.coerce
    .number()
    .int()
    .min(1, "Dia de vencimento deve ser entre 1 e 31.")
    .max(31, "Dia de vencimento deve ser entre 1 e 31."),
  isActive: z.boolean().default(true),
});

export type SubscriptionPlanInput = z.infer<typeof subscriptionPlanInputSchema>;

export const assignClientSubscriptionSchema = z.object({
  clientId: z.string().uuid("Cliente inválido."),
  planId: z.string().uuid("Selecione um plano válido."),
  paymentMethod: z.enum(PAYMENT_METHODS).default("pix"),
  billingDueDay: z.coerce.number().int().min(1).max(31),
  status: z.enum(["active", "paused", "cancelled"]).default("active"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type AssignClientSubscriptionInput = z.infer<
  typeof assignClientSubscriptionSchema
>;

