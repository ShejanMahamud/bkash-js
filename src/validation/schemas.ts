import { z } from 'zod';

export const WebhookConfigSchema = z.object({
  secret: z.string().min(1, 'Webhook secret is required'),
  path: z.string().optional(),
  onEvent: z.function().optional(),
});

export const BkashConfigSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  appKey: z.string().min(1, 'App key is required'),
  appSecret: z.string().min(1, 'App secret is required'),
  isSandbox: z.boolean().optional().default(false),
  timeout: z.number().positive().optional(),
  maxRetries: z.number().int().min(1).max(5).optional(),
  retryDelay: z.number().int().min(100).max(5000).optional(),
  webhook: WebhookConfigSchema.optional(),
});

export const PaymentDataSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be exactly 3 characters'),
  intent: z.string(),
  merchantInvoiceNumber: z.string().min(1, 'Merchant invoice number is required'),
  callbackURL: z.string().url('Invalid callback URL'),
  payerReference: z.string().optional(),
});

export const TransactionIdSchema = z.string().min(1, 'Transaction ID is required');

export const RefundDataSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  transactionId: z.string().min(1, 'Transaction ID is required'),
  amount: z.number().positive('Amount must be positive'),
  reason: z.string().optional(),
});

export const SearchTransactionSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
});
