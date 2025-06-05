# bKash & Nagad Payment Integration

A production-grade Node.js package for integrating bKash and Nagad payment gateways with TypeScript support, webhook handling, and comprehensive error management.

## Features

- **Dual Payment Gateway Support**: Seamlessly integrate both bKash and Nagad payment gateways
- **TypeScript Support**: Built with TypeScript for better type safety and developer experience
- **Webhook Integration**: Real-time payment notifications with secure signature verification
- **Comprehensive Error Handling**: Detailed error messages and proper error types
- **Logging**: Built-in logging with Winston
- **Input Validation**: Request payload validation using Zod
- **Testing**: Comprehensive test coverage with Jest
- **Production Ready**: Battle-tested in production environments

## Installation

```bash
npm install bkash-nagad-payment
```

## Usage

### bKash Integration

#### Configuration

```typescript
import { BkashPayment } from 'bkash-nagad-payment';

const bkash = new BkashPayment({
  appKey: 'your-app-key',
  appSecret: 'your-app-secret',
  username: 'your-username',
  password: 'your-password',
  sandbox: true, // Set to false for production
  webhook: {
    secret: 'your-webhook-secret', // Optional: For webhook signature verification
  },
});
```

#### Payment Flow

1. **Create Payment**:

```typescript
const payment = await bkash.createPayment({
  amount: 100,
  currency: 'BDT',
  merchantInvoiceNumber: 'INV-123',
  intent: 'sale',
});
```

2. **Execute Payment**:

```typescript
const result = await bkash.executePayment(payment.paymentID);
```

3. **Query Payment**:

```typescript
const status = await bkash.queryPayment(payment.paymentID);
```

4. **Refund Payment**:

```typescript
const refund = await bkash.refundPayment({
  paymentID: 'payment-id',
  amount: 100,
  reason: 'Customer request',
  sku: 'SKU-123',
});
```

5. **Webhook Handling**:

```typescript
// In your Express.js route handler
app.post('/webhook/bkash', async (req, res) => {
  try {
    const signature = req.headers['x-bkash-signature'];
    await bkash.handleWebhook(req.body, signature);
    res.status(200).send('Webhook processed');
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// Listen for payment events
bkash.on('bkash:event', (event) => {
  console.log('Received bKash event:', event);
});
```

### Nagad Integration

#### Configuration

```typescript
import { NagadPayment } from 'bkash-nagad-payment';

const nagad = new NagadPayment({
  merchantId: 'your-merchant-id',
  merchantNumber: 'your-merchant-number',
  callbackUrl: 'https://your-domain.com/callback',
  sandbox: true, // Set to false for production
  webhook: {
    secret: 'your-webhook-secret', // Optional: For webhook signature verification
  },
});
```

#### Payment Flow

1. **Initialize Payment**:

```typescript
const payment = await nagad.initializePayment({
  amount: 100,
  currency: 'BDT',
  merchantOrderId: 'ORD-123',
  customerMsisdn: '8801XXXXXXXXX', // Optional: Customer's mobile number
});
```

2. **Verify Payment**:

```typescript
const result = await nagad.verifyPayment(payment.paymentReferenceId);
```

3. **Query Payment Status**:

```typescript
const status = await nagad.queryPayment(payment.paymentReferenceId);
```

4. **Refund Payment**:

```typescript
const refund = await nagad.refundPayment({
  paymentReferenceId: 'payment-ref-id',
  amount: 100,
  reason: 'Customer request',
  merchantOrderId: 'ORD-123',
});
```

5. **Webhook Handling**:

```typescript
// In your Express.js route handler
app.post('/webhook/nagad', async (req, res) => {
  try {
    const signature = req.headers['x-nagad-signature'];
    await nagad.handleWebhook(req.body, signature);
    res.status(200).send('Webhook processed');
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// Listen for payment events
nagad.on('nagad:event', (event) => {
  console.log('Received Nagad event:', event);
});
```

## Error Handling

Both bKash and Nagad integrations use custom error classes for better error handling:

```typescript
try {
  await payment.execute();
} catch (error) {
  if (error instanceof BkashError) {
    // Handle bKash specific errors
    console.error(error.code, error.message);
  } else if (error instanceof NagadError) {
    // Handle Nagad specific errors
    console.error(error.code, error.message);
  }
}
```

## Webhook Integration

Both bKash and Nagad support webhook integration for real-time payment notifications. Configure the webhook secret and handler in the respective payment client. Use the `handleWebhook` and `verifyWebhookSignature` methods for secure processing.

### Security Note

Webhook signature verification uses HMAC-SHA256 and `crypto.timingSafeEqual` for robust security. **If no secret is configured, signature verification is skipped and the event is still emitted.** If the secret is set and the signature is invalid or the buffer lengths do not match, the verification will fail gracefully and the handler will throw a custom error (`Invalid webhook signature`).

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
