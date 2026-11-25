import { z } from "zod";
import { PAYMENT_METHODS } from "@/modules/financial/schemas";
import { saleLineSchema } from "@/modules/commerce/schemas";

export const createPackageSchema = z.object({
  clientId: z.string().uuid("Selecione um cliente válido."),
  serviceId: z.string().uuid().optional().or(z.literal("")),
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do pacote (ex.: 10 Sessões de Estética).")
    .max(120),
  totalSessions: z.coerce.number().int().min(1).max(500),
  priceReais: z.coerce.number().min(0).max(1000000),
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de validade inválida.")
    .optional()
    .or(z.literal("")),
  accountId: z.string().uuid().optional().or(z.literal("")),
  paymentMethod: z.enum(PAYMENT_METHODS).default("pix"),
  launchInFinancial: z.boolean().default(true),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;

export const consumeSessionSchema = z.object({
  professionalId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const createBudgetSchema = z.object({
  clientId: z.string().uuid("Selecione um cliente válido."),
  title: z.string().trim().min(2, "Informe um título para o orçamento.").max(140),
  discountReais: z.coerce.number().min(0).max(1000000).default(0),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de validade inválida.")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(800).optional().or(z.literal("")),
  items: z
    .array(saleLineSchema)
    .min(1, "Adicione pelo menos um produto ou serviço ao orçamento."),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const convertBudgetSchema = z.object({
  accountId: z.string().uuid("Selecione a conta financeira."),
  paymentMethod: z.enum(PAYMENT_METHODS).default("pix"),
  installments: z.coerce.number().int().min(1).max(24).default(1),
});

