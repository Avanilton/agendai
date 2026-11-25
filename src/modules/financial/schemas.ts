import { z } from "zod";

export const ACCOUNT_TYPES = ["cash", "checking", "savings", "digital"] as const;
export const CATEGORY_TYPES = ["income", "expense"] as const;
export const TX_TYPES = ["income", "expense", "transfer"] as const;
export const PAYMENT_METHODS = [
  "pix",
  "cash",
  "credit_card",
  "debit_card",
  "bank_transfer",
  "other",
] as const;

export const financialAccountSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da conta ou caixa.").max(80),
  type: z.enum(ACCOUNT_TYPES).default("cash"),
  initialBalanceReais: z.coerce.number().min(-10000000).max(10000000).default(0),
});

export const financialCategorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria.").max(80),
  type: z.enum(CATEGORY_TYPES),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#2563EB"),
});

export const costCenterSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do centro de custo.").max(80),
  description: z.string().trim().max(240).optional().or(z.literal("")),
});

export const transactionInputSchema = z.object({
  type: z.enum(TX_TYPES),
  description: z
    .string()
    .trim()
    .min(2, "Informe uma descrição para o lançamento.")
    .max(160),
  amountReais: z.coerce
    .number()
    .positive("O valor deve ser maior que zero.")
    .max(10000000),
  discountReais: z.coerce.number().min(0).max(10000000).default(0),
  interestReais: z.coerce.number().min(0).max(10000000).default(0),
  fineReais: z.coerce.number().min(0).max(10000000).default(0),
  paymentMethod: z.enum(PAYMENT_METHODS).default("pix"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento inválida."),
  markAsPaid: z.boolean().default(false),
  accountId: z.string().uuid("Selecione uma conta ou caixa."),
  destinationAccountId: z.string().uuid().optional().or(z.literal("")),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  costCenterId: z.string().uuid().optional().or(z.literal("")),
  clientId: z.string().uuid().optional().or(z.literal("")),
  supplierId: z.string().uuid().optional().or(z.literal("")),
  installments: z.coerce.number().int().min(1).max(24).default(1),
  isRecurring: z.boolean().default(false),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const settleTransactionSchema = z.object({
  paidAmountReais: z.coerce.number().positive("Informe um valor maior que zero."),
  discountReais: z.coerce.number().min(0).default(0),
  interestReais: z.coerce.number().min(0).default(0),
  fineReais: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(PAYMENT_METHODS).default("pix"),
});

export type SettleTransactionInput = z.infer<typeof settleTransactionSchema>;

