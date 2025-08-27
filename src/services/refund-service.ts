import { AxiosError } from 'axios';
import { IEventEmitter, IHttpClient, ILogger, IRetryService } from '../interfaces/base';
import { IRefundService, ITokenManager } from '../interfaces/services';
import {
    BkashConfig,
    BkashError,
    LegacyRefundData,
    LegacyRefundResponse,
    RefundData,
    RefundResponse,
    RefundStatusRequest,
    RefundStatusResponse,
} from '../types/types';
import { LegacyRefundDataSchema, RefundDataSchema, RefundStatusRequestSchema } from '../validation/schemas';

/**
 * Refund operations service
 */
export class RefundService implements IRefundService {
    constructor(
        private readonly config: BkashConfig,
        private readonly httpClient: IHttpClient,
        private readonly logger: ILogger,
        private readonly retryService: IRetryService,
        private readonly tokenManager: ITokenManager,
        private readonly eventEmitter: IEventEmitter
    ) { }

    /**
     * Process a payment refund (New API v2)
     */
    async refundPayment(refundData: RefundData): Promise<RefundResponse> {
        return this.retryService.retryOperation(async () => {
            try {
                // Validate refund data
                RefundDataSchema.parse(refundData);

                this.logger.info('Processing refund (v2 API)', { refundData });
                const token = await this.tokenManager.getToken();

                const response = await this.httpClient.post<RefundResponse>(
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

                this.logger.info('Refund processed successfully (v2 API)', {
                    originalTrxId: response.data.originalTrxId,
                    refundTrxId: response.data.refundTrxId,
                    refundTransactionStatus: response.data.refundTransactionStatus,
                    refundAmount: response.data.refundAmount
                });

                this.eventEmitter.emit('bkash:event', {
                    type: 'refund.success',
                    data: response.data,
                    timestamp: new Date(),
                });

                return response.data;
            } catch (error) {
                this.logger.error('Failed to process refund (v2 API)', { error, refundData });
                this.eventEmitter.emit('bkash:event', {
                    type: 'refund.failed',
                    data: error instanceof AxiosError ? error.response?.data : error,
                    timestamp: new Date(),
                });
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
     * @deprecated Use refundPayment() instead
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
     * Check the status of a refunded transaction
     */
    async checkRefundStatus(refundStatusData: RefundStatusRequest): Promise<RefundStatusResponse> {
        return this.retryService.retryOperation(async () => {
            try {
                // Validate refund status request data
                RefundStatusRequestSchema.parse(refundStatusData);

                this.logger.info('Checking refund status', { refundStatusData });
                const token = await this.tokenManager.getToken();

                const response = await this.httpClient.post<RefundStatusResponse>(
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

                this.logger.info('Refund status checked successfully', {
                    originalTrxId: response.data.originalTrxId,
                    refundCount: response.data.refundTransactions.length,
                    originalAmount: response.data.originalTrxAmount,
                });

                this.eventEmitter.emit('bkash:event', {
                    type: 'refund.status.checked',
                    data: {
                        ...refundStatusData,
                        result: response.data,
                    },
                    timestamp: new Date(),
                });

                return response.data;
            } catch (error) {
                this.logger.error('Failed to check refund status', { error, refundStatusData });
                this.eventEmitter.emit('bkash:event', {
                    type: 'refund.status.failed',
                    data: error instanceof AxiosError ? error.response?.data : error,
                    timestamp: new Date(),
                });
                throw new BkashError(
                    'Failed to check refund status',
                    'REFUND_STATUS_ERROR',
                    error instanceof AxiosError ? error.response?.data : error
                );
            }
        });
    }
}
