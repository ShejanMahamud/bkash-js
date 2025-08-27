import { AxiosError } from 'axios';
import { IEventEmitter, IHttpClient, ILogger, IRetryService } from '../interfaces/base';
import { IPaymentService, ITokenManager } from '../interfaces/services';
import {
    BkashConfig,
    BkashError,
    CreatePaymentResponse,
    ExecutePaymentResponse,
    PaymentData,
    PaymentResponse,
    VerificationResponse,
} from '../types/types';
import { PaymentDataSchema, TransactionIdSchema } from '../validation/schemas';

/**
 * Payment operations service
 */
export class PaymentService implements IPaymentService {
    constructor(
        private readonly config: BkashConfig,
        private readonly httpClient: IHttpClient,
        private readonly logger: ILogger,
        private readonly retryService: IRetryService,
        private readonly tokenManager: ITokenManager,
        private readonly eventEmitter: IEventEmitter
    ) { }

    /**
     * Create a new payment request
     */
    async createPayment(paymentData: PaymentData): Promise<PaymentResponse> {
        return this.retryService.retryOperation(async () => {
            try {
                // Validate payment data
                PaymentDataSchema.parse(paymentData);

                this.logger.info('Creating payment', { paymentData });
                const token = await this.tokenManager.getToken();

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

                const response = await this.httpClient.post<CreatePaymentResponse>(
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

                this.logger.info('Payment created successfully', {
                    paymentId: response.data.paymentID,
                    transactionStatus: response.data.transactionStatus,
                    statusCode: response.data.statusCode
                });

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

                this.eventEmitter.emit('bkash:event', {
                    type: 'payment.created',
                    data: paymentResponse,
                    timestamp: new Date(),
                });

                return paymentResponse;
            } catch (error) {
                this.logger.error('Failed to create payment', { error, paymentData });
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
     */
    async createPaymentFull(paymentData: PaymentData): Promise<CreatePaymentResponse> {
        return this.retryService.retryOperation(async () => {
            try {
                // Validate payment data
                PaymentDataSchema.parse(paymentData);

                this.logger.info('Creating payment (full response)', { paymentData });
                const token = await this.tokenManager.getToken();

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

                const response = await this.httpClient.post<CreatePaymentResponse>(
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

                this.logger.info('Payment created successfully (full response)', {
                    paymentId: response.data.paymentID,
                    transactionStatus: response.data.transactionStatus,
                    statusCode: response.data.statusCode
                });

                this.eventEmitter.emit('bkash:event', {
                    type: 'payment.created',
                    data: response.data,
                    timestamp: new Date(),
                });

                return response.data;
            } catch (error) {
                this.logger.error('Failed to create payment', { error, paymentData });
                throw new BkashError(
                    'Failed to create payment',
                    'PAYMENT_CREATE_ERROR',
                    error instanceof AxiosError ? error.response?.data : error
                );
            }
        });
    }

    /**
     * Execute Payment
     */
    async executePayment(paymentID: string): Promise<ExecutePaymentResponse> {
        return this.retryService.retryOperation(async () => {
            try {
                // Validate payment ID
                TransactionIdSchema.parse(paymentID);

                this.logger.info('Executing payment', { paymentID });
                const token = await this.tokenManager.getToken();

                const response = await this.httpClient.post<ExecutePaymentResponse>(
                    '/tokenized/checkout/execute',
                    { paymentID },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            Authorization: token,
                            'X-App-Key': this.config.appKey,
                        },
                    }
                );

                this.logger.info('Payment executed successfully', {
                    paymentID,
                    trxID: response.data.trxID,
                    statusCode: response.data.statusCode
                });

                this.eventEmitter.emit('bkash:event', {
                    type: response.data.statusCode === '0000' ? 'payment.success' : 'payment.failed',
                    data: response.data,
                    timestamp: new Date(),
                });

                return response.data;
            } catch (error) {
                this.logger.error('Failed to execute payment', { error, paymentID });
                this.eventEmitter.emit('bkash:event', {
                    type: 'payment.failed',
                    data: error instanceof AxiosError ? error.response?.data : error,
                    timestamp: new Date(),
                });
                throw new BkashError(
                    'Failed to execute payment',
                    'PAYMENT_EXECUTE_ERROR',
                    error instanceof AxiosError ? error.response?.data : error
                );
            }
        });
    }

    /**
     * Verify a payment transaction
     */
    async verifyPayment(transactionId: string): Promise<VerificationResponse> {
        return this.retryService.retryOperation(async () => {
            try {
                // Validate transaction ID
                TransactionIdSchema.parse(transactionId);

                this.logger.info('Verifying payment', { transactionId });
                const token = await this.tokenManager.getToken();

                const response = await this.httpClient.post<VerificationResponse>(
                    '/tokenized/checkout/execute',
                    { paymentID: transactionId },
                    {
                        headers: {
                            Authorization: token,
                            'x-app-key': this.config.appKey,
                        },
                    }
                );

                this.logger.info('Payment verified successfully', { transactionId });
                this.eventEmitter.emit('bkash:event', {
                    type: 'payment.success',
                    data: response.data,
                    timestamp: new Date(),
                });

                return response.data;
            } catch (error) {
                this.logger.error('Failed to verify payment', { error, transactionId });
                this.eventEmitter.emit('bkash:event', {
                    type: 'payment.failed',
                    data: error instanceof AxiosError ? error.response?.data : error,
                    timestamp: new Date(),
                });
                throw new BkashError(
                    'Failed to verify payment',
                    'PAYMENT_VERIFY_ERROR',
                    error instanceof AxiosError ? error.response?.data : error
                );
            }
        });
    }
}
