import { z } from "zod";

export const bookingSettingsSchema = z.object({
  isEnabled: z.boolean().default(true),
  allowAnyProfessional: z.boolean().default(true),
  minAdvanceMinutes: z.coerce.number().int().min(0).max(10080).default(60),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365).default(30),
  slotIntervalMinutes: z.coerce
    .number()
    .int()
    .refine((v) => [15, 20, 30, 45, 60].includes(v), {
      message: "Escolha um intervalo entre 15, 20, 30, 45 ou 60 minutos.",
    })
    .default(30),
  autoConfirm: z.boolean().default(false),
  cancellationPolicyHours: z.coerce.number().int().min(0).max(168).default(24),
  welcomeMessage: z.string().trim().max(400).optional().or(z.literal("")),
});

export type BookingSettingsInput = z.infer<typeof bookingSettingsSchema>;

export const publicBookingSubmitSchema = z.object({
  serviceId: z.string().uuid("Selecione um serviço válido."),
  /** UUID of professional or literal "any" */
  professionalId: z
    .string()
    .refine(
      (val) =>
        val === "any" ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          val
        ),
      "Selecione um profissional válido."
    ),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
  clientName: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo.")
    .max(120),
  clientPhone: z
    .string()
    .trim()
    .min(8, "Informe um WhatsApp ou telefone válido.")
    .max(25),
  clientEmail: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  acceptedLgpd: z.literal(true, {
    errorMap: () => ({
      message: "É necessário aceitar o tratamento de dados (LGPD) para agendar.",
    }),
  }),
});

export type PublicBookingSubmitInput = z.infer<typeof publicBookingSubmitSchema>;

