import axios, { AxiosError, AxiosInstance } from 'axios';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import {
  NagadConfig,
  NagadError,
  NagadEvent,
  NagadEventType,
  NagadPaymentData,
  NagadPaymentResponse,
  NagadRefundData,
  NagadRefundResponse,
  NagadTransactionStatus,
  NagadVerificationResponse,
} from './types/nagad';
import logger from './utils/logger';
import {
  NagadConfigSchema,
  NagadPaymentDataSchema,
  NagadRefundDataSchema,
  NagadTransactionIdSchema,
} from './validation/nagad-schemas';

export class NagadPayment extends EventEmitter {
  private readonly client: AxiosInstance;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(private readonly config: NagadConfig) {
    super();
    // Validate config
    NagadConfigSchema.parse(config);

    const baseURL = config.isSandbox
      ? 'https://sandbox.mynagad.com:30001'
      : 'https://api.mynagad.com';

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
      this.on('nagad:event', config.webhook.onEvent);
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

  private emitEvent(
    type: NagadEventType,
    data: NagadPaymentResponse | NagadVerificationResponse | NagadRefundResponse
  ): void {
    const event: NagadEvent = {
      type,
      data,
      timestamp: new Date(),
    };
    this.emit('nagad:event', event);
    logger.info('Event emitted', { type, data });
  }

  async createPayment(paymentData: NagadPaymentData): Promise<NagadPaymentResponse> {
    return this.retryOperation(async () => {
      try {
        // Validate payment data
        NagadPaymentDataSchema.parse(paymentData);

        logger.info('Creating payment', { paymentData });
        const response = await this.client.post('/api/checkout/initialize', {
          merchantId: this.config.merchantId,
          merchantNumber: this.config.merchantNumber,
          amount: paymentData.amount.toString(),
          currency: paymentData.currency,
          merchantOrderId: paymentData.merchantOrderId,
          customerMobileNo: paymentData.customerMobileNo,
          customerEmail: paymentData.customerEmail,
          callbackUrl: this.config.callbackUrl,
          additionalData: paymentData.additionalData,
        });

        logger.info('Payment created successfully', { paymentRefId: response.data.paymentRefId });
        this.emitEvent('payment.created', response.data);
        return response.data;
      } catch (error) {
        logger.error('Failed to create payment', { error, paymentData });
        throw new NagadError(
          'Failed to create payment',
          'PAYMENT_CREATE_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  async verifyPayment(paymentRefId: string): Promise<NagadVerificationResponse> {
    return this.retryOperation(async () => {
      try {
        // Validate payment reference ID
        NagadTransactionIdSchema.parse(paymentRefId);

        logger.info('Verifying payment', { paymentRefId });
        const response = await this.client.post('/api/checkout/verify', {
          merchantId: this.config.merchantId,
          paymentRefId,
        });

        logger.info('Payment verified successfully', { paymentRefId });
        this.emitEvent('payment.success', response.data);
        return response.data;
      } catch (error) {
        logger.error('Failed to verify payment', { error, paymentRefId });
        this.emitEvent(
          'payment.failed',
          error instanceof AxiosError ? error.response?.data : error
        );
        throw new NagadError(
          'Failed to verify payment',
          'PAYMENT_VERIFY_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  async checkTransactionStatus(paymentRefId: string): Promise<NagadTransactionStatus> {
    return this.retryOperation(async () => {
      try {
        // Validate payment reference ID
        NagadTransactionIdSchema.parse(paymentRefId);

        logger.info('Checking transaction status', { paymentRefId });
        const response = await this.client.get(`/api/checkout/status/${paymentRefId}`, {
          params: {
            merchantId: this.config.merchantId,
          },
        });

        logger.info('Transaction status retrieved successfully', { paymentRefId });
        return response.data;
      } catch (error) {
        logger.error('Failed to check transaction status', { error, paymentRefId });
        throw new NagadError(
          'Failed to check transaction status',
          'TRANSACTION_STATUS_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  async refundPayment(refundData: NagadRefundData): Promise<NagadRefundResponse> {
    return this.retryOperation(async () => {
      try {
        // Validate refund data
        NagadRefundDataSchema.parse(refundData);

        logger.info('Processing refund', { refundData });
        const response = await this.client.post('/api/checkout/refund', {
          merchantId: this.config.merchantId,
          paymentRefId: refundData.paymentRefId,
          orderId: refundData.orderId,
          amount: refundData.amount.toString(),
          reason: refundData.reason || 'Customer request',
        });

        logger.info('Refund processed successfully', { refundData });
        this.emitEvent('refund.success', response.data);
        return response.data;
      } catch (error) {
        logger.error('Failed to process refund', { error, refundData });
        this.emitEvent('refund.failed', error instanceof AxiosError ? error.response?.data : error);
        throw new NagadError(
          'Failed to process refund',
          'REFUND_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  // Webhook signature verification
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhook?.secret) {
      throw new NagadError('Webhook secret not configured', 'WEBHOOK_ERROR');
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
      const event = payload as NagadEvent;
      this.emit('nagad:event', event);
      logger.info('Webhook processed (no signature verification)', { event });
      return;
    }

    const payloadString = JSON.stringify(payload);
    if (!this.verifyWebhookSignature(payloadString, signature)) {
      throw new NagadError('Invalid webhook signature', 'WEBHOOK_ERROR');
    }

    // Process the webhook payload
    const event = payload as NagadEvent;
    this.emit('nagad:event', event);
    logger.info('Webhook processed', { event });
  }

  // Utility method to check if a transaction is successful
  isTransactionSuccessful(status: NagadTransactionStatus): boolean {
    return status.status === 'Success' && status.transactionStatus === 'Completed';
  }

  // Utility method to check if a transaction is pending
  isTransactionPending(status: NagadTransactionStatus): boolean {
    return status.status === 'Pending' && status.transactionStatus === 'Processing';
  }

  // Utility method to check if a transaction has failed
  isTransactionFailed(status: NagadTransactionStatus): boolean {
    return status.status === 'Failed' && status.transactionStatus === 'Failed';
  }
}
