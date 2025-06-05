import { z } from 'zod';

export const WebhookConfigSchema = z.object({
  secret: z.string().min(1, 'Webhook secret is required'),
  path: z.string().optional(),
  onEvent: z.function().optional(),
});

export const NagadConfigSchema = z.object({
  merchantId: z.string().min(1, 'Merchant ID is required'),
  merchantNumber: z.string().min(1, 'Merchant number is required'),
  callbackUrl: z.string().url('Invalid callback URL'),
  isSandbox: z.boolean().optional().default(false),
  timeout: z.number().positive().optional(),
  maxRetries: z.number().int().min(1).max(5).optional(),
  retryDelay: z.number().int().min(100).max(5000).optional(),
  webhook: WebhookConfigSchema.optional(),
});

export const NagadPaymentDataSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be exactly 3 characters'),
  merchantOrderId: z.string().min(1, 'Merchant order ID is required'),
  customerMobileNo: z.string().optional(),
  customerEmail: z.string().email('Invalid email').optional(),
  additionalData: z.record(z.string()).optional(),
});

export const NagadRefundDataSchema = z.object({
  paymentRefId: z.string().min(1, 'Payment reference ID is required'),
  orderId: z.string().min(1, 'Order ID is required'),
  amount: z.number().positive('Amount must be positive'),
  reason: z.string().optional(),
});

export const NagadTransactionIdSchema = z.string().min(1, 'Transaction ID is required');
