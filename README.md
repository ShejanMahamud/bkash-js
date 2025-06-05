# bKash & Nagad Payment Integration

A production-grade Node.js package for integrating **bKash and Nagad** payments into your applications. This package provides a robust, type-safe, and feature-rich interface to the bKash and Nagad payment gateways.

## Features

- 🚀 Easy integration with bKash and Nagad payment gateways
- 📦 TypeScript support with full type definitions and strict mode
- 🔄 Automatic retry mechanism for failed requests
- ⚡ Promise-based API
- 🛡️ Comprehensive error handling
- 📝 Detailed logging
- ✅ Input validation using Zod
- 💰 Payment creation and verification
- 🔍 Transaction status checking
- 💸 Refund processing
- 🔎 Transaction search (bKash)
- 🧪 Utility methods for transaction status checking
- 🔔 Webhook support with signature verification
- 📡 Event emitter for payment lifecycle events
- 🧪 **Fully tested with Jest**

## Installation

```bash
npm install bkash-payment
```

## Usage

### bKash Example

```typescript
import { BkashPayment } from 'bkash-payment';

// Initialize the bKash payment client with advanced options
const bkash = new BkashPayment({
  username: 'your_username',
  password: 'your_password',
  appKey: 'your_app_key',
  appSecret: 'your_app_secret',
  isSandbox: true, // Set to false for production
  timeout: 30000, // Optional: Custom timeout in milliseconds
  maxRetries: 3, // Optional: Number of retries for failed requests
  retryDelay: 1000, // Optional: Delay between retries in milliseconds
  webhook: {
    secret: 'your_webhook_secret', // Required for webhook signature verification
    path: '/webhook/bkash', // Optional: Webhook endpoint path
    onEvent: async (event) => {
      // Handle webhook events
      console.log('bKash event:', event);
    },
  },
});

// Listen for payment events
bkash.on('bkash:event', (event) => {
  switch (event.type) {
    case 'payment.created':
      console.log('Payment created:', event.data);
      break;
    case 'payment.success':
      console.log('Payment successful:', event.data);
      break;
    case 'payment.failed':
      console.log('Payment failed:', event.data);
      break;
    case 'refund.success':
      console.log('Refund successful:', event.data);
      break;
    // ... handle other event types
  }
});

// Create a payment
const payment = await bkash.createPayment({
  amount: 100,
  currency: 'BDT',
  intent: 'sale',
  merchantInvoiceNumber: 'INV-123456',
  callbackURL: 'https://your-callback-url.com',
  payerReference: 'CUSTOMER-123', // Optional: Reference for the payer
});

// Verify a payment
const verification = await bkash.verifyPayment('TRANSACTION_ID');

// Check transaction status
const status = await bkash.checkTransactionStatus('TRANSACTION_ID');

// Process a refund
const refund = await bkash.refundPayment({
  paymentId: 'PAYMENT_ID',
  transactionId: 'TRANSACTION_ID',
  amount: 100,
  reason: 'Customer request', // Optional
});

// Search for a transaction
const transaction = await bkash.searchTransaction({
  transactionId: 'TRANSACTION_ID',
});

// Use utility methods to check transaction status
if (bkash.isTransactionSuccessful(status)) {
  console.log('Payment successful!');
} else if (bkash.isTransactionPending(status)) {
  console.log('Payment pending...');
} else if (bkash.isTransactionFailed(status)) {
  console.log('Payment failed!');
}

// Handle incoming webhooks (in your Express.js route handler)
app.post('/webhook/bkash', async (req, res) => {
  try {
    const signature = req.headers['x-bkash-signature'];
    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({ error: 'Missing signature' });
    }

    await bkash.handleWebhook(req.body, signature);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Invalid webhook' });
  }
});
```

### Nagad Example

```typescript
import { NagadPayment } from 'bkash-payment';

const nagad = new NagadPayment({
  merchantId: 'your_merchant_id',
  merchantNumber: 'your_merchant_number',
  callbackUrl: 'https://your-callback-url.com',
  isSandbox: true,
  webhook: {
    secret: 'your_webhook_secret',
    onEvent: async (event) => {
      console.log('Nagad event:', event);
    },
  },
});

nagad.on('nagad:event', (event) => {
  // handle Nagad events
});

const payment = await nagad.createPayment({
  amount: 100,
  currency: 'BDT',
  merchantOrderId: 'ORDER-123456',
});
```

## Webhook Integration

Both bKash and Nagad support webhook integration for real-time payment notifications. Configure the webhook secret and handler in the respective payment client. Use the `handleWebhook` and `verifyWebhookSignature` methods for secure processing.

### Security Note

Webhook signature verification uses HMAC-SHA256 and `crypto.timingSafeEqual` for robust security. **If no secret is configured, signature verification is skipped and the event is still emitted.** If the secret is set and the signature is invalid or the buffer lengths do not match, the verification will fail gracefully and the handler will throw a custom error (`Invalid webhook signature`).

## Events

Both payment clients emit events for payment and refund lifecycle:

- `payment.created`
- `payment.success`
- `payment.failed`
- `payment.cancelled`
- `refund.created`
- `refund.success`
- `refund.failed`

Listen for events using `.on('bkash:event', ...)` or `.on('nagad:event', ...)`.

## API Reference

### bKash

- `createPayment(paymentData: PaymentData): Promise<PaymentResponse>`
- `verifyPayment(transactionId: string): Promise<VerificationResponse>`
- `checkTransactionStatus(transactionId: string): Promise<TransactionStatus>`
- `refundPayment(refundData: RefundData): Promise<RefundResponse>`
- `searchTransaction(searchData: SearchTransactionData): Promise<SearchTransactionResponse>`
- `handleWebhook(payload: unknown, signature: string): Promise<void>`
- `verifyWebhookSignature(payload: string, signature: string): boolean`
- Utility methods: `isTransactionSuccessful`, `isTransactionPending`, `isTransactionFailed`

### Nagad

- `createPayment(paymentData: NagadPaymentData): Promise<NagadPaymentResponse>`
- `verifyPayment(paymentRefId: string): Promise<NagadVerificationResponse>`
- `checkTransactionStatus(paymentRefId: string): Promise<NagadTransactionStatus>`
- `refundPayment(refundData: NagadRefundData): Promise<NagadRefundResponse>`
- `handleWebhook(payload: unknown, signature: string): Promise<void>`
- `verifyWebhookSignature(payload: string, signature: string): boolean`
- Utility methods: `isTransactionSuccessful`, `isTransactionPending`, `isTransactionFailed`

## Type and Schema Exports

All types and validation schemas for both bKash and Nagad are exported from the package entry point:

```typescript
import {
  BkashPayment,
  NagadPayment,
  // bKash types
  BkashConfig, PaymentData, PaymentResponse, ...,
  // Nagad types
  NagadConfig, NagadPaymentData, NagadPaymentResponse, ...,
  // Validation schemas
  BkashConfigSchema, NagadConfigSchema, ...
} from 'bkash-payment';
```

## Error Handling

All errors are instances of `BkashError` or `NagadError` with `message`, `code`, and optional `details`. Webhook signature errors are handled gracefully and will not crash your server.

## Logging

The package uses Winston for logging API requests, errors, retries, and events.

## TypeScript Strictness

This package is written in TypeScript with `strict: true` enabled in `tsconfig.json`. All public APIs are fully typed and safe for use in strict TypeScript projects.

## Testing

This package is fully tested with Jest. To run the tests:

```bash
npm run test
```

## Contributing

Contributions are welcome! Please open issues or submit pull requests for new features, bug fixes, or improvements. To get started:

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Run `npm run lint` and `npm run test`
5. Submit a pull request

## License

MIT
