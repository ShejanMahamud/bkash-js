import { EventEmitter } from 'events';
import { IEventEmitter } from './interfaces/base';
import {
    IPaymentService,
    IRefundService,
    ITokenManager,
    ITransactionService,
    ITransactionUtils,
    IWebhookService,
} from './interfaces/services';
import { BkashServiceFactory } from './services/service-factory';
import { BkashConfig } from './types/types';
import { BkashConfigSchema } from './validation/schemas';

// Re-export types for convenience
export * from './types/types';

/**
 * bKash Checkout (URL Based) Payment Integration - Refactored with SOLID Principles
 * 
 * This class provides a comprehensive interface for bKash Checkout URL-based payment integration,
 * following SOLID principles with proper separation of concerns. Each responsibility is handled
 * by a dedicated service, making the code more maintainable, testable, and extensible.
 * 
 * The class extends EventEmitter to provide real-time event notifications for payment lifecycle events.
 * 
 * @class BkashPayment
 * @extends EventEmitter
 * 
 * @example
 * ```typescript
 * const bkash = new BkashPayment({
 *   username: 'your-username',
 *   password: 'your-password',
 *   appKey: 'your-app-key',
 *   appSecret: 'your-app-secret',
 *   isSandbox: true,
 *   log: true
 * });
 * 
 * // Listen for payment events
 * bkash.on('bkash:event', (event) => {
 *   console.log('Payment event:', event);
 * });
 * 
 * // Create a checkout payment
 * const payment = await bkash.createPayment({
 *   amount: "100",
 *   currency: 'BDT',
 *   intent: 'sale',
 *   merchantInvoiceNumber: 'INV-001',
 *   payerReference: '01712345678',
 *   callbackURL: 'https://yoursite.com/callback'
 * });
 * ```
 */
export class BkashPayment extends EventEmitter {
    private readonly tokenManager: ITokenManager;
    private readonly paymentService: IPaymentService;
    private readonly transactionService: ITransactionService;
    private readonly refundService: IRefundService;
    private readonly webhookService: IWebhookService;
    private readonly transactionUtils: ITransactionUtils;
    private readonly eventEmitter: IEventEmitter;

    /**
     * Creates a new BkashPayment instance for Checkout (URL Based) integration
     * 
     * @param {BkashConfig} config - Configuration object for bKash integration
     * @param {string} config.username - bKash merchant username
     * @param {string} config.password - bKash merchant password
     * @param {string} config.appKey - bKash application key
     * @param {string} config.appSecret - bKash application secret
     * @param {boolean} [config.isSandbox=false] - Whether to use sandbox environment
     * @param {number} [config.timeout=30000] - Request timeout in milliseconds
     * @param {number} [config.maxRetries=3] - Maximum retry attempts
     * @param {number} [config.retryDelay=1000] - Delay between retries in milliseconds
     * @param {boolean} [config.log=false] - Enable detailed logging
     * 
     * @throws {ZodError} When configuration validation fails
     */
    constructor(config: BkashConfig) {
        super();

        // Validate config
        BkashConfigSchema.parse(config);

        // Initialize service factory
        const serviceFactory = new BkashServiceFactory(config);

        // Inject services
        this.tokenManager = serviceFactory.getTokenManager();
        this.paymentService = serviceFactory.getPaymentService();
        this.transactionService = serviceFactory.getTransactionService();
        this.refundService = serviceFactory.getRefundService();
        this.webhookService = serviceFactory.getWebhookService();
        this.transactionUtils = serviceFactory.getTransactionUtils();
        this.eventEmitter = serviceFactory.getEventEmitter();

        // Forward events from internal event emitter
        this.eventEmitter.on('bkash:event', (event) => {
            this.emit('bkash:event', event);
        });
    }

    // =============================
    // Token Management Methods
    // =============================

    /**
     * Refresh existing token and get a new access token
     */
    async refreshToken(refreshTokenValue: string): Promise<ReturnType<ITokenManager['refreshToken']>> {
        return this.tokenManager.refreshToken(refreshTokenValue);
    }

    /**
     * Grant Token - Create a new access token for bKash API authorization
     */
    async grantToken(): Promise<ReturnType<ITokenManager['grantToken']>> {
        return this.tokenManager.grantToken();
    }

    // =============================
    // Payment Management Methods  
    // =============================

    /**
     * Create a new payment request
     */
    async createPayment(paymentData: Parameters<IPaymentService['createPayment']>[0]): Promise<ReturnType<IPaymentService['createPayment']>> {
        return this.paymentService.createPayment(paymentData);
    }

    /**
     * Create Payment (Full Response) - Create a new payment with complete API response
     */
    async createPaymentFull(paymentData: Parameters<IPaymentService['createPaymentFull']>[0]): Promise<ReturnType<IPaymentService['createPaymentFull']>> {
        return this.paymentService.createPaymentFull(paymentData);
    }

    /**
     * Execute Payment
     */
    async executePayment(paymentID: string): Promise<ReturnType<IPaymentService['executePayment']>> {
        return this.paymentService.executePayment(paymentID);
    }

    /**
     * Verify a payment transaction
     */
    async verifyPayment(transactionId: string): Promise<ReturnType<IPaymentService['verifyPayment']>> {
        return this.paymentService.verifyPayment(transactionId);
    }

    // =============================
    // Transaction Management Methods
    // =============================

    /**
     * Query Payment Status - Check the current status of a payment
     */
    async queryPayment(paymentID: string): Promise<ReturnType<ITransactionService['queryPayment']>> {
        return this.transactionService.queryPayment(paymentID);
    }

    /**
     * Check the status of a transaction
     */
    async checkTransactionStatus(transactionId: string): Promise<ReturnType<ITransactionService['checkTransactionStatus']>> {
        return this.transactionService.checkTransactionStatus(transactionId);
    }

    /**
     * Search for transaction details by transaction ID
     */
    async searchTransaction(searchData: Parameters<ITransactionService['searchTransaction']>[0]): Promise<ReturnType<ITransactionService['searchTransaction']>> {
        return this.transactionService.searchTransaction(searchData);
    }

    /**
     * Search transaction by transaction ID (Legacy Method)
     * @deprecated Use searchTransaction() instead
     */
    async searchTransactionLegacy(transactionId: string): Promise<ReturnType<ITransactionService['searchTransactionLegacy']>> {
        return this.transactionService.searchTransactionLegacy(transactionId);
    }

    // =============================
    // Refund Management Methods
    // =============================

    /**
     * Process a payment refund (New API v2)
     */
    async refundPayment(refundData: Parameters<IRefundService['refundPayment']>[0]): Promise<ReturnType<IRefundService['refundPayment']>> {
        return this.refundService.refundPayment(refundData);
    }

    /**
     * Process a payment refund (Legacy Method)
     * @deprecated Use refundPayment() instead
     */
    async refundPaymentLegacy(refundData: Parameters<IRefundService['refundPaymentLegacy']>[0]): Promise<ReturnType<IRefundService['refundPaymentLegacy']>> {
        return this.refundService.refundPaymentLegacy(refundData);
    }

    /**
     * Check the status of a refunded transaction
     */
    async checkRefundStatus(refundStatusData: Parameters<IRefundService['checkRefundStatus']>[0]): Promise<ReturnType<IRefundService['checkRefundStatus']>> {
        return this.refundService.checkRefundStatus(refundStatusData);
    }

    // =============================
    // Webhook Management Methods
    // =============================

    /**
     * Handle incoming webhook notifications from bKash
     */
    async handleWebhook(payload: unknown, signature?: string): Promise<ReturnType<IWebhookService['handleWebhook']>> {
        return this.webhookService.handleWebhook(payload, signature);
    }

    /**
     * Verify webhook signature for security
     */
    verifyWebhookSignature(payload: string, signature: string): ReturnType<IWebhookService['verifyWebhookSignature']> {
        return this.webhookService.verifyWebhookSignature(payload, signature);
    }

    /**
     * Create a webhook event from payment response data
     */
    createWebhookEvent(
        type: Parameters<IWebhookService['createWebhookEvent']>[0],
        data: Parameters<IWebhookService['createWebhookEvent']>[1]
    ): ReturnType<IWebhookService['createWebhookEvent']> {
        return this.webhookService.createWebhookEvent(type, data);
    }

    // =============================
    // Utility Methods
    // =============================

    /**
     * Check if a transaction is successful
     */
    isTransactionSuccessful(status: Parameters<ITransactionUtils['isTransactionSuccessful']>[0]): ReturnType<ITransactionUtils['isTransactionSuccessful']> {
        return this.transactionUtils.isTransactionSuccessful(status);
    }

    /**
     * Check if a transaction is pending
     */
    isTransactionPending(status: Parameters<ITransactionUtils['isTransactionPending']>[0]): ReturnType<ITransactionUtils['isTransactionPending']> {
        return this.transactionUtils.isTransactionPending(status);
    }

    /**
     * Check if a transaction has failed
     */
    isTransactionFailed(status: Parameters<ITransactionUtils['isTransactionFailed']>[0]): ReturnType<ITransactionUtils['isTransactionFailed']> {
        return this.transactionUtils.isTransactionFailed(status);
    }
}
