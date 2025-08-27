import {
    BkashEvent,
    CreatePaymentResponse,
    ExecutePaymentResponse,
    GrantTokenResponse,
    PaymentData,
    QueryPaymentResponse,
    RefreshTokenResponse,
    RefundData,
    RefundResponse,
    RefundStatusRequest,
    RefundStatusResponse,
    SearchTransactionData,
    SearchTransactionResponse,
    TransactionStatus,
    VerificationResponse
} from '../types/types';

/**
 * Token management interface
 */
export interface ITokenManager {
    getToken(): Promise<string>;
    refreshToken(refreshTokenValue: string): Promise<RefreshTokenResponse>;
    grantToken(): Promise<GrantTokenResponse>;
    isTokenExpired(): boolean;
    clearToken(): void;
}

/**
 * Payment operations interface
 */
export interface IPaymentService {
    createPayment(paymentData: PaymentData): Promise<CreatePaymentResponse>;
    executePayment(paymentID: string): Promise<ExecutePaymentResponse>;
    verifyPayment(transactionId: string): Promise<VerificationResponse>;
}

/**
 * Transaction operations interface
 */
export interface ITransactionService {
    queryPayment(paymentID: string): Promise<QueryPaymentResponse>;
    searchTransaction(searchData: SearchTransactionData): Promise<SearchTransactionResponse>;
}

/**
 * Refund operations interface
 */
export interface IRefundService {
    refundPayment(refundData: RefundData): Promise<RefundResponse>;
    checkRefundStatus(refundStatusData: RefundStatusRequest): Promise<RefundStatusResponse>;
}

/**
 * Webhook handling interface
 */
export interface IWebhookService {
    handleWebhook(payload: unknown, signature?: string): Promise<void>;
    verifyWebhookSignature(payload: string, signature: string): boolean;
    createWebhookEvent(eventType: string, data: unknown): BkashEvent;
}

/**
 * Utility methods interface
 */
export interface ITransactionUtils {
    isTransactionSuccessful(status: TransactionStatus): boolean;
    isTransactionPending(status: TransactionStatus): boolean;
    isTransactionFailed(status: TransactionStatus): boolean;
}
