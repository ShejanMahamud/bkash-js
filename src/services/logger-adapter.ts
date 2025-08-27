import { ILogger } from '../interfaces/base';
import logger from '../utils/logger';

/**
 * Logger adapter that implements ILogger interface
 */
export class LoggerAdapter implements ILogger {
    constructor(private readonly enableLogging: boolean = false) { }

    debug(message: string, meta?: Record<string, unknown>): void {
        if (this.enableLogging) {
            logger.debug(message, meta);
        }
    }

    info(message: string, meta?: Record<string, unknown>): void {
        if (this.enableLogging) {
            logger.info(message, meta);
        }
    }

    warn(message: string, meta?: Record<string, unknown>): void {
        if (this.enableLogging) {
            logger.warn(message, meta);
        }
    }

    error(message: string, meta?: Record<string, unknown>): void {
        if (this.enableLogging) {
            logger.error(message, meta);
        }
    }
}
