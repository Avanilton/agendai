import { z } from "zod";

export const PROFESSIONAL_STATUSES = ["active", "inactive", "vacation"] as const;
export const REMUNERATION_TYPES = ["commission", "fixed", "hybrid"] as const;

export const professionalInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do profissional (mínimo 2 caracteres).")
    .max(120),
  phone: z.string().trim().max(25).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
  cpf: z.string().trim().max(20).optional().or(z.literal("")),
  roleTitle: z.string().trim().max(80).optional().or(z.literal("")),
  specialty: z.string().trim().max(80).optional().or(z.literal("")),
  hiredAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de contratação inválida.")
    .optional()
    .or(z.literal("")),
  status: z.enum(PROFESSIONAL_STATUSES).default("active"),
  defaultCommissionPercent: z.coerce.number().min(0).max(100).default(0),
  salaryReais: z.coerce.number().min(0).max(1000000).default(0),
  remunerationType: z.enum(REMUNERATION_TYPES).default("commission"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida.")
    .default("#2563EB"),
});

export type ProfessionalInput = z.infer<typeof professionalInputSchema>;

