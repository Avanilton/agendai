import { z } from "zod";

export const APPOINTMENT_STATUSES = [
  "waiting",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;

export const SCHEDULE_BLOCK_TYPES = [
  "block",
  "vacation",
  "holiday",
  "break",
] as const;

export const appointmentInputSchema = z.object({
  clientId: z.string().uuid("Selecione um cliente válido."),
  professionalId: z.string().uuid("Selecione um profissional válido."),
  serviceIds: z
    .array(z.string().uuid())
    .min(1, "Selecione pelo menos um serviço."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário inicial inválido."),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(5, "Duração mínima de 5 minutos.")
    .max(1440)
    .optional(),
  totalPriceReais: z.coerce.number().min(0).max(1000000).optional(),
  status: z.enum(APPOINTMENT_STATUSES).default("waiting"),
  allowOverbooking: z.boolean().default(false),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type AppointmentInput = z.infer<typeof appointmentInputSchema>;

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES),
  cancellationReason: z.string().trim().max(300).optional().or(z.literal("")),
});

export const availabilityRuleItemSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário inicial inválido."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário final inválido."),
  breakStartTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .or(z.literal("")),
  breakEndTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const saveAvailabilitySchema = z.object({
  professionalId: z.string().uuid().optional().or(z.literal("")),
  rules: z.array(availabilityRuleItemSchema).length(7),
});

export const scheduleBlockInputSchema = z.object({
  professionalId: z.string().uuid().optional().or(z.literal("")),
  type: z.enum(SCHEDULE_BLOCK_TYPES).default("block"),
  title: z
    .string()
    .trim()
    .min(2, "Informe um título para o bloqueio.")
    .max(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inicial inválida."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário inicial inválido."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data final inválida."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário final inválido."),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ScheduleBlockInput = z.infer<typeof scheduleBlockInputSchema>;

