import { ITransactionUtils } from '../interfaces/services';
import { TransactionStatus } from '../types/types';

/**
 * Transaction utility methods
 */
export class TransactionUtils implements ITransactionUtils {
    /**
     * Check if a transaction is successful
     */
    isTransactionSuccessful(status: TransactionStatus): boolean {
        return status.statusCode === '0000' && status.statusMessage === 'Successful';
    }

    /**
     * Check if a transaction is pending
     */
    isTransactionPending(status: TransactionStatus): boolean {
        return status.statusCode === '0001' && status.statusMessage === 'Pending';
    }

    /**
     * Check if a transaction has failed
     */
    isTransactionFailed(status: TransactionStatus): boolean {
        return status.statusCode === '0002' && status.statusMessage === 'Failed';
    }
}
