import { z } from "zod";

export const createPixChargeSchema = z.object({
  clientId: z.string().uuid().optional().or(z.literal("")),
  pixKey: z
    .string()
    .trim()
    .min(5, "Informe uma chave Pix válida (CPF, CNPJ, e-mail, telefone ou aleatória).")
    .max(120),
  amountReais: z.coerce
    .number()
    .positive("O valor da cobrança deve ser maior que zero.")
    .max(10000000),
  description: z
    .string()
    .trim()
    .min(2, "Informe a descrição da cobrança.")
    .max(140),
});

export const fiscalProfileSchema = z.object({
  cnpj: z.string().trim().max(25).optional().or(z.literal("")),
  municipalRegistration: z.string().trim().max(40).optional().or(z.literal("")),
  taxRegime: z
    .enum(["mei", "simples_nacional", "lucro_presumido", "lucro_real"])
    .default("simples_nacional"),
  defaultServiceCode: z.string().trim().max(30).optional().or(z.literal("")),
  issRatePercent: z.coerce.number().min(0).max(10).default(2),
  provider: z
    .enum(["none", "focus_nfe", "enotas", "plugnotas", "nfse_nacional"])
    .default("none"),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
});

export const createNfseDraftSchema = z.object({
  clientId: z.string().uuid().optional().or(z.literal("")),
  serviceCode: z.string().trim().max(30).optional().or(z.literal("")),
  description: z
    .string()
    .trim()
    .min(3, "Informe a discriminação do serviço para a NFS-e.")
    .max(400),
  amountReais: z.coerce
    .number()
    .positive("O valor da nota deve ser maior que zero.")
    .max(10000000),
  issRatePercent: z.coerce.number().min(0).max(10).default(2),
});

