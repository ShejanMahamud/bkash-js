import { ILogger, IRetryService } from '../interfaces/base';

/**
 * Retry service for handling failed operations
 */
export class RetryService implements IRetryService {
    constructor(
        private readonly maxRetries: number,
        private readonly retryDelay: number,
        private readonly logger: ILogger
    ) { }

    async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                if (attempt < this.maxRetries) {
                    this.logger.warn(`Operation failed, retrying (${attempt}/${this.maxRetries})`, { error });
                    await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt));
                }
            }
        }

        throw lastError;
    }
}
