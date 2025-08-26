import axios, { AxiosError, AxiosInstance } from 'axios';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import {
  BkashConfig,
  BkashError,
  BkashEvent,
  BkashEventType,
  CreatePaymentResponse,
  ExecutePaymentResponse,
  GrantTokenRequest,
  GrantTokenResponse,
  LegacyRefundData,
  LegacyRefundResponse,
  LegacySearchTransactionResponse,
  PaymentData,
  PaymentResponse,
  QueryPaymentRequest,
  QueryPaymentResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RefundData,
  RefundResponse,
  RefundStatusRequest,
  RefundStatusResponse,
  SearchTransactionData,
  SearchTransactionResponse,
  TransactionStatus,
  VerificationResponse
} from './types/types';
import logger from './utils/logger';
import {
  BkashConfigSchema,
  LegacyRefundDataSchema,
  PaymentDataSchema,
  RefundDataSchema,
  RefundStatusRequestSchema,
  SearchTransactionSchema,
  TransactionIdSchema,
} from './validation/schemas';

/**
 * bKash Checkout (URL Based) Payment Integration
 * 
 * This class provides a comprehensive interface for bKash Checkout URL-based payment integration,
 * including payment creation, execution, verification, refunds, and transaction management.
 * It extends EventEmitter to provide real-time event notifications for payment lifecycle events.
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
 *   amount: 100,
 *   currency: 'BDT',
 *   intent: 'sale',
 *   merchantInvoiceNumber: 'INV-001',
 *   callbackURL: 'https://yoursite.com/callback'
 * });
 * ```
 */
export class BkashPayment extends EventEmitter {
  /** Axios instance for making HTTP requests to bKash API */
  private readonly client: AxiosInstance;
  /** Current authentication token */
  private token: string | null = null;
  /** Token expiration timestamp */
  private tokenExpiry: Date | null = null;
  /** Maximum number of retry attempts for failed operations */
  private readonly maxRetries: number;
  /** Delay in milliseconds between retry attempts */
  private readonly retryDelay: number;

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
   * 
   * @example
   * ```typescript
   * const bkash = new BkashPayment({
   *   username: 'merchant_user',
   *   password: 'merchant_pass',
   *   appKey: 'app_key_123',
   *   appSecret: 'app_secret_456',
   *   isSandbox: true,
   *   timeout: 30000,
   *   maxRetries: 3,
   *   log: true
   * });
   * ```
   */
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

  }

  /**
   * Retry wrapper for operations that may fail due to network issues
   * 
   * @private
   * @template T - The return type of the operation
   * @param {() => Promise<T>} operation - The async operation to retry
   * @returns {Promise<T>} The result of the operation
   * 
   * @throws {Error} The last error encountered if all retries fail
   */
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

  /**
   * Obtains and manages authentication token from bKash API
   * 
   * Automatically handles token caching and renewal. Tokens are cached for 1 hour
   * and automatically refreshed when expired.
   * 
   * @private
   * @returns {Promise<string>} Valid authentication token
   * 
   * @throws {BkashError} When token retrieval fails
   */
  private async getToken(): Promise<string> {
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token as string;
    }

    return this.retryOperation(async () => {
      try {
        logger.debug('Requesting new token');
        const requestData: GrantTokenRequest = {
          app_key: this.config.appKey,
          app_secret: this.config.appSecret,
        };

        const response = await this.client.post<GrantTokenResponse>(
          '/tokenized/checkout/token/grant',
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              username: this.config.username,
              password: this.config.password,
            },
          }
        );

        const tokenData = response.data;
        if (!tokenData.id_token) {
          throw new BkashError('No token received from bKash', 'TOKEN_ERROR');
        }

        this.token = tokenData.id_token;
        // expires_in is a number (seconds) according to API docs
        const expiresIn = tokenData.expires_in || 3600;
        this.tokenExpiry = new Date(Date.now() + (expiresIn * 1000));

        logger.debug('Token obtained successfully', {
          tokenType: tokenData.token_type,
          expiresIn: tokenData.expires_in,
          statusCode: tokenData.statusCode,
          statusMessage: tokenData.statusMessage
        }); return tokenData.id_token;
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

  /**
   * Refresh existing token and get a new access token
   * 
   * @param {string} refreshTokenValue - The refresh token value from Grant Token API
   * @returns {Promise<RefreshTokenResponse>} New token response containing id_token, refresh_token, etc.
   * 
   * @throws {BkashError} When token refresh fails
   * 
   * @example
   * ```typescript
   * const tokenResponse = await bkash.refreshToken('existing_refresh_token');
   * console.log('New token:', tokenResponse.id_token);
   * ```
   */
  async refreshToken(refreshTokenValue: string): Promise<RefreshTokenResponse> {
    try {
      if (this.config.log) {
        logger.info('Refreshing token', { refreshTokenValue });
      }

      const requestData: RefreshTokenRequest = {
        app_key: this.config.appKey,
        app_secret: this.config.appSecret,
        refresh_token: refreshTokenValue,
      };

      const response = await this.client.post<RefreshTokenResponse>(
        '/tokenized/checkout/token/refresh',
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            username: this.config.username,
            password: this.config.password,
          },
        }
      );

      if (this.config.log) {
        logger.info('Token refreshed', {
          response: {
            tokenType: response.data.token_type,
            expiresIn: response.data.expires_in,
            statusCode: response.data.statusCode,
            statusMessage: response.data.statusMessage
          }
        });
      }

      return response.data;
    } catch (error) {
      if (this.config.log) {
        logger.error('Failed to refresh token', { error, refreshTokenValue });
      }
      throw new BkashError(
        'Failed to refresh token',
        'TOKEN_REFRESH_ERROR',
        error instanceof AxiosError ? error.response?.data : error
      );
    }
  }

  /**
   * Grant Token - Create a new access token for bKash API authorization
   * 
   * This method provides direct access to the Grant Token API, returning the full response
   * including the access token, refresh token, and expiry information.
   * 
   * @returns {Promise<GrantTokenResponse>} Complete grant token response
   * 
   * @throws {BkashError} When token grant fails
   * 
   * @example
   * ```typescript
   * const tokenResponse = await bkash.grantToken();
   * console.log('Access token:', tokenResponse.id_token);
   * console.log('Expires in:', tokenResponse.expires_in, 'seconds');
   * console.log('Refresh token:', tokenResponse.refresh_token);
   * ```
   */
  async grantToken(): Promise<GrantTokenResponse> {
    try {
      if (this.config.log) {
        logger.info('Requesting new grant token');
      }

      const requestData: GrantTokenRequest = {
        app_key: this.config.appKey,
        app_secret: this.config.appSecret,
      };

      const response = await this.client.post<GrantTokenResponse>(
        '/tokenized/checkout/token/grant',
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            username: this.config.username,
            password: this.config.password,
          },
        }
      );

      if (this.config.log) {
        logger.info('Grant token obtained', {
          tokenType: response.data.token_type,
          expiresIn: response.data.expires_in,
          statusCode: response.data.statusCode,
          statusMessage: response.data.statusMessage
        });
      }

      return response.data;
    } catch (error) {
      if (this.config.log) {
        logger.error('Failed to grant token', { error });
      }
      throw new BkashError(
        'Failed to grant bKash token',
        'TOKEN_GRANT_ERROR',
        error instanceof AxiosError ? error.response?.data : error
      );
    }
  }

  /**
   * Emits payment events to registered event listeners
   * 
   * @private
   * @param {BkashEventType} type - The type of event to emit
   * @param {PaymentResponse | VerificationResponse | RefundResponse | Record<string, unknown>} data - Event data payload
   * 
   * @fires BkashPayment#bkash:event
   */
  private emitEvent(
    type: BkashEventType,
    data: PaymentResponse | ExecutePaymentResponse | VerificationResponse | RefundResponse | Record<string, unknown>
  ): void {
    const event: BkashEvent = {
      type,
      data,
      timestamp: new Date(),
    };
    this.emit('bkash:event', event);
    if (this.config.log) {
      logger.info('Event emitted', { type, data });
    }
  }

  /**
   * Execute Payment
   * 
   * This API will finalize a payment request.
   * Using this API, a payment request created using the Create Payment API can be finalized.
   * Thus, a payment can be successful or can be failure. The final result of the payment 
   * request can be found through this API.
   * 
   * @param {string} paymentID - PaymentID returned in the response of Create Payment API
   * @returns {Promise<ExecutePaymentResponse>} Execute payment response
   * @returns {string} returns.paymentID - bKash generated payment ID
   * @returns {string} returns.statusCode - Unique code assigned to the API call status
   * @returns {string} returns.statusMessage - Message associated with the status
   * @returns {string} returns.customerMsisdn - MSISDN of the customer who performed the payment
   * @returns {string} returns.payerReference - The payer reference value provided during create payment
   * @returns {string} returns.paymentExecuteTime - The time when the payment was executed (yyyy-MM-dd'T'HH:mm:ss 'GMT'Z)
   * @returns {string} returns.trxID - Transaction ID created after successful completion
   * @returns {string} returns.transactionStatus - Final status of the transaction ("Completed" for success)
   * @returns {string} returns.amount - Amount of the payment transaction
   * @returns {string} returns.currency - Currency of the mentioned amount (currently only "BDT")
   * @returns {string} returns.intent - Intent for the payment transaction ("sale" for checkout)
   * @returns {string} returns.merchantInvoiceNumber - Unique invoice number used at merchant side
   * 
   * @throws {BkashError} When payment execution fails
   * @throws {ZodError} When paymentID validation fails
   * 
   * @fires BkashPayment#bkash:event - Emits 'payment.success' event on successful execution
   * @fires BkashPayment#bkash:event - Emits 'payment.failed' event on execution failure
   * 
   * @example
   * ```typescript
   * // Create payment first
   * const payment = await bkash.createPayment({
   *   amount: '100',
   *   currency: 'BDT',
   *   intent: 'sale',
   *   merchantInvoiceNumber: 'INV-001',
   *   callbackURL: 'https://yoursite.com/callback',
   *   payerReference: '01712345678'
   * });
   * 
   * // Customer completes payment in bKash app
   * // Then execute the payment
   * const result = await bkash.executePayment(payment.paymentID);
   * 
   * if (result.transactionStatus === 'Completed') {
   *   console.log('✅ Payment successful!');
   *   console.log('Transaction ID:', result.trxID);
   *   console.log('Customer:', result.customerMsisdn);
   *   console.log('Amount:', result.amount, result.currency);
   * } else {
   *   console.log('❌ Payment failed:', result.statusMessage);
   * }
   * ```
   * 
   * @note Payment ID Limitations:
   * - A payment ID will expire after 24 hours if not used to execute payment
   * - A payment ID is valid for one execution only
   * - After execution (successful or failed), the payment ID cannot be used again for execution
   * - Payment ID can still be used for query and search purposes after execution
   */
  async executePayment(paymentID: string): Promise<ExecutePaymentResponse> {
    return this.retryOperation(async () => {
      try {
        // Validate paymentID
        TransactionIdSchema.parse(paymentID);

        if (this.config.log) {
          logger.info('Executing payment', { paymentID });
        }
        const token = await this.getToken();
        const response = await this.client.post(
          '/tokenized/checkout/execute',
          { paymentID },
          {
            headers: {
              Authorization: token,
              'x-app-key': this.config.appKey,
            },
          }
        );

        if (this.config.log) {
          logger.info('Payment executed', { paymentID });
        }
        this.emitEvent('payment.success', response.data);
        return response.data;
      } catch (error) {
        if (this.config.log) {
          logger.error('Failed to execute payment', { error, paymentID });
        }
        this.emitEvent(
          'payment.failed',
          error instanceof AxiosError ? error.response?.data : error
        );
        throw new BkashError(
          'Failed to execute payment',
          'PAYMENT_EXECUTE_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  /**
   * Create a new payment request
   * 
   * Initiates a payment request with bKash. The customer will need to authorize
   * this payment through the bKash mobile app or USSD before it can be executed.
   * 
   * @param {PaymentData} paymentData - Payment information
   * @param {number} paymentData.amount - Payment amount (must be positive)
   * @param {string} paymentData.currency - Currency code (3 characters, e.g., 'BDT')
   * @param {string} paymentData.intent - Payment intent (usually 'sale')
   * @param {string} paymentData.merchantInvoiceNumber - Unique merchant invoice number
   * @param {string} paymentData.callbackURL - URL where bKash will send payment notifications
   * @param {string} [paymentData.payerReference] - Optional reference for the payer
   * 
   * @returns {Promise<PaymentResponse>} Payment creation response
   * @returns {string} returns.paymentID - Unique payment identifier for execution
   * @returns {string} returns.statusCode - Response status code
   * @returns {string} returns.statusMessage - Response status message
   * @returns {string} returns.paymentExecuteTime - Payment creation timestamp
   * @returns {string} returns.trxID - bKash transaction ID
   * @returns {string} returns.amount - Payment amount
   * @returns {string} returns.currency - Payment currency
   * @returns {string} returns.intent - Payment intent
   * @returns {string} returns.merchantInvoiceNumber - Merchant invoice number
   * 
   * @throws {BkashError} When payment creation fails
   * @throws {ZodError} When payment data validation fails
   * 
   * @fires BkashPayment#bkash:event - Emits 'payment.created' event
   * 
   * @example
   * ```typescript
   * const payment = await bkash.createPayment({
   *   amount: 1000,
   *   currency: 'BDT',
   *   intent: 'sale',
   *   merchantInvoiceNumber: 'INV-' + Date.now(),
   *   callbackURL: 'https://yourwebsite.com/payment/callback',
   *   payerReference: 'customer@email.com'
   * });
   * 
   * console.log('Payment ID:', payment.paymentID);
   * // Customer needs to authorize this payment in bKash app
   * // Then call executePayment(payment.paymentID)
   * ```
   */
  async createPayment(paymentData: PaymentData): Promise<PaymentResponse> {
    return this.retryOperation(async () => {
      try {
        // Validate payment data
        PaymentDataSchema.parse(paymentData);

        if (this.config.log) {
          logger.info('Creating payment', { paymentData });
        }
        const token = await this.getToken();

        // Prepare request payload according to API specification
        const requestPayload = {
          mode: paymentData.mode || '0011',
          payerReference: paymentData.payerReference,
          callbackURL: paymentData.callbackURL,
          amount: paymentData.amount,
          currency: paymentData.currency,
          intent: paymentData.intent,
          merchantInvoiceNumber: paymentData.merchantInvoiceNumber,
          ...(paymentData.merchantAssociationInfo && {
            merchantAssociationInfo: paymentData.merchantAssociationInfo
          })
        };

        const response = await this.client.post<CreatePaymentResponse>(
          '/tokenized/checkout/create',
          requestPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: token,
              'X-App-Key': this.config.appKey,
            },
          }
        );

        if (this.config.log) {
          logger.info('Payment created successfully', {
            paymentId: response.data.paymentID,
            transactionStatus: response.data.transactionStatus,
            statusCode: response.data.statusCode
          });
        }

        // Convert CreatePaymentResponse to PaymentResponse for backward compatibility
        const paymentResponse: PaymentResponse = {
          paymentID: response.data.paymentID,
          bkashURL: response.data.bkashURL,
          statusCode: response.data.statusCode,
          statusMessage: response.data.statusMessage,
          amount: response.data.amount,
          currency: response.data.currency,
          intent: response.data.intent,
          merchantInvoiceNumber: response.data.merchantInvoiceNumber,
          paymentCreateTime: response.data.paymentCreateTime,
          transactionStatus: response.data.transactionStatus,
          callbackURL: response.data.callbackURL,
          successCallbackURL: response.data.successCallbackURL,
          failureCallbackURL: response.data.failureCallbackURL,
          cancelledCallbackURL: response.data.cancelledCallbackURL,
          payerReference: paymentData.payerReference,
        };

        this.emitEvent('payment.created', paymentResponse);
        return paymentResponse;
      } catch (error) {
        if (this.config.log) {
          logger.error('Failed to create payment', { error, paymentData });
        }
        throw new BkashError(
          'Failed to create payment',
          'PAYMENT_CREATE_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  /**
   * Create Payment (Full Response) - Create a new payment with complete API response
   * 
   * This method returns the complete CreatePaymentResponse as per bKash API specification,
   * including all callback URLs and additional fields.
   * 
   * @param {PaymentData} paymentData - Payment creation data
   * @returns {Promise<CreatePaymentResponse>} Complete create payment response from bKash API
   * 
   * @throws {BkashError} When payment creation fails
   * @throws {ZodError} When payment data validation fails
   * 
   * @fires BkashPayment#bkash:event - Emits 'payment.created' event
   * 
   * @example
   * ```typescript
   * const payment = await bkash.createPaymentFull({
   *   payerReference: '01723888888',
   *   callbackURL: 'https://yourdomain.com',
   *   amount: '500',
   *   currency: 'BDT',
   *   intent: 'sale',
   *   merchantInvoiceNumber: 'INV-' + Date.now(),
   *   merchantAssociationInfo: 'MI05MID54RF09123456789'
   * });
   * 
   * console.log('Payment ID:', payment.paymentID);
   * console.log('Success Callback:', payment.successCallbackURL);
   * console.log('bKash URL:', payment.bkashURL);
   * ```
   */
  async createPaymentFull(paymentData: PaymentData): Promise<CreatePaymentResponse> {
    return this.retryOperation(async () => {
      try {
        // Validate payment data
        PaymentDataSchema.parse(paymentData);

        if (this.config.log) {
          logger.info('Creating payment (full response)', { paymentData });
        }
        const token = await this.getToken();

        // Prepare request payload according to API specification
        const requestPayload = {
          mode: paymentData.mode || '0011',
          payerReference: paymentData.payerReference,
          callbackURL: paymentData.callbackURL,
          amount: paymentData.amount,
          currency: paymentData.currency,
          intent: paymentData.intent,
          merchantInvoiceNumber: paymentData.merchantInvoiceNumber,
          ...(paymentData.merchantAssociationInfo && {
            merchantAssociationInfo: paymentData.merchantAssociationInfo
          })
        };

        const response = await this.client.post<CreatePaymentResponse>(
          '/tokenized/checkout/create',
          requestPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: token,
              'X-App-Key': this.config.appKey,
            },
          }
        );

        if (this.config.log) {
          logger.info('Payment created successfully (full response)', {
            paymentId: response.data.paymentID,
            transactionStatus: response.data.transactionStatus,
            statusCode: response.data.statusCode
          });
        }

        this.emitEvent('payment.created', response.data);
        return response.data;
      } catch (error) {
        if (this.config.log) {
          logger.error('Failed to create payment', { error, paymentData });
        }
        throw new BkashError(
          'Failed to create payment',
          'PAYMENT_CREATE_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  /**
   * Verify a payment transaction
   * 
   * Verifies the status and details of a payment transaction. This method
   * can be used to confirm payment completion and retrieve transaction details.
   * 
   * @param {string} transactionId - The payment ID or transaction ID to verify
   * @returns {Promise<VerificationResponse>} Payment verification response
   * @returns {string} returns.paymentID - Unique payment identifier
   * @returns {string} returns.status - Payment status
   * @returns {string} returns.statusCode - Verification status code
   * @returns {string} returns.statusMessage - Verification status message
   * @returns {string} returns.paymentExecuteTime - Payment execution timestamp
   * @returns {string} returns.trxID - bKash transaction ID
   * @returns {string} returns.amount - Payment amount
   * @returns {string} returns.currency - Payment currency
   * @returns {string} returns.intent - Payment intent
   * @returns {string} returns.merchantInvoiceNumber - Merchant invoice number
   * 
   * @throws {BkashError} When verification fails
   * @throws {ZodError} When transaction ID validation fails
   * 
   * @fires BkashPayment#bkash:event - Emits 'payment.success' or 'payment.failed' events
   * 
   * @example
   * ```typescript
   * try {
   *   const verification = await bkash.verifyPayment('TXN123456789');
   *   if (verification.statusCode === '0000') {
   *     console.log('Payment verified successfully');
   *   }
   * } catch (error) {
   *   console.error('Verification failed:', error.message);
   * }
   * ```
   */
  async verifyPayment(transactionId: string): Promise<VerificationResponse> {
    return this.retryOperation(async () => {
      try {
        // Validate transaction ID
        TransactionIdSchema.parse(transactionId);

        if (this.config.log) {
          logger.info('Verifying payment', { transactionId });
        }
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

        if (this.config.log) {
          logger.info('Payment verified successfully', { transactionId });
        }
        this.emitEvent('payment.success', response.data);
        return response.data;
      } catch (error) {
        if (this.config.log) {
          logger.error('Failed to verify payment', { error, transactionId });
        }
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

  /**
   * Query Payment Status - Check the current status of a payment
   * 
   * This API provides the current status of a specific payment using the paymentID.
   * The payment status can be either "Initiated" (not processed yet) or "Completed" 
   * (payment validation and execution performed successfully).
   * 
   * @param {string} paymentID - The bKash generated paymentID from Create Payment API
   * @returns {Promise<QueryPaymentResponse>} Complete payment status response
   * 
   * @throws {BkashError} When query payment fails
   * @throws {ZodError} When paymentID validation fails
   * 
   * @example
   * ```typescript
   * try {
   *   const paymentStatus = await bkash.queryPayment('TR0001IV1565085942653');
   *   console.log('Transaction Status:', paymentStatus.transactionStatus);
   *   console.log('User Verification:', paymentStatus.userVerificationStatus);
   *   
   *   if (paymentStatus.transactionStatus === 'Completed') {
   *     console.log('Payment completed successfully');
   *     console.log('Transaction ID:', paymentStatus.trxID);
   *   } else if (paymentStatus.transactionStatus === 'Initiated') {
   *     console.log('Payment still in progress');
   *   }
   * } catch (error) {
   *   console.error('Query payment failed:', error.message);
   * }
   * ```
   */
  async queryPayment(paymentID: string): Promise<QueryPaymentResponse> {
    return this.retryOperation(async () => {
      try {
        // Validate payment ID
        TransactionIdSchema.parse(paymentID);

        if (this.config.log) {
          logger.info('Querying payment status', { paymentID });
        }

        const token = await this.getToken();
        const requestData: QueryPaymentRequest = {
          paymentID: paymentID,
        };

        const response = await this.client.post<QueryPaymentResponse>(
          '/tokenized/checkout/payment/status',
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: token,
              'X-App-Key': this.config.appKey,
            },
          }
        );

        if (this.config.log) {
          logger.info('Payment status retrieved successfully', {
            paymentID,
            transactionStatus: response.data.transactionStatus,
            userVerificationStatus: response.data.userVerificationStatus,
            statusCode: response.data.statusCode
          });
        }

        return response.data;
      } catch (error) {
        if (this.config.log) {
          logger.error('Failed to query payment status', { error, paymentID });
        }
        throw new BkashError(
          'Failed to query payment status',
          'PAYMENT_QUERY_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  /**
   * Check the status of a transaction
   * 
   * Retrieves the current status of a payment transaction. This is useful
   * for tracking payment progress and handling different payment states.
   * 
   * @param {string} transactionId - The transaction ID to check
   * @returns {Promise<TransactionStatus>} Transaction status response
   * @returns {string} returns.statusCode - Transaction status code ('0000' = successful, '0001' = pending, '0002' = failed)
   * @returns {string} returns.statusMessage - Human-readable status message
   * @returns {string} returns.paymentID - Unique payment identifier
   * @returns {string} returns.trxID - bKash transaction ID
   * @returns {string} returns.amount - Transaction amount
   * @returns {string} returns.currency - Transaction currency
   * @returns {string} returns.transactionStatus - Detailed transaction status
   * @returns {string} returns.paymentExecuteTime - Transaction execution timestamp
   * 
   * @throws {BkashError} When status check fails
   * @throws {ZodError} When transaction ID validation fails
   * 
   * @example
   * ```typescript
   * const status = await bkash.checkTransactionStatus('TXN123456789');
   * 
   * if (bkash.isTransactionSuccessful(status)) {
   *   console.log('Transaction completed successfully');
   * } else if (bkash.isTransactionPending(status)) {
   *   console.log('Transaction is still pending');
   * } else if (bkash.isTransactionFailed(status)) {
   *   console.log('Transaction failed');
   * }
   * ```
   */
  async checkTransactionStatus(transactionId: string): Promise<TransactionStatus> {
    return this.retryOperation(async () => {
      try {
        // Validate transaction ID
        TransactionIdSchema.parse(transactionId);

        if (this.config.log) {
          logger.info('Checking transaction status', { transactionId });
        }
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

        if (this.config.log) {
          logger.info('Transaction status retrieved successfully', { transactionId });
        }
        return response.data;
      } catch (error) {
        if (this.config.log) {
          logger.error('Failed to check transaction status', { error, transactionId });
        }
        throw new BkashError(
          'Failed to check transaction status',
          'TRANSACTION_STATUS_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  /**
   * Process a payment refund (New API v2)
   * 
   * Initiates a refund for a completed payment using the new v2 API. Supports full or partial refunds
   * with up to 10 partial refunds allowed per transaction until the full amount is refunded.
   * 
   * @param {RefundData} refundData - Refund information
   * @param {string} refundData.paymentId - The original payment ID to refund
   * @param {string} refundData.trxId - The original transaction ID from execute payment
   * @param {string} refundData.refundAmount - Refund amount as string (max 2 decimals, e.g., "25.20")
   * @param {string} refundData.sku - Product/service information (max 255 characters)
   * @param {string} refundData.reason - Refund reason (max 255 characters)
   * 
   * @returns {Promise<RefundResponse>} Refund processing response
   * @returns {string} returns.originalTrxId - Original transaction ID
   * @returns {string} returns.refundTrxId - Unique refund transaction ID
   * @returns {string} returns.refundTransactionStatus - Refund status ("Completed" = successful)
   * @returns {string} returns.originalTrxAmount - Original transaction amount
   * @returns {string} returns.refundAmount - Refunded amount
   * @returns {string} returns.currency - Refund currency (BDT)
   * @returns {string} returns.completedTime - Refund completion timestamp
   * @returns {string} returns.sku - Product/service information
   * @returns {string} returns.reason - Refund reason
   * 
   * @throws {BkashError} When refund processing fails
   * @throws {ZodError} When refund data validation fails
   * 
   * @fires BkashPayment#bkash:event - Emits 'refund.success' or 'refund.failed' events
   * 
   * @example
   * ```typescript
   * try {
   *   const refund = await bkash.refundPayment({
   *     paymentId: 'TR0001xt7mXxG1718274354990',
   *     trxId: 'BFD90JRLST',
   *     refundAmount: '1.00',
   *     sku: 'PRODUCT-001',
   *     reason: 'Customer requested cancellation'
   *   });
   *   
   *   if (refund.refundTransactionStatus === 'Completed') {
   *     console.log('Refund successful:', refund.refundTrxId);
   *   }
   * } catch (error) {
   *   console.error('Refund failed:', error.message);
   * }
   * ```
   */
  async refundPayment(refundData: RefundData): Promise<RefundResponse> {
    return this.retryOperation(async () => {
      try {
        // Validate refund data
        RefundDataSchema.parse(refundData);

        if (this.config.log) {
          logger.info('Processing refund (v2 API)', { refundData });
        }
        const token = await this.getToken();

        const response = await this.client.post<RefundResponse>(
          '/v2/tokenized-checkout/refund/payment/transaction',
          {
            paymentId: refundData.paymentId,
            trxId: refundData.trxId,
            refundAmount: refundData.refundAmount,
            sku: refundData.sku,
            reason: refundData.reason,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: token,
              'X-App-Key': this.config.appKey,
            },
          }
        );

        if (this.config.log) {
          logger.info('Refund processed successfully (v2 API)', {
            originalTrxId: response.data.originalTrxId,
            refundTrxId: response.data.refundTrxId,
            refundTransactionStatus: response.data.refundTransactionStatus,
            refundAmount: response.data.refundAmount
          });
        }

        this.emitEvent('refund.success', response.data);
        return response.data;
      } catch (error) {
        if (this.config.log) {
          logger.error('Failed to process refund (v2 API)', { error, refundData });
        }
        this.emitEvent('refund.failed', error instanceof AxiosError ? error.response?.data : error);
        throw new BkashError(
          'Failed to process refund',
          'REFUND_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  /**
   * Process a payment refund (Legacy Method)
   * 
   * @deprecated Use refundPayment() instead. This method is provided for backward compatibility.
   * 
   * @param {LegacyRefundData} refundData - Legacy refund information
   * @param {string} refundData.paymentId - The original payment ID to refund
   * @param {string} refundData.transactionId - The original transaction ID
   * @param {number} refundData.amount - Refund amount as number
   * @param {string} [refundData.reason] - Reason for refund
   * 
   * @returns {Promise<LegacyRefundResponse>} Legacy refund response
   * 
   * @example
   * ```typescript
   * // Deprecated - use refundPayment instead
   * const refund = await bkash.refundPaymentLegacy({
   *   paymentId: 'PAY123',
   *   transactionId: 'TXN456',
   *   amount: 100,
   *   reason: 'Refund'
   * });
   * 
   * // Recommended approach:
   * const refund = await bkash.refundPayment({
   *   paymentId: 'TR001',
   *   trxId: 'BFD90JRLST',
   *   refundAmount: '100.00',
   *   sku: 'PRODUCT-001',
   *   reason: 'Customer request'
   * });
   * ```
   */
  async refundPaymentLegacy(refundData: LegacyRefundData): Promise<LegacyRefundResponse> {
    // Validate legacy refund data
    LegacyRefundDataSchema.parse(refundData);

    // Convert legacy format to new format
    const newRefundData: RefundData = {
      paymentId: refundData.paymentId,
      trxId: refundData.transactionId,
      refundAmount: refundData.amount.toString(),
      sku: 'LEGACY',
      reason: refundData.reason || 'Customer request',
    };

    const result = await this.refundPayment(newRefundData);

    // Convert new response format to legacy format
    return {
      statusCode: result.refundTransactionStatus === 'Completed' ? '0000' : '0001',
      statusMessage: result.refundTransactionStatus === 'Completed' ? 'Successful' : 'Failed',
      paymentID: refundData.paymentId,
      trxID: result.originalTrxId,
      amount: result.refundAmount,
      currency: result.currency,
      refundTrxID: result.refundTrxId,
      completedTime: result.completedTime,
    };
  }

  /**
   * Search for transaction details by transaction ID
   * 
   * Searches and retrieves detailed information about a specific transaction using the trxID.
   * This method provides comprehensive transaction information including customer details,
   * timing information, and transaction status.
   * 
   * @param {SearchTransactionData} searchData - Search criteria
   * @param {string} searchData.trxID - The bKash transaction ID to search for
   * 
   * @returns {Promise<SearchTransactionResponse>} Complete transaction details response
   * @returns {string} returns.statusCode - Search status code
   * @returns {string} returns.statusMessage - Search status message
   * @returns {string} returns.trxID - bKash transaction ID
   * @returns {string} returns.transactionStatus - Transaction status (e.g., "Completed")
   * @returns {string} returns.transactionType - Type of transaction channel
   * @returns {string} returns.amount - Transaction amount
   * @returns {string} returns.currency - Transaction currency (BDT)
   * @returns {string} returns.customerMsisdn - Customer mobile number (01XXXXXXXXX format)
   * @returns {string} returns.organizationShortCode - Merchant short code
   * @returns {string} returns.initiationTime - Transaction initiation time (GMT+0000)
   * @returns {string} returns.completedTime - Transaction completion time (GMT+0000)
   * @returns {string} [returns.transactionReference] - Customer transaction reference (optional)
   * 
   * @throws {BkashError} When transaction search fails
   * @throws {ZodError} When search data validation fails
   * 
   * @example
   * ```typescript
   * try {
   *   const result = await bkash.searchTransaction({
   *     trxID: '6H7XXXXTCT'
   *   });
   *   
   *   console.log('Transaction found:', result.trxID);
   *   console.log('Amount:', result.amount, result.currency);
   *   console.log('Status:', result.transactionStatus);
   *   console.log('Customer:', result.customerMsisdn);
   *   console.log('Completed:', result.completedTime);
   * } catch (error) {
   *   console.error('Transaction not found:', error.message);
   * }
   * ```
   */
  async searchTransaction(searchData: SearchTransactionData): Promise<SearchTransactionResponse> {
    return this.retryOperation(async () => {
      try {
        // Validate search data
        SearchTransactionSchema.parse(searchData);

        if (this.config.log) {
          logger.info('Searching transaction', { searchData });
        }
        const token = await this.getToken();

        const response = await this.client.post<SearchTransactionResponse>(
          '/tokenized/checkout/general/searchTran',
          {
            trxID: searchData.trxID,
          },
          {
            headers: {
              Accept: 'application/json',
              Authorization: token,
              'X-App-Key': this.config.appKey,
            },
          }
        );

        if (this.config.log) {
          logger.info('Transaction search completed', {
            trxID: searchData.trxID,
            transactionStatus: response.data.transactionStatus,
            statusCode: response.data.statusCode
          });
        }
        return response.data;
      } catch (error) {
        if (this.config.log) {
          logger.error('Failed to search transaction', { error, searchData });
        }
        throw new BkashError(
          'Failed to search transaction',
          'SEARCH_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  /**
   * Search transaction by transaction ID (Legacy Method)
   * 
   * @deprecated Use searchTransaction() instead. This method is provided for backward compatibility.
   * 
   * @param {string} transactionId - The bKash transaction ID to search for
   * @returns {Promise<LegacySearchTransactionResponse>} Legacy transaction search response
   * 
   * @example
   * ```typescript
   * // Deprecated - use searchTransaction instead
   * const result = await bkash.searchTransactionLegacy('6H7XXXXTCT');
   * 
   * // Recommended approach:
   * const result = await bkash.searchTransaction({ trxID: '6H7XXXXTCT' });
   * ```
   */
  async searchTransactionLegacy(transactionId: string): Promise<LegacySearchTransactionResponse> {
    const result = await this.searchTransaction({ trxID: transactionId });

    // Convert new response format to legacy format for backward compatibility
    return {
      statusCode: result.statusCode,
      statusMessage: result.statusMessage,
      paymentID: '', // Not available in new API response
      trxID: result.trxID,
      amount: result.amount,
      currency: result.currency,
      transactionStatus: result.transactionStatus,
      paymentExecuteTime: result.completedTime,
      merchantInvoiceNumber: '', // Not available in new API response
    };
  }

  /**
   * Handle incoming webhook notifications from bKash
   * 
   * Processes webhook payloads sent by bKash for payment status updates
   * and other transaction events. This method validates webhook signatures
   * for security and emits events that can be listened to by the application.
   * 
   * @param {unknown} payload - The webhook payload from bKash
   * @param {string} signature - The webhook signature for verification (optional if no webhook config)
   * @returns {Promise<void>}
   * 
   * @throws {BkashError} When webhook signature is invalid or processing fails
   * 
   * @fires BkashPayment#bkash:event - Emits the received webhook event
   * 
   * @example
   * ```typescript
   * // In your webhook endpoint handler
   * app.post('/webhook/bkash', async (req, res) => {
   *   try {
   *     const signature = req.headers['x-webhook-signature'] as string;
   *     await bkash.handleWebhook(req.body, signature);
   *     res.status(200).send('OK');
   *   } catch (error) {
   *     console.error('Webhook handling failed:', error);
   *     res.status(400).send('Bad Request');
   *   }
   * });
   * 
   * // Listen for webhook events
   * bkash.on('bkash:event', (event) => {
   *   console.log('Received webhook event:', event.type);
   *   // Handle the event based on type
   * });
   * ```
   */
  async handleWebhook(payload: unknown, signature?: string): Promise<void> {
    // Verify signature if webhook configuration is provided
    if (this.config.webhook?.secret) {
      if (!signature) {
        throw new BkashError('Webhook signature is required when webhook secret is configured', 'WEBHOOK_SIGNATURE_MISSING');
      }

      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      if (!this.verifyWebhookSignature(payloadString, signature)) {
        throw new BkashError('Invalid webhook signature', 'WEBHOOK_SIGNATURE_INVALID');
      }
    }

    // Process the webhook payload as a custom event
    const event = payload as BkashEvent;
    this.emit('bkash:event', event);

    if (this.config.log) {
      logger.info('Webhook processed', { event });
    }

    // Call the custom event handler if provided
    if (this.config.webhook?.onEvent) {
      await this.config.webhook.onEvent(event);
    }
  }

  /**
   * Verify webhook signature for security
   * 
   * Validates that the webhook payload was sent by bKash by verifying
   * the HMAC SHA256 signature using the configured webhook secret.
   * 
   * @param {string} payload - The raw webhook payload string
   * @param {string} signature - The signature to verify
   * @returns {boolean} True if the signature is valid, false otherwise
   * 
   * @example
   * ```typescript
   * const payload = JSON.stringify(req.body);
   * const signature = req.headers['x-webhook-signature'] as string;
   * 
   * if (bkash.verifyWebhookSignature(payload, signature)) {
   *   console.log('Webhook signature is valid');
   *   // Process the webhook
   * } else {
   *   console.log('Invalid webhook signature');
   *   // Reject the webhook
   * }
   * ```
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhook?.secret) {
      throw new BkashError('Webhook secret not configured', 'WEBHOOK_SECRET_MISSING');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhook.secret)
      .update(payload)
      .digest('hex');

    // Use timingSafeEqual for secure comparison
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  }

  /**
   * Create a webhook event from payment response data
   * 
   * This is a utility method to create standardized webhook events
   * that can be processed by your webhook handlers. Since bKash doesn't
   * provide native webhooks, you can use this to simulate webhook events
   * from your payment callbacks.
   * 
   * @param {BkashEventType} type - The type of event to create
   * @param {PaymentResponse | VerificationResponse | RefundResponse} data - The event data
   * @returns {BkashEvent} A standardized webhook event
   * 
   * @example
   * ```typescript
   * // In your payment callback endpoint
   * app.post('/payment/callback', async (req, res) => {
   *   try {
   *     const paymentResponse = await bkash.executePayment(req.body.paymentID);
   *     
   *     // Create a webhook event from the response
   *     const webhookEvent = bkash.createWebhookEvent('payment.success', paymentResponse);
   *     
   *     // Process the event (this will emit to listeners)
   *     await bkash.handleWebhook(webhookEvent);
   *     
   *     res.status(200).json({ success: true });
   *   } catch (error) {
   *     const failedEvent = bkash.createWebhookEvent('payment.failed', {
   *       error: error.message,
   *       paymentID: req.body.paymentID
   *     });
   *     await bkash.handleWebhook(failedEvent);
   *     res.status(400).json({ error: error.message });
   *   }
   * });
   * ```
   */
  createWebhookEvent(
    type: BkashEventType,
    data: PaymentResponse | VerificationResponse | RefundResponse | Record<string, unknown>
  ): BkashEvent {
    return {
      type,
      data,
      timestamp: new Date(),
    };
  }

  /**
   * Check if a transaction is successful
   * 
   * Utility method to determine if a transaction status indicates success.
   * A transaction is considered successful when statusCode is '0000' and
   * statusMessage is 'Successful'.
   * 
   * @param {TransactionStatus} status - The transaction status object to check
   * @returns {boolean} True if the transaction is successful, false otherwise
   * 
   * @example
   * ```typescript
   * const status = await bkash.checkTransactionStatus('TXN123');
   * 
   * if (bkash.isTransactionSuccessful(status)) {
   *   console.log('✅ Payment completed successfully');
   *   // Process successful payment
   * }
   * ```
   */
  // Utility method to check if a transaction is successful
  isTransactionSuccessful(status: TransactionStatus): boolean {
    return status.statusCode === '0000' && status.statusMessage === 'Successful';
  }

  /**
   * Check if a transaction is pending
   * 
   * Utility method to determine if a transaction status indicates it's still pending.
   * A transaction is considered pending when statusCode is '0001' and
   * statusMessage is 'Pending'.
   * 
   * @param {TransactionStatus} status - The transaction status object to check
   * @returns {boolean} True if the transaction is pending, false otherwise
   * 
   * @example
   * ```typescript
   * const status = await bkash.checkTransactionStatus('TXN123');
   * 
   * if (bkash.isTransactionPending(status)) {
   *   console.log('⏳ Payment is still pending');
   *   // Maybe check again later
   * }
   * ```
   */
  // Utility method to check if a transaction is pending
  isTransactionPending(status: TransactionStatus): boolean {
    return status.statusCode === '0001' && status.statusMessage === 'Pending';
  }

  /**
   * Check the status of a refunded transaction
   * 
   * This API allows a merchant to check the status of a refund transaction.
   * It returns details about the original transaction and all associated refund transactions.
   * 
   * @param {RefundStatusRequest} refundStatusData - Refund status request data
   * @param {string} refundStatusData.paymentId - Payment ID received during create payment API call
   * @param {string} refundStatusData.trxId - Transaction ID received during execute payment API call
   * 
   * @returns {Promise<RefundStatusResponse>} Refund status response
   * @returns {string} returns.originalTrxId - Original transaction ID
   * @returns {string} returns.originalTrxAmount - Original transaction amount
   * @returns {string} returns.originalTrxCompletedTime - Original transaction completed date
   * @returns {RefundTransaction[]} returns.refundTransactions - List of refund transactions
   * 
   * @throws {BkashError} When refund status check fails
   * @throws {ZodError} When request data validation fails
   * 
   * @fires BkashPayment#bkash:event - Emits 'refund.status.checked' event on success
   * @fires BkashPayment#bkash:event - Emits 'refund.status.failed' event on failure
   * 
   * @example
   * ```typescript
   * // Check refund status
   * const refundStatus = await bkash.checkRefundStatus({
   *   paymentId: 'TR0001xt7mXxG1718274354990',
   *   trxId: 'BFD90JRLST'
   * });
   * 
   * console.log('Original Transaction:', refundStatus.originalTrxId);
   * console.log('Original Amount:', refundStatus.originalTrxAmount);
   * console.log('Refunds:', refundStatus.refundTransactions.length);
   * 
   * // Check individual refunds
   * refundStatus.refundTransactions.forEach((refund, index) => {
   *   console.log(`Refund ${index + 1}:`);
   *   console.log(`  - ID: ${refund.refundTrxId}`);
   *   console.log(`  - Status: ${refund.refundTransactionStatus}`);
   *   console.log(`  - Amount: ${refund.refundAmount}`);
   *   console.log(`  - Completed: ${refund.completedTime}`);
   * });
   * ```
   */
  async checkRefundStatus(refundStatusData: RefundStatusRequest): Promise<RefundStatusResponse> {
    return this.retryOperation(async () => {
      try {
        // Validate refund status request data
        RefundStatusRequestSchema.parse(refundStatusData);

        if (this.config.log) {
          logger.info('Checking refund status', { refundStatusData });
        }
        const token = await this.getToken();

        const response = await this.client.post<RefundStatusResponse>(
          '/v2/tokenized-checkout/refund/payment/status',
          refundStatusData,
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: token,
              'X-App-Key': this.config.appKey,
            },
          }
        );

        if (this.config.log) {
          logger.info('Refund status checked successfully', {
            originalTrxId: response.data.originalTrxId,
            refundCount: response.data.refundTransactions.length,
            originalAmount: response.data.originalTrxAmount,
          });
        }

        this.emitEvent('refund.status.checked', {
          ...refundStatusData,
          result: response.data,
        });

        return response.data;
      } catch (error) {
        if (this.config.log) {
          logger.error('Failed to check refund status', { error, refundStatusData });
        }
        this.emitEvent('refund.status.failed', error instanceof AxiosError ? error.response?.data : error);
        throw new BkashError(
          'Failed to check refund status',
          'REFUND_STATUS_ERROR',
          error instanceof AxiosError ? error.response?.data : error
        );
      }
    });
  }

  /**
   * Check if a transaction has failed
   * 
   * Utility method to determine if a transaction status indicates failure.
   * A transaction is considered failed when statusCode is '0002' and
   * statusMessage is 'Failed'.
   * 
   * @param {TransactionStatus} status - The transaction status object to check
   * @returns {boolean} True if the transaction has failed, false otherwise
   * 
   * @example
   * ```typescript
   * const status = await bkash.checkTransactionStatus('TXN123');
   * 
   * if (bkash.isTransactionFailed(status)) {
   *   console.log('❌ Payment failed');
   *   // Handle failed payment
   *   // Maybe retry or notify customer
   * }
   * ```
   */
  // Utility method to check if a transaction has failed
  isTransactionFailed(status: TransactionStatus): boolean {
    return status.statusCode === '0002' && status.statusMessage === 'Failed';
  }
}
