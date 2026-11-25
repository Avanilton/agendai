import { z } from "zod";

export const productInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do produto (mínimo 2 caracteres).")
    .max(120),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
  barcode: z.string().trim().max(60).optional().or(z.literal("")),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  costReais: z.coerce.number().min(0, "Custo não pode ser negativo.").max(1000000),
  priceReais: z.coerce.number().min(0, "Preço não pode ser negativo.").max(1000000),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  minStockQuantity: z.coerce.number().int().min(0).default(0),
  supplierId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type ProductInput = z.infer<typeof productInputSchema>;

