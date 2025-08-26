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
  log: z.boolean().optional().default(false),
  webhook: WebhookConfigSchema.optional(),
});

export const PaymentDataSchema = z.object({
  mode: z.string().optional().default('0011'),
  payerReference: z.string().min(1, 'Payer reference is required').max(255, 'Payer reference must not exceed 255 characters'),
  callbackURL: z.string().url('Invalid callback URL'),
  amount: z.string().min(1, 'Amount is required'),
  currency: z.string().length(3, 'Currency must be exactly 3 characters'),
  intent: z.string().min(1, 'Intent is required'),
  merchantInvoiceNumber: z.string().min(1, 'Merchant invoice number is required').max(255, 'Merchant invoice number must not exceed 255 characters'),
  merchantAssociationInfo: z.string().max(255, 'Merchant association info must not exceed 255 characters').optional(),
});

export const TransactionIdSchema = z.string().min(1, 'Transaction ID is required');

export const RefundDataSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  trxId: z.string().min(1, 'Transaction ID is required'),
  refundAmount: z.string().min(1, 'Refund amount is required').regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format (e.g., "100.00")'),
  sku: z.string().min(1, 'SKU is required'),
  reason: z.string().optional(),
});

export const LegacyRefundDataSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  transactionId: z.string().min(1, 'Transaction ID is required'),
  amount: z.number().positive('Amount must be positive'),
  reason: z.string().optional(),
});

export const SearchTransactionSchema = z.object({
  trxID: z.string().min(1, 'Transaction ID is required'),
});

export const RefundStatusRequestSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  trxId: z.string().min(1, 'Transaction ID is required'),
});

// Token validation schemas
export const GrantTokenRequestSchema = z.object({
  app_key: z.string().min(1, 'App key is required'),
  app_secret: z.string().min(1, 'App secret is required'),
});

export const RefreshTokenRequestSchema = z.object({
  app_key: z.string().min(1, 'App key is required'),
  app_secret: z.string().min(1, 'App secret is required'),
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

// Query Payment validation schema
export const QueryPaymentRequestSchema = z.object({
  paymentID: z.string().min(1, 'Payment ID is required'),
});
