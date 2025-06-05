import axios, { AxiosError, AxiosInstance } from 'axios';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import {
  BkashConfig,
  BkashError,
  BkashEvent,
  BkashEventType,
  PaymentData,
  PaymentResponse,
  RefundData,
  RefundResponse,
  SearchTransactionData,
  SearchTransactionResponse,
  TransactionStatus,
  VerificationResponse,
} from './types';
import logger from './utils/logger';
import {
  BkashConfigSchema,
  PaymentDataSchema,
  RefundDataSchema,
  SearchTransactionSchema,
  TransactionIdSchema,
} from './validation/schemas';

export class BkashPayment extends EventEmitter {
  private readonly client: AxiosInstance;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(private readonly config: BkashConfig) {
    super();
    // Validate config
    BkashConfigSchema.parse(config);

    const baseURL = config.isSandbox
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: config.timeout || 30000, // Default 30 seconds timeout
    });

    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('API Response', {
          url: response.config.url,
          method: response.config.method,
          status: response.status,
        });
        return response;
      },
      (error: AxiosError) => {
        logger.error('API Error', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );

    // Set up webhook handler if configured
    if (config.webhook?.onEvent) {
      this.on('bkash:event', config.webhook.onEvent);
    }
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries) {
          logger.warn(`Operation failed, retrying (${attempt}/${this.maxRetries})`, { error });
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    throw lastError;
  }

  private async getToken(): Promise<string> {
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token as string;
    }

    return this.retryOperation(async () => {
      try {
        logger.debug('Requesting new token');
        const response = await this.client.post(
          '/tokenized/checkout/token/grant',
          {
            app_key: this.config.appKey,
            app_secret: this.config.appSecret,
          },
          {
            headers: {
              username: this.config.username,
              password: this.config.password,
            },
          }
        );

        const newToken = response.data.id_token;
        if (!newToken) {
          throw new BkashError('No token received from bKash', 'TOKEN_ERROR');
        }

        this.token = newToken;
        // Token typically expires in 1 hour
        this.tokenExpiry = new Date(Date.now() + 3600000);
        logger.debug('Token obtained successfully');
        return newToken;
      } catch (error) {
        logger.error('Failed to get token', { error });
        throw new BkashError(
          'Failed to get bKash token',
          'TOKEN_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  private emitEvent(
    type: BkashEventType,
    data: PaymentResponse | VerificationResponse | RefundResponse
  ): void {
    const event: BkashEvent = {
      type,
      data,
      timestamp: new Date(),
    };
    this.emit('bkash:event', event);
    logger.info('Event emitted', { type, data });
  }

  async createPayment(paymentData: PaymentData): Promise<PaymentResponse> {
    return this.retryOperation(async () => {
      try {
        // Validate payment data
        PaymentDataSchema.parse(paymentData);

        logger.info('Creating payment', { paymentData });
        const token = await this.getToken();
        const response = await this.client.post(
          '/tokenized/checkout/create',
          {
            mode: '0011',
            payerReference: paymentData.payerReference || ' ',
            callbackURL: paymentData.callbackURL,
            amount: paymentData.amount.toString(),
            currency: paymentData.currency,
            intent: paymentData.intent,
            merchantInvoiceNumber: paymentData.merchantInvoiceNumber,
          },
          {
            headers: {
              Authorization: token,
              'x-app-key': this.config.appKey,
            },
          }
        );

        logger.info('Payment created successfully', { paymentId: response.data.paymentID });
        this.emitEvent('payment.created', response.data);
        return response.data;
      } catch (error) {
        logger.error('Failed to create payment', { error, paymentData });
        throw new BkashError(
          'Failed to create payment',
          'PAYMENT_CREATE_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  async verifyPayment(transactionId: string): Promise<VerificationResponse> {
    return this.retryOperation(async () => {
      try {
        // Validate transaction ID
        TransactionIdSchema.parse(transactionId);

        logger.info('Verifying payment', { transactionId });
        const token = await this.getToken();
        const response = await this.client.post(
          '/tokenized/checkout/execute',
          {
            paymentID: transactionId,
          },
          {
            headers: {
              Authorization: token,
              'x-app-key': this.config.appKey,
            },
          }
        );

        logger.info('Payment verified successfully', { transactionId });
        this.emitEvent('payment.success', response.data);
        return response.data;
      } catch (error) {
        logger.error('Failed to verify payment', { error, transactionId });
        this.emitEvent(
          'payment.failed',
          error instanceof AxiosError ? error.response?.data : error
        );
        throw new BkashError(
          'Failed to verify payment',
          'PAYMENT_VERIFY_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  async checkTransactionStatus(transactionId: string): Promise<TransactionStatus> {
    return this.retryOperation(async () => {
      try {
        // Validate transaction ID
        TransactionIdSchema.parse(transactionId);

        logger.info('Checking transaction status', { transactionId });
        const token = await this.getToken();
        const response = await this.client.get(
          `/tokenized/checkout/transaction/status/${transactionId}`,
          {
            headers: {
              Authorization: token,
              'x-app-key': this.config.appKey,
            },
          }
        );

        logger.info('Transaction status retrieved successfully', { transactionId });
        return response.data;
      } catch (error) {
        logger.error('Failed to check transaction status', { error, transactionId });
        throw new BkashError(
          'Failed to check transaction status',
          'TRANSACTION_STATUS_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  async refundPayment(refundData: RefundData): Promise<RefundResponse> {
    return this.retryOperation(async () => {
      try {
        // Validate refund data
        RefundDataSchema.parse(refundData);

        logger.info('Processing refund', { refundData });
        const token = await this.getToken();
        const response = await this.client.post(
          '/tokenized/checkout/payment/refund',
          {
            paymentID: refundData.paymentId,
            amount: refundData.amount.toString(),
            trxID: refundData.transactionId,
            reason: refundData.reason || 'Customer request',
          },
          {
            headers: {
              Authorization: token,
              'x-app-key': this.config.appKey,
            },
          }
        );

        logger.info('Refund processed successfully', { refundData });
        this.emitEvent('refund.success', response.data);
        return response.data;
      } catch (error) {
        logger.error('Failed to process refund', { error, refundData });
        this.emitEvent('refund.failed', error instanceof AxiosError ? error.response?.data : error);
        throw new BkashError(
          'Failed to process refund',
          'REFUND_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  async searchTransaction(searchData: SearchTransactionData): Promise<SearchTransactionResponse> {
    return this.retryOperation(async () => {
      try {
        // Validate search data
        SearchTransactionSchema.parse(searchData);

        logger.info('Searching transaction', { searchData });
        const token = await this.getToken();
        const response = await this.client.post(
          '/tokenized/checkout/transaction/search',
          {
            trxID: searchData.transactionId,
          },
          {
            headers: {
              Authorization: token,
              'x-app-key': this.config.appKey,
            },
          }
        );

        logger.info('Transaction search completed', { searchData });
        return response.data;
      } catch (error) {
        logger.error('Failed to search transaction', { error, searchData });
        throw new BkashError(
          'Failed to search transaction',
          'SEARCH_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  // Webhook signature verification
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhook?.secret) {
      throw new BkashError('Webhook secret not configured', 'WEBHOOK_ERROR');
    }

    const hmac = crypto.createHmac('sha256', this.config.webhook.secret);
    const calculatedSignature = hmac.update(payload).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature));
    } catch {
      return false;
    }
  }

  // Handle incoming webhook
  async handleWebhook(payload: unknown, signature: string): Promise<void> {
    // If no secret is configured, skip signature verification
    if (!this.config.webhook?.secret) {
      // Process the webhook payload
      const event = payload as BkashEvent;
      this.emit('bkash:event', event);
      logger.info('Webhook processed (no signature verification)', { event });
      return;
    }

    const payloadString = JSON.stringify(payload);
    if (!this.verifyWebhookSignature(payloadString, signature)) {
      throw new BkashError('Invalid webhook signature', 'WEBHOOK_ERROR');
    }

    // Process the webhook payload
    const event = payload as BkashEvent;
    this.emit('bkash:event', event);
    logger.info('Webhook processed', { event });
  }

  // Utility method to check if a transaction is successful
  isTransactionSuccessful(status: TransactionStatus): boolean {
    return status.statusCode === '0000' && status.statusMessage === 'Successful';
  }

  // Utility method to check if a transaction is pending
  isTransactionPending(status: TransactionStatus): boolean {
    return status.statusCode === '0001' && status.statusMessage === 'Pending';
  }

  // Utility method to check if a transaction has failed
  isTransactionFailed(status: TransactionStatus): boolean {
    return status.statusCode === '0002' && status.statusMessage === 'Failed';
  }
}
