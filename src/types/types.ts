export interface BkashConfig {
  username: string;
  password: string;
  appKey: string;
  appSecret: string;
  isSandbox?: boolean;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  log?: boolean;
  webhook?: WebhookConfig;
}

// Grant Token API interfaces
export interface GrantTokenRequest {
  app_key: string;
  app_secret: string;
}

export interface GrantTokenResponse {
  expires_in: number;
  id_token: string;
  refresh_token: string;
  token_type: string;
  statusCode: string;
  statusMessage: string;
}

export interface RefreshTokenRequest {
  app_key: string;
  app_secret: string;
  refresh_token: string;
}

export interface RefreshTokenResponse {
  expires_in: number;
  id_token: string;
  refresh_token: string;
  token_type: string;
  statusCode: string;
  statusMessage: string;
}

// Token Error Response interface
export interface TokenErrorResponse {
  errorCode: string;
  errorMessage: string;
}

export interface PaymentData {
  mode?: string; // Default "0011" for Checkout (URL based)
  payerReference: string;
  callbackURL: string;
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
  merchantAssociationInfo?: string; // Optional for aggregators and system integrators
}

export interface CreatePaymentResponse {
  paymentID: string;
  paymentCreateTime: string;
  transactionStatus: string;
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
  bkashURL: string;
  callbackURL: string;
  successCallbackURL: string;
  failureCallbackURL: string;
  cancelledCallbackURL: string;
  statusCode: string;
  statusMessage: string;
}

// Keep the old PaymentResponse for backward compatibility
export interface PaymentResponse {
  paymentID: string;
  bkashURL: string;
  statusCode: string;
  statusMessage: string;
  paymentExecuteTime?: string;
  trxID?: string;
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
  paymentCreateTime?: string;
  paymentRef?: string;
  payerReference?: string;
  // Additional fields from create payment response
  transactionStatus?: string;
  callbackURL?: string;
  successCallbackURL?: string;
  failureCallbackURL?: string;
  cancelledCallbackURL?: string;
}

// Error response for create payment
export interface CreatePaymentErrorResponse {
  errorCode: string;
  errorMessage: string;
}

export interface ExecutePaymentResponse {
  paymentID: string;
  statusCode: string;
  statusMessage: string;
  customerMsisdn: string;
  payerReference: string;
  paymentExecuteTime: string;
  trxID: string;
  transactionStatus: string;
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

// Query Payment API types
export interface QueryPaymentRequest {
  paymentID: string;
}

export interface QueryPaymentResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  mode: string;
  paymentCreateTime: string;
  paymentExecuteTime?: string;
  trxID?: string;
  transactionStatus: string;
  amount: string;
  currency: string;
  intent: string;
  merchantInvoice: string;
  userVerificationStatus: string;
  payerReference: string;
  // Optional fields that may appear in some responses
  agreementID?: string;
  agreementStatus?: string;
  agreementCreateTime?: string;
  agreementExecuteTime?: string;
}

// Query Payment Error Response
export interface QueryPaymentErrorResponse {
  errorCode: string;
  errorMessage: string;
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
  trxId: string; // Changed from transactionId to trxId to match API
  refundAmount: string; // Changed from amount (number) to refundAmount (string)
  sku: string; // New field for product/service information
  reason: string; // Now required instead of optional
}

export interface RefundResponse {
  originalTrxId: string;
  refundTrxId: string;
  refundTransactionStatus: string;
  originalTrxAmount: string;
  refundAmount: string;
  currency: string;
  completedTime: string;
  sku: string;
  reason: string;
}

// Refund Status API Types
export interface RefundStatusRequest {
  paymentId: string;
  trxId: string;
}

export interface RefundTransaction {
  refundTrxId: string;
  refundTransactionStatus: string;
  refundAmount: string;
  completedTime: string;
}

export interface RefundStatusResponse {
  originalTrxId: string;
  originalTrxAmount: string;
  originalTrxCompletedTime: string;
  refundTransactions: RefundTransaction[];
}

// Refund Error Response
export interface RefundErrorResponse {
  internalCode: string;
  externalCode: string;
  errorMessageEn: string;
  errorMessageBn: string;
}

export interface SearchTransactionData {
  trxID: string; // Changed from transactionId to trxID to match API
}

export interface SearchTransactionResponse {
  statusCode: string;
  statusMessage: string;
  trxID: string;
  transactionStatus: string;
  transactionType: string;
  amount: string;
  currency: string;
  customerMsisdn: string;
  organizationShortCode: string;
  initiationTime: string;
  completedTime: string;
  transactionReference?: string;
}

// Search Transaction Error Response
export interface SearchTransactionErrorResponse {
  errorCode: string;
  errorMessage: string;
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
  | 'refund.failed'
  | 'refund.status.checked'
  | 'refund.status.failed';

export interface BkashEvent {
  type: BkashEventType;
  data: PaymentResponse | ExecutePaymentResponse | VerificationResponse | RefundResponse | Record<string, unknown>;
  timestamp: Date;
}

export interface WebhookConfig {
  secret: string;
  path?: string;
  onEvent?: (event: BkashEvent) => Promise<void>;
}
