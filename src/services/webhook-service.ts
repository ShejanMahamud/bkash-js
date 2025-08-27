import crypto from 'crypto';
import { IEventEmitter, ILogger } from '../interfaces/base';
import { IWebhookService } from '../interfaces/services';
import {
    BkashConfig,
    BkashError,
    BkashEvent,
    BkashEventType,
    PaymentResponse,
    RefundResponse,
    VerificationResponse,
} from '../types/types';

/**
 * Webhook handling service
 */
export class WebhookService implements IWebhookService {
    constructor(
        private readonly config: BkashConfig,
        private readonly logger: ILogger,
        private readonly eventEmitter: IEventEmitter
    ) { }

    /**
     * Handle incoming webhook notifications from bKash
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
        this.eventEmitter.emit('bkash:event', event);

        this.logger.info('Webhook processed', { event });

        // Call the custom event handler if provided
        if (this.config.webhook?.onEvent) {
            await this.config.webhook.onEvent(event);
        }
    }

    /**
     * Verify webhook signature for security
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
}
