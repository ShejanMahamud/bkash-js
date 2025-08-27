import { IEventEmitter, IHttpClient, ILogger, IRetryService } from '../interfaces/base';
import {
    IPaymentService,
    IRefundService,
    ITokenManager,
    ITransactionService,
    ITransactionUtils,
    IWebhookService,
} from '../interfaces/services';
import { BkashConfig } from '../types/types';

// Service implementations
import { EventEmitterAdapter } from './event-emitter-adapter';
import { AxiosHttpClient } from './http-client';
import { LoggerAdapter } from './logger-adapter';
import { PaymentService } from './payment-service';
import { RefundService } from './refund-service';
import { RetryService } from './retry-service';
import { TokenManager } from './token-manager';
import { TransactionService } from './transaction-service';
import { TransactionUtils } from './transaction-utils';
import { WebhookService } from './webhook-service';

/**
 * Service factory for creating and managing all bKash services
 */
export class BkashServiceFactory {
    private httpClient: IHttpClient;
    private logger: ILogger;
    private retryService: IRetryService;
    private eventEmitter: IEventEmitter;
    private tokenManager: ITokenManager;
    private paymentService: IPaymentService;
    private transactionService: ITransactionService;
    private refundService: IRefundService;
    private webhookService: IWebhookService;
    private transactionUtils: ITransactionUtils;

    constructor(private readonly config: BkashConfig) {
        // Initialize base services
        this.logger = new LoggerAdapter(config.log || false);
        this.httpClient = new AxiosHttpClient(config, this.logger);
        this.retryService = new RetryService(
            config.maxRetries || 3,
            config.retryDelay || 1000,
            this.logger
        );
        this.eventEmitter = new EventEmitterAdapter();

        // Initialize core services
        this.tokenManager = new TokenManager(config, this.httpClient, this.logger, this.retryService);
        this.paymentService = new PaymentService(
            config,
            this.httpClient,
            this.logger,
            this.retryService,
            this.tokenManager,
            this.eventEmitter
        );
        this.transactionService = new TransactionService(
            config,
            this.httpClient,
            this.logger,
            this.retryService,
            this.tokenManager
        );
        this.refundService = new RefundService(
            config,
            this.httpClient,
            this.logger,
            this.retryService,
            this.tokenManager,
            this.eventEmitter
        );
        this.webhookService = new WebhookService(config, this.logger, this.eventEmitter);
        this.transactionUtils = new TransactionUtils();
    }

    getHttpClient(): IHttpClient {
        return this.httpClient;
    }

    getLogger(): ILogger {
        return this.logger;
    }

    getRetryService(): IRetryService {
        return this.retryService;
    }

    getEventEmitter(): IEventEmitter {
        return this.eventEmitter;
    }

    getTokenManager(): ITokenManager {
        return this.tokenManager;
    }

    getPaymentService(): IPaymentService {
        return this.paymentService;
    }

    getTransactionService(): ITransactionService {
        return this.transactionService;
    }

    getRefundService(): IRefundService {
        return this.refundService;
    }

    getWebhookService(): IWebhookService {
        return this.webhookService;
    }

    getTransactionUtils(): ITransactionUtils {
        return this.transactionUtils;
    }
}
