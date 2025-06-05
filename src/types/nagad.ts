export interface NagadConfig {
  merchantId: string;
  merchantNumber: string;
  callbackUrl: string;
  isSandbox?: boolean;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  webhook?: WebhookConfig;
}

export interface NagadPaymentData {
  amount: number;
  currency: string;
  merchantOrderId: string;
  customerMobileNo?: string;
  customerEmail?: string;
  additionalData?: Record<string, string>;
}

export interface NagadPaymentResponse {
  status: string;
  message: string;
  paymentRefId: string;
  orderId: string;
  amount: string;
  currency: string;
  paymentUrl: string;
  paymentDateTime: string;
}

export interface NagadVerificationResponse {
  status: string;
  message: string;
  paymentRefId: string;
  orderId: string;
  amount: string;
  currency: string;
  paymentDateTime: string;
  transactionStatus: string;
  transactionId: string;
}

export interface NagadRefundData {
  paymentRefId: string;
  orderId: string;
  amount: number;
  reason?: string;
}

export interface NagadRefundResponse {
  status: string;
  message: string;
  refundId: string;
  paymentRefId: string;
  orderId: string;
  amount: string;
  refundDateTime: string;
}

export interface NagadTransactionStatus {
  status: string;
  message: string;
  paymentRefId: string;
  orderId: string;
  amount: string;
  currency: string;
  transactionStatus: string;
  transactionId: string;
  paymentDateTime: string;
}

export type NagadEventType =
  | 'payment.created'
  | 'payment.success'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'refund.created'
  | 'refund.success'
  | 'refund.failed';

export interface NagadEvent {
  type: NagadEventType;
  data: NagadPaymentResponse | NagadVerificationResponse | NagadRefundResponse;
  timestamp: Date;
}

export interface WebhookConfig {
  secret: string;
  path?: string;
  onEvent?: (event: NagadEvent) => Promise<void>;
}

export class NagadError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(message);
    this.name = 'NagadError';
  }
}
