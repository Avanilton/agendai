import { z } from "zod";

export const BUSINESS_SEGMENTS = [
  "Clínica Médica",
  "Clínica Odontológica",
  "Clínica de Estética",
  "Psicologia",
  "Fisioterapia",
  "Nutrição",
  "Salão de Beleza",
  "Barbearia",
  "Manicure e Pedicure",
  "Estúdio de Tatuagem",
  "Fotografia",
  "Personal Trainer",
  "Massoterapia",
  "Pet Shop",
  "Consultoria",
  "Prestação de Serviços",
  "Outro",
] as const;

export const onboardingOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da empresa ou consultório (mínimo 2 caracteres).")
    .max(100, "Nome muito longo (máximo 100 caracteres)."),
  slug: z
    .string()
    .trim()
    .min(3, "O endereço deve ter no mínimo 3 caracteres.")
    .max(60, "O endereço deve ter no máximo 60 caracteres.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífens."
    ),
  segment: z.enum(BUSINESS_SEGMENTS, {
    errorMap: () => ({ message: "Selecione um segmento válido." }),
  }),
  phone: z
    .string()
    .trim()
    .max(25, "Telefone inválido.")
    .optional()
    .or(z.literal("")),
  timezone: z.string().trim().min(3).max(60).default("America/Sao_Paulo"),
  planSlug: z
    .enum(["individual", "equipe", "profissional", "negocio"])
    .default("profissional"),
});

export type OnboardingOrganizationInput = z.infer<
  typeof onboardingOrganizationSchema
>;

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa.").max(100),
  slug: z
    .string()
    .trim()
    .min(3, "Slug mínimo de 3 caracteres.")
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens."),
  segment: z.enum(BUSINESS_SEGMENTS),
  document: z.string().trim().max(30).optional().or(z.literal("")),
  phone: z.string().trim().max(25).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  timezone: z.string().trim().min(3).max(60).default("America/Sao_Paulo"),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const consentRecordSchema = z.object({
  consentType: z.enum([
    "terms_of_use",
    "privacy_policy",
    "lgpd_data_processing",
  ]),
  version: z.string().trim().min(1).max(32).default("1.0.0"),
});

