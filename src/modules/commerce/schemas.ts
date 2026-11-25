import { z } from "zod";
import { PAYMENT_METHODS } from "@/modules/financial/schemas";

export const saleLineSchema = z.object({
  itemType: z.enum(["product", "service"]),
  itemId: z.string().uuid("Selecione um produto ou serviço válido."),
  quantity: z.coerce.number().int().min(1, "Quantidade mínima é 1.").max(10000),
  unitPriceReais: z.coerce.number().min(0).max(1000000),
});

export const createSaleSchema = z.object({
  clientId: z.string().uuid().optional().or(z.literal("")),
  professionalId: z.string().uuid().optional().or(z.literal("")),
  accountId: z.string().uuid("Selecione uma conta de destino."),
  paymentMethod: z.enum(PAYMENT_METHODS).default("pix"),
  installments: z.coerce.number().int().min(1).max(24).default(1),
  discountReais: z.coerce.number().min(0).max(1000000).default(0),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z.array(saleLineSchema).min(1, "Adicione pelo menos um item à venda."),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const purchaseLineSchema = z.object({
  productId: z.string().uuid("Selecione um produto válido."),
  quantity: z.coerce.number().int().min(1, "Quantidade mínima é 1.").max(100000),
  unitCostReais: z.coerce.number().min(0).max(1000000),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string().uuid("Selecione um fornecedor válido."),
  accountId: z.string().uuid("Selecione uma conta para lançamento financeiro."),
  paymentMethod: z.enum(PAYMENT_METHODS).default("pix"),
  discountReais: z.coerce.number().min(0).max(1000000).default(0),
  taxReais: z.coerce.number().min(0).max(1000000).default(0),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z
    .array(purchaseLineSchema)
    .min(1, "Adicione pelo menos um produto à compra."),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const manualMovementSchema = z.object({
  productId: z.string().uuid("Selecione um produto válido."),
  type: z.enum(["in", "out", "adjustment", "return"]),
  quantity: z.coerce.number().int().min(0).max(1000000),
  reason: z
    .string()
    .trim()
    .min(3, "Informe o motivo da movimentação (rastreabilidade obrigatória).")
    .max(240),
});

export type ManualMovementInput = z.infer<typeof manualMovementSchema>;

