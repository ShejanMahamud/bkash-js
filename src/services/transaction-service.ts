import { AxiosError } from 'axios';
import { IHttpClient, ILogger, IRetryService } from '../interfaces/base';
import { ITokenManager, ITransactionService } from '../interfaces/services';
import {
    BkashConfig,
    BkashError,
    LegacySearchTransactionResponse,
    QueryPaymentRequest,
    QueryPaymentResponse,
    SearchTransactionData,
    SearchTransactionResponse,
    TransactionStatus,
} from '../types/types';
import { SearchTransactionSchema, TransactionIdSchema } from '../validation/schemas';

/**
 * Transaction operations service
 */
export class TransactionService implements ITransactionService {
    constructor(
        private readonly config: BkashConfig,
        private readonly httpClient: IHttpClient,
        private readonly logger: ILogger,
        private readonly retryService: IRetryService,
        private readonly tokenManager: ITokenManager
    ) { }

    /**
     * Query Payment Status - Check the current status of a payment
     */
    async queryPayment(paymentID: string): Promise<QueryPaymentResponse> {
        return this.retryService.retryOperation(async () => {
            try {
                // Validate payment ID
                TransactionIdSchema.parse(paymentID);

                this.logger.info('Querying payment status', { paymentID });

                const token = await this.tokenManager.getToken();
                const requestData: QueryPaymentRequest = {
                    paymentID: paymentID,
                };

                const response = await this.httpClient.post<QueryPaymentResponse>(
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

                this.logger.info('Payment status retrieved successfully', {
                    paymentID,
                    transactionStatus: response.data.transactionStatus,
                    userVerificationStatus: response.data.userVerificationStatus,
                    statusCode: response.data.statusCode
                });

                return response.data;
            } catch (error) {
                this.logger.error('Failed to query payment status', { error, paymentID });
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
     */
    async checkTransactionStatus(transactionId: string): Promise<TransactionStatus> {
        return this.retryService.retryOperation(async () => {
            try {
                // Validate transaction ID
                TransactionIdSchema.parse(transactionId);

                this.logger.info('Checking transaction status', { transactionId });
                const token = await this.tokenManager.getToken();

                const response = await this.httpClient.get<TransactionStatus>(
                    `/tokenized/checkout/transaction/status/${transactionId}`,
                    {
                        headers: {
                            Authorization: token,
                            'x-app-key': this.config.appKey,
                        },
                    }
                );

                this.logger.info('Transaction status retrieved successfully', { transactionId });
                return response.data;
            } catch (error) {
                this.logger.error('Failed to check transaction status', { error, transactionId });
                throw new BkashError(
                    'Failed to check transaction status',
                    'TRANSACTION_STATUS_ERROR',
                    error instanceof AxiosError ? error.response?.data : error
                );
            }
        });
    }

    /**
     * Search for transaction details by transaction ID
     */
    async searchTransaction(searchData: SearchTransactionData): Promise<SearchTransactionResponse> {
        return this.retryService.retryOperation(async () => {
            try {
                // Validate search data
                SearchTransactionSchema.parse(searchData);

                this.logger.info('Searching transaction', { searchData });
                const token = await this.tokenManager.getToken();

                const response = await this.httpClient.post<SearchTransactionResponse>(
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

                this.logger.info('Transaction search completed', {
                    trxID: searchData.trxID,
                    transactionStatus: response.data.transactionStatus,
                    statusCode: response.data.statusCode
                });

                return response.data;
            } catch (error) {
                this.logger.error('Failed to search transaction', { error, searchData });
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
     * @deprecated Use searchTransaction() instead
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
}
