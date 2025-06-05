export interface BkashConfig {
  username: string;
  password: string;
  appKey: string;
  appSecret: string;
  isSandbox?: boolean;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  webhook?: WebhookConfig;
}

export interface PaymentData {
  amount: number;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
  callbackURL: string;
  payerReference?: string;
}

export interface PaymentResponse {
  paymentID: string;
  statusCode: string;
  statusMessage: string;
  paymentExecuteTime: string;
  trxID: string;
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
}

export interface VerificationResponse {
  paymentID: string;
  status: string;
  statusCode: string;
  statusMessage: string;
  paymentExecuteTime: string;
  trxID: string;
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
}

export interface TransactionStatus {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  trxID: string;
  amount: string;
  currency: string;
  transactionStatus: string;
  paymentExecuteTime: string;
}

export interface RefundData {
  paymentId: string;
  transactionId: string;
  amount: number;
  reason?: string;
}

export interface RefundResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  trxID: string;
  amount: string;
  currency: string;
  refundTrxID: string;
  completedTime: string;
}

export interface SearchTransactionData {
  transactionId: string;
}

export interface SearchTransactionResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  trxID: string;
  amount: string;
  currency: string;
  transactionStatus: string;
  paymentExecuteTime: string;
  merchantInvoiceNumber: string;
}

export class BkashError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(message);
    this.name = 'BkashError';
  }
}

export type BkashEventType =
  | 'payment.created'
  | 'payment.success'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'refund.created'
  | 'refund.success'
  | 'refund.failed';

export interface BkashEvent {
  type: BkashEventType;
  data: PaymentResponse | VerificationResponse | RefundResponse;
  timestamp: Date;
}

export interface WebhookConfig {
  secret: string;
  path?: string;
  onEvent?: (event: BkashEvent) => Promise<void>;
}
