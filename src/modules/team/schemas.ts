import { z } from "zod";
import { PAYMENT_METHODS } from "@/modules/financial/schemas";

export const createCommissionSchema = z.object({
  professionalId: z.string().uuid("Selecione um profissional válido."),
  source: z
    .enum(["service", "product_sale", "goal_bonus", "manual"])
    .default("service"),
  calcType: z.enum(["percentage", "fixed"]).default("percentage"),
  baseAmountReais: z.coerce.number().min(0).max(10000000).default(0),
  ratePercent: z.coerce.number().min(0).max(100).default(0),
  fixedAmountReais: z.coerce.number().min(0).max(10000000).default(0),
  referenceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de referência inválida."),
  description: z
    .string()
    .trim()
    .min(2, "Informe uma descrição para a comissão.")
    .max(160),
});

export type CreateCommissionInput = z.infer<typeof createCommissionSchema>;

export const payCommissionSchema = z.object({
  accountId: z.string().uuid("Selecione uma conta para saída financeira."),
  paymentMethod: z.enum(PAYMENT_METHODS).default("pix"),
});

export const createTimeEntrySchema = z.object({
  professionalId: z.string().uuid("Selecione um profissional válido."),
  type: z
    .enum(["work_hours", "overtime", "absence", "day_off", "vacation"])
    .default("work_hours"),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  hours: z.coerce.number().min(0).max(24).default(8),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;

export const createGoalSchema = z.object({
  professionalId: z.string().uuid("Selecione um profissional válido."),
  monthKey: z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido (YYYY-MM)."),
  targetRevenueReais: z.coerce.number().min(0).max(10000000).default(0),
  targetAppointments: z.coerce.number().int().min(0).max(10000).default(0),
  bonusReais: z.coerce.number().min(0).max(1000000).default(0),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

