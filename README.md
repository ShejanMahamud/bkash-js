# bKash Checkout (URL Based) Payment Integration

[![npm version](https://img.shields.io/npm/v/bkash-js.svg)](https://www.npmjs.com/package/bkash-js)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Node.js/TypeScript library for bKash Checkout (URL Based) payment integration with advanced features including retry mechanisms, event handling, webhook support, and complete transaction lifecycle management.

## 🚀 What This Package Covers

### Core Payment Features
- **🏷️ Payment Creation**: Create secure checkout payments with bKash URL-based integration
- **✅ Payment Execution**: Execute payments after customer authorization through bKash app/USSD
- **🔍 Payment Verification**: Verify payment status and retrieve transaction details
- **📊 Payment Queries**: Query payment status with detailed transaction information
- **🔄 Transaction Status Checking**: Real-time transaction status monitoring

### Advanced Refund System (v2 API)
- **💰 Full & Partial Refunds**: Process complete or partial refunds (up to 10 partial refunds per transaction)
- **📋 Refund Status Tracking**: Check refund transaction status and history
- **🏷️ SKU & Reason Tracking**: Track refunds with product information and reasons
- **🔄 Legacy Refund Support**: Backward compatibility with older refund implementations

### Transaction Management
- **🔍 Transaction Search**: Search transactions by bKash transaction ID with comprehensive details
- **📈 Transaction History**: Access customer details, timing information, and transaction lifecycle
- **🏢 Organization Data**: Retrieve merchant and organization information
- **📱 Customer Information**: Access customer MSISDN and transaction references

### Security & Authentication
- **🔐 Automatic Token Management**: Smart token caching, renewal, and refresh handling
- **🛡️ Webhook Security**: HMAC SHA256 signature verification for webhook authenticity
- **🔒 Secure API Calls**: Built-in request/response validation and error handling
- **⚡ Retry Mechanisms**: Automatic retry for failed operations with configurable delays

### Developer Experience
- **📘 Full TypeScript Support**: Complete type definitions and IntelliSense support
- **🎯 Event-Driven Architecture**: Real-time event emissions for payment lifecycle
- **📝 Comprehensive Logging**: Detailed logging with configurable levels using Winston
- **🔧 Validation**: Zod schema validation for all inputs and outputs
- **🏗️ Express.js Integration**: Ready-to-use examples and middleware support
- **🧪 Test Coverage**: Comprehensive Jest test suite with 95%+ coverage

## 🛠️ Installation

```bash
npm install bkash-js
# or
yarn add bkash-js
# or
pnpm add bkash-js
```

## ⚙️ Configuration Options

```typescript
interface BkashConfig {
  // Required Authentication
  username: string;           // bKash merchant username
  password: string;           // bKash merchant password
  appKey: string;            // bKash application key
  appSecret: string;         // bKash application secret
  
  // Environment & Behavior
  isSandbox?: boolean;       // Default: false (production)
  timeout?: number;          // Request timeout in ms (default: 30000)
  maxRetries?: number;       // Max retry attempts (default: 3)
  retryDelay?: number;       // Delay between retries in ms (default: 1000)
  log?: boolean;             // Enable detailed logging (default: false)
  
  // Advanced Webhook Configuration
  webhook?: {
    secret: string;          // Webhook signature verification secret
    path?: string;           // Webhook endpoint path
    onEvent?: (event: BkashEvent) => Promise<void>; // Custom event handler
  };
}
```

## ⚡ Quick Start

```typescript
import { BkashPayment } from 'bkash-js'; // Uses the refactored SOLID architecture

const bkash = new BkashPayment({
  appKey: 'your_app_key',
  appSecret: 'your_app_secret',
  username: 'your_username',
  password: 'your_password',
  isSandbox: true, // false for production
  log: true, // Enable detailed logging
  timeout: 30000, // Request timeout
  maxRetries: 3, // Retry failed requests
  webhook: {
    secret: 'your_webhook_secret' // For webhook verification
  }
});

// Create payment with enhanced options
const payment = await bkash.createPayment({
  amount: '100.50',
  currency: 'BDT',
  intent: 'sale',
  merchantInvoiceNumber: 'INV-' + Date.now(),
  payerReference: '01712345678',
  callbackURL: 'https://yoursite.com/callback',
  merchantAssociationInfo: 'MI05MID54RF09123456789' // Optional for aggregators
});

// Execute payment after customer authorization
const executed = await bkash.executePayment(payment.paymentID);
```
## 🔧 Advanced Usage - Individual Services

For advanced use cases, you can use individual services with dependency injection:

```typescript
import { 
  BkashServiceFactory, 
  PaymentService, 
  TokenManager,
  IPaymentService,
  ITokenManager 
} from 'bkash-js';

// Create service factory
const factory = new BkashServiceFactory(config);

// Use individual services
const tokenManager: ITokenManager = factory.getTokenManager();
const paymentService: IPaymentService = factory.getPaymentService();

// Direct service usage
const token = await tokenManager.getToken();
const payment = await paymentService.createPayment(paymentData);

// Custom implementations (for testing or customization)
class CustomTokenManager implements ITokenManager {
  // Your custom implementation
}
```

## 🎯 Event-Driven Architecture

Listen to real-time payment events for better integration:

```typescript
// Listen to all bKash events
bkash.on('bkash:event', (event) => {
  console.log(`Event Type: ${event.type}`);
  console.log('Event Data:', event.data);
  console.log('Timestamp:', event.timestamp);
});

// Available event types:
// - payment.created      - Payment request created
// - payment.success      - Payment executed successfully
// - payment.failed       - Payment execution failed
// - payment.cancelled    - Payment cancelled by user
// - refund.success       - Refund processed successfully
// - refund.failed        - Refund processing failed
// - refund.status.checked - Refund status retrieved
// - refund.status.failed  - Refund status check failed

// Handle specific events
bkash.on('bkash:event', (event) => {
  switch (event.type) {
    case 'payment.success':
      console.log('✅ Payment completed:', event.data.trxID);
      // Update database, send notifications, etc.
      break;
      
    case 'payment.failed':
      console.log('❌ Payment failed:', event.data.statusMessage);
      // Handle failed payment, retry logic, etc.
      break;
      
    case 'refund.success':
      console.log('💰 Refund processed:', event.data.refundTrxId);
      // Update order status, notify customer, etc.
      break;
  }
});
```

## 📚 API Documentation

### 🏷️ Payment Operations

#### `createPayment(data: PaymentData)` 
Creates a new checkout payment request with complete API response.

**Parameters:**
- `payerReference` - Customer mobile number or reference
- `callbackURL` - URL for payment status callbacks
- `amount` - Payment amount as string (e.g., "100.50")
- `currency` - Currency code (currently only "BDT")
- `intent` - Payment intent (typically "sale")
- `merchantInvoiceNumber` - Unique merchant invoice number
- `merchantAssociationInfo` - Optional for aggregators (max 255 chars)
- `mode` - Payment mode (default: "0011" for checkout)

**Returns:** Complete payment response with bKash URL and callback URLs

```typescript
const payment = await bkash.createPayment({
  payerReference: '01712345678',
  callbackURL: 'https://yoursite.com/callback',
  amount: '250.75',
  currency: 'BDT',
  intent: 'sale',
  merchantInvoiceNumber: 'INV-' + Date.now(),
  merchantAssociationInfo: 'MI05MID54RF09123456789'
});

console.log('Payment ID:', payment.paymentID);
console.log('Redirect to:', payment.bkashURL);
console.log('Success callback:', payment.successCallbackURL);
```

#### `executePayment(paymentID: string)`
Finalizes a payment after customer completes authorization in bKash app.

**Returns:** Complete execution response with transaction details

```typescript
const result = await bkash.executePayment(payment.paymentID);

if (result.transactionStatus === 'Completed') {
  console.log('✅ Payment successful!');
  console.log('Transaction ID:', result.trxID);
  console.log('Customer:', result.customerMsisdn);
  console.log('Amount:', result.amount, result.currency);
  console.log('Completed at:', result.paymentExecuteTime);
} else {
  console.log('❌ Payment failed:', result.statusMessage);
}
```

#### `queryPayment(paymentID: string)`
Retrieves comprehensive payment status and details.

**Returns:** Complete payment information including verification status

```typescript
const status = await bkash.queryPayment(paymentID);

console.log('Transaction Status:', status.transactionStatus);
console.log('User Verification:', status.userVerificationStatus);
console.log('Payment Created:', status.paymentCreateTime);

if (status.transactionStatus === 'Completed') {
  console.log('Transaction ID:', status.trxID);
  console.log('Executed at:', status.paymentExecuteTime);
}
```

#### `verifyPayment(transactionId: string)`
Verifies payment completion and retrieves verification details.

```typescript
const verification = await bkash.verifyPayment(transactionId);
console.log('Verification status:', verification.status);
```

### 💰 Advanced Refund System (v2 API)

#### `refundPayment(data: RefundData)`
Process full or partial refunds with enhanced tracking (supports up to 10 partial refunds).

**Parameters:**
- `paymentId` - Original payment ID from create payment
- `trxId` - Original transaction ID from execute payment
- `refundAmount` - Refund amount as string with max 2 decimals
- `sku` - Product/service identifier (max 255 chars)
- `reason` - Refund reason (max 255 chars)

```typescript
const refund = await bkash.refundPayment({
  paymentId: 'TR0001xt7mXxG1718274354990',
  trxId: 'BFD90JRLST',
  refundAmount: '50.25', // Partial refund
  sku: 'PRODUCT-SKU-001',
  reason: 'Customer requested partial refund for damaged item'
});

if (refund.refundTransactionStatus === 'Completed') {
  console.log('✅ Refund successful!');
  console.log('Refund Transaction ID:', refund.refundTrxId);
  console.log('Original Amount:', refund.originalTrxAmount);
  console.log('Refunded Amount:', refund.refundAmount);
  console.log('Completed at:', refund.completedTime);
}
```

#### `checkRefundStatus(data: RefundStatusRequest)`
Check status of all refunds for a specific transaction.

```typescript
const refundStatus = await bkash.checkRefundStatus({
  paymentId: 'TR0001xt7mXxG1718274354990',
  trxId: 'BFD90JRLST'
});

console.log('Original Transaction:', refundStatus.originalTrxId);
console.log('Original Amount:', refundStatus.originalTrxAmount);
console.log('Total Refunds:', refundStatus.refundTransactions.length);

// Check each refund
refundStatus.refundTransactions.forEach((refund, index) => {
  console.log(`Refund ${index + 1}:`);
  console.log(`  Status: ${refund.refundTransactionStatus}`);
  console.log(`  Amount: ${refund.refundAmount}`);
  console.log(`  Completed: ${refund.completedTime}`);
});
```

### 🔍 Transaction Management

#### `searchTransaction(data: SearchTransactionData)`
Search transactions with comprehensive details including customer information.

```typescript
const result = await bkash.searchTransaction({
  trxID: '6H7XXXXTCT'
});

console.log('Transaction Details:');
console.log('- ID:', result.trxID);
console.log('- Status:', result.transactionStatus);
console.log('- Type:', result.transactionType);
console.log('- Amount:', result.amount, result.currency);
console.log('- Customer:', result.customerMsisdn);
console.log('- Merchant:', result.organizationShortCode);
console.log('- Initiated:', result.initiationTime);
console.log('- Completed:', result.completedTime);

if (result.transactionReference) {
  console.log('- Reference:', result.transactionReference);
}
```

#### `checkTransactionStatus(transactionId: string)`
Get current transaction status with utility methods.

```typescript
const status = await bkash.checkTransactionStatus('TXN123456');

// Use built-in utility methods
if (bkash.isTransactionSuccessful(status)) {
  console.log('✅ Transaction completed successfully');
} else if (bkash.isTransactionPending(status)) {
  console.log('⏳ Transaction is still pending');
} else if (bkash.isTransactionFailed(status)) {
  console.log('❌ Transaction failed');
}
```

### 🔐 Advanced Authentication & Token Management

#### `grantToken()`
Get new access token with complete response details.

```typescript
const tokenResponse = await bkash.grantToken();

console.log('Access Token:', tokenResponse.id_token);
console.log('Expires in:', tokenResponse.expires_in, 'seconds');
console.log('Refresh Token:', tokenResponse.refresh_token);
console.log('Token Type:', tokenResponse.token_type);
```

#### `refreshToken(refreshToken: string)`
Refresh expired access token.

```typescript
const newToken = await bkash.refreshToken(existingRefreshToken);
console.log('New Access Token:', newToken.id_token);
```

### Webhook Integration & Security

#### `handleWebhook(payload: unknown, signature?: string)`
Process webhook notifications with automatic signature verification.

```typescript
// Express.js webhook endpoint
app.post('/webhook/bkash', async (req, res) => {
  try {
    const signature = req.headers['x-bkash-signature'] as string;
    await bkash.handleWebhook(req.body, signature);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook verification failed:', error.message);
    res.status(400).send('Unauthorized');
  }
});
```

#### `verifyWebhookSignature(payload: string, signature: string)`
Manually verify webhook signatures for enhanced security.

```typescript
const payload = JSON.stringify(req.body);
const signature = req.headers['x-bkash-signature'] as string;

if (bkash.verifyWebhookSignature(payload, signature)) {
  console.log('✅ Webhook signature is valid');
  // Process webhook safely
} else {
  console.log('❌ Invalid webhook signature');
  // Reject the webhook
}
```

#### `createWebhookEvent(type: BkashEventType, data: any)`
Create standardized webhook events for testing or simulation.

```typescript
// Simulate webhook events for testing
const webhookEvent = bkash.createWebhookEvent('payment.success', {
  paymentID: 'TEST123',
  transactionStatus: 'Completed',
  amount: '100.00'
});

await bkash.handleWebhook(webhookEvent);
```

## API Response Examples

### Create Payment Response
```json
{
  "paymentID": "TR0001xt7mXxG1718274354990",
  "paymentCreateTime": "2024-06-13T12:32:35:033 GMT+0600",
  "transactionStatus": "Initiated",
  "amount": "100.50",
  "currency": "BDT",
  "intent": "sale",
  "merchantInvoiceNumber": "INV-1718274354990",
  "bkashURL": "https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/create/TR0001xt7mXxG1718274354990",
  "callbackURL": "https://yoursite.com/callback",
  "successCallbackURL": "https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/callback/success/TR0001xt7mXxG1718274354990",
  "failureCallbackURL": "https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/callback/failure/TR0001xt7mXxG1718274354990",
  "cancelledCallbackURL": "https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/callback/cancel/TR0001xt7mXxG1718274354990",
  "statusCode": "0000",
  "statusMessage": "Successful"
}
```

### Execute Payment Response
```json
{
  "paymentID": "TR0001xt7mXxG1718274354990",
  "statusCode": "0000",
  "statusMessage": "Successful",
  "customerMsisdn": "01712345678",
  "payerReference": "01712345678",
  "paymentExecuteTime": "2024-06-13T12:35:42:127 GMT+0600",
  "trxID": "BFD90JRLST",
  "transactionStatus": "Completed",
  "amount": "100.50",
  "currency": "BDT",
  "intent": "sale",
  "merchantInvoiceNumber": "INV-1718274354990"
}
```

### Refund Response
```json
{
  "originalTrxId": "BFD90JRLST",
  "refundTrxId": "BFE91KSMTU",
  "refundTransactionStatus": "Completed",
  "originalTrxAmount": "100.50",
  "refundAmount": "50.25",
  "currency": "BDT",
  "completedTime": "2024-06-13T13:15:28:456 GMT+0600",
  "sku": "PRODUCT-SKU-001",
  "reason": "Customer requested partial refund"
}
```

## Error Handling

```typescript
import { BkashError } from 'bkash-js';

try {
  const payment = await bkash.createPayment(paymentData);
} catch (error) {
  if (error instanceof BkashError) {
    console.error('bKash Error:', {
      message: error.message,
      code: error.code,
      details: error.details
    });
    
    // Handle specific error codes
    switch (error.code) {
      case 'TOKEN_ERROR':
        console.log('Authentication failed - check credentials');
        break;
      case 'PAYMENT_CREATE_ERROR':
        console.log('Payment creation failed - check payment data');
        break;
      case 'PAYMENT_EXECUTE_ERROR':
        console.log('Payment execution failed - payment may be expired');
        break;
      case 'REFUND_ERROR':
        console.log('Refund failed - check refund eligibility');
        break;
      default:
        console.log('Unknown bKash error occurred');
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Fork and clone the repository
git clone https://github.com/ShejanMahamud/bkash-js.git
cd bkash-js

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build the project
npm run build

# Run linting
npm run lint

# Format code
npm run format
```

### Reporting Issues
Please use the [GitHub Issues](https://github.com/ShejanMahamud/bkash-js/issues) page to report bugs or request features.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [bKash Limited](https://www.bkash.com/) for providing the payment gateway API
- The Node.js and TypeScript communities for excellent tooling
- All contributors who help improve this package

## 📞 Support

- 📧 Email: [dev.shejanmahamud@gmail.com](mailto:dev.shejanmahamud@gmail.com)
- 🐛 Issues: [GitHub Issues](https://github.com/ShejanMahamud/bkash-js/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/ShejanMahamud/bkash-js/discussions)
- 📚 Documentation: [API Reference](https://github.com/ShejanMahamud/bkash-js#readme)

---

<div align="center">

**⭐ If this package helped you, please give it a star on GitHub! ⭐**

Made with ❤️ by [Shejan Mahamud](https://github.com/ShejanMahamud)

</div>