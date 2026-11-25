import { z } from "zod";

export const supplierInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome ou razão social do fornecedor.")
    .max(120),
  document: z.string().trim().max(30).optional().or(z.literal("")),
  contactName: z.string().trim().max(100).optional().or(z.literal("")),
  phone: z.string().trim().max(25).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type SupplierInput = z.infer<typeof supplierInputSchema>;

