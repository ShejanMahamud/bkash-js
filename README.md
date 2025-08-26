# bKash Payment Integration

[![npm version](https://img.shields.io/npm/v/bkash-js.svg)](https://www.npmjs.com/package/bkash-js)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A TypeScript library for bKash Checkout (URL Based) payment integration in Node.js applications.

## What This Package Covers

- **Payment Flow**: Create payments, execute after user completion, verify status
- **Refund System**: Process refunds and check refund status (v2 API support)
- **Transaction Management**: Search transactions and check status
- **Webhook Integration**: Handle payment notifications with signature verification
- **Token Management**: Automatic authentication token handling
- **TypeScript Support**: Full type definitions for better development experience

## Installation

```bash
npm install bkash-js
```

## Quick Start

```typescript
import { BkashJS } from 'bkash-js';

const bkash = new BkashJS({
  appKey: 'your_app_key',
  appSecret: 'your_app_secret',
  username: 'your_username',
  password: 'your_password',
  isSandbox: true
});

// Create payment
const payment = await bkash.createPayment({
  amount: 100,
  orderId: 'ORDER-001',
  intent: 'sale'
});

// Execute payment after user completes on bKash
const executed = await bkash.executePayment(payment.paymentID);
```

## Available Methods

### Payment Operations
- `createPayment()` - Create a new payment
- `executePayment()` - Execute payment after user completion  
- `verifyPayment()` - Verify payment status
- `queryPayment()` - Get detailed payment information

### Refund Operations
- `refundPayment()` - Process refunds (v2 API)
- `checkRefundStatus()` - Check refund status
- `refundPaymentLegacy()` - Legacy refund format

### Transaction Operations
- `searchTransaction()` - Search transactions
- `checkTransactionStatus()` - Check transaction status

### Token & Webhook
- `grantToken()` - Get access token
- `refreshToken()` - Refresh expired token
- `handleWebhook()` - Process webhook notifications
- `verifyWebhookSignature()` - Verify webhook signatures

## Configuration

```typescript
interface BkashConfig {
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
  isSandbox?: boolean;
  successUrl?: string;
  failureUrl?: string;
  cancelUrl?: string;
  requestTimeout?: number;
}
```

## Basic Example

```typescript
// Express.js integration
app.post('/create-payment', async (req, res) => {
  try {
    const payment = await bkash.createPayment({
      amount: req.body.amount,
      orderId: req.body.orderId,
      intent: 'sale'
    });
    
    res.json({ paymentUrl: payment.paymentURL });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Handle success callback
app.get('/payment/success', async (req, res) => {
  try {
    const executed = await bkash.executePayment(req.query.paymentId);
    if (executed.transactionStatus === 'Completed') {
      // Payment successful
      res.redirect('/success');
    }
  } catch (error) {
    res.redirect('/error');
  }
});

// Process refund
const refund = await bkash.refundPayment({
  paymentId: 'payment_id',
  trxId: 'transaction_id',
  refundAmount: '100.00',
  sku: 'PRODUCT-001',
  reason: 'Customer request'
});
```

## Event Handling

```typescript
bkash.on('payment.executed', (data) => {
  console.log('Payment successful:', data.trxID);
});

bkash.on('refund.processed', (data) => {
  console.log('Refund processed:', data.refundTrxId);
});

bkash.on('webhook.received', (data) => {
  console.log('Webhook notification:', data);
});
```

## Error Handling

```typescript
try {
  const payment = await bkash.createPayment(data);
} catch (error) {
  if (error.code === '2068') {
    console.log('Payment expired');
  } else if (error.code === '2006') {
    console.log('Payment cancelled');
  }
}
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Installation

```bash
npm install bkash-js
```

## Quick Start

```typescript
import { BkashJS } from 'bkash-js';

const bkash = new BkashJS({
  appKey: 'your_app_key',
  appSecret: 'your_app_secret',
  username: 'your_username',
  password: 'your_password',
  isSandbox: true
});

// Create payment
const payment = await bkash.createPayment({
  amount: 100,
  orderId: 'ORDER-001',
  intent: 'sale'
});

// Execute payment after user completes on bKash
const executed = await bkash.executePayment(payment.paymentID);
```

## Available Methods

### Payment Operations
- `createPayment()` - Create a new payment
- `executePayment()` - Execute payment after user completion  
- `verifyPayment()` - Verify payment status
- `queryPayment()` - Get detailed payment information

### Refund Operations
- `refundPayment()` - Process refunds (v2 API)
- `checkRefundStatus()` - Check refund status
- `refundPaymentLegacy()` - Legacy refund format

### Transaction Operations
- `searchTransaction()` - Search transactions
- `checkTransactionStatus()` - Check transaction status

### Token & Webhook
- `grantToken()` - Get access token
- `refreshToken()` - Refresh expired token
- `handleWebhook()` - Process webhook notifications
- `verifyWebhookSignature()` - Verify webhook signatures

## Configuration

```typescript
interface BkashConfig {
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
  isSandbox?: boolean;
  successUrl?: string;
  failureUrl?: string;
  cancelUrl?: string;
  requestTimeout?: number;
}
```
