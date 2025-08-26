# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-08-27

### ✨ Added
- **New v2 API Support**: Complete implementation of bKash v2 APIs for enhanced functionality
- **Refund Status API**: New `checkRefundStatus()` method to track refund transaction status
- **Enhanced Token Management**: New `grantToken()` and `refreshToken()` methods with proper error handling
- **Full Payment API**: New `createPaymentFull()` method returning complete API response
- **Query Payment API**: New `queryPayment()` method for detailed payment status checking
- **Advanced Search**: New `searchTransaction()` method with modern API endpoint support
- **Legacy Compatibility**: Backward compatibility methods for existing integrations
  - `refundPaymentLegacy()` - Legacy refund format support
  - `searchTransactionLegacy()` - Legacy search format support
- **Enhanced TypeScript Support**: Comprehensive type definitions for all APIs
  - `RefundStatusRequest` and `RefundStatusResponse` interfaces
  - `RefundData` and `LegacyRefundData` interfaces
  - `CreatePaymentResponse` and `QueryPaymentResponse` interfaces
  - `GrantTokenResponse` and `RefreshTokenResponse` interfaces
- **Event System Enhancements**: New event types for better integration
  - `refund.status.checked` and `refund.status.failed` events
  - Enhanced event data structures
- **Comprehensive Examples**: Industry-standard example implementations
  - Complete payment flow examples
  - Refund transaction examples with v2 API
  - Execute payment examples with error handling
  - Event-driven integration patterns

### 🚀 Enhanced
- **Execute Payment API**: Updated with complete v2 API specification compliance
  - Added `customerMsisdn` field in response
  - Enhanced documentation with payment ID limitations
  - Improved error handling for expired and invalid payment IDs
- **Refund API**: Complete v2 API implementation
  - Multiple partial refunds support
  - Enhanced refund amount validation with decimal precision
  - New `sku` field for product tracking
  - Improved error codes and messages
- **Transaction Status Methods**: Enhanced utility methods
  - `isTransactionSuccessful()` with detailed status checking
  - `isTransactionPending()` for incomplete transactions
  - `isTransactionFailed()` with proper error identification
- **Input Validation**: Enhanced Zod schemas for all API endpoints
  - `RefundStatusRequestSchema` for refund status validation
  - `RefundDataSchema` with proper amount format validation
  - `LegacyRefundDataSchema` for backward compatibility
- **Error Handling**: Improved error messages and error codes mapping
  - Specific error handling for refund API error codes (2071-2082)
  - Better timeout and retry error handling
  - Enhanced webhook signature validation errors

### 🔧 Changed
- **BREAKING**: `RefundResponse` interface updated with v2 API fields
  - Added `originalTrxAmount`, `sku`, and `reason` fields
  - Changed field ordering to match API specification
- **BREAKING**: `ExecutePaymentResponse` interface updated
  - Added required `customerMsisdn` field
  - Made `payerReference` required (was optional)
  - Updated field ordering per API specification
- **API Endpoints**: Updated to use v2 endpoints where available
  - Refund API now uses `/v2/tokenized-checkout/refund/payment/transaction`
  - Refund Status API uses `/v2/tokenized-checkout/refund/payment/status`
  - Search Transaction uses `/tokenized/checkout/general/searchTran`
- **Event Names**: Updated event naming convention for consistency
  - All events now follow `category.action` pattern
  - Added namespace support for event categorization

### 🔒 Security
- **Enhanced Webhook Security**: Improved signature verification
- **Input Sanitization**: Enhanced validation for all user inputs
- **Token Security**: Secure token storage and automatic refresh
- **Error Data Sanitization**: Sensitive data removal from error responses

### 🐛 Fixed
- **Token Refresh**: Fixed automatic token refresh mechanism
- **Retry Logic**: Improved retry logic for network failures
- **Type Exports**: Fixed TypeScript type exports in index file
- **Validation Errors**: Improved validation error messages
- **Event Emission**: Fixed event emission timing and data consistency

### 📚 Documentation
- **API Reference**: Complete API documentation with all methods and types
- **Examples**: Comprehensive example files for all major use cases
- **JSDoc**: Enhanced JSDoc comments with detailed parameter descriptions
- **Migration Guide**: Added migration guide for v1 to v2 upgrade
- **Error Handling**: Detailed error handling patterns and best practices

### 🧪 Testing
- **Test Coverage**: Enhanced test coverage to 95%+
- **Integration Tests**: Added comprehensive integration test suite
- **Error Scenario Testing**: Complete error scenario coverage
- **Event Testing**: Full event emission and handling tests
- **Validation Testing**: Comprehensive input validation testing

### ⚡ Performance
- **Request Optimization**: Improved request handling and response processing
- **Memory Usage**: Optimized memory usage for long-running applications
- **Token Caching**: Enhanced token caching mechanism
- **Connection Pooling**: Improved HTTP connection management

---

## [1.0.0] - 2024-08-27

### 🎉 Initial Release
- **bKash Integration**: Complete bKash Checkout (URL Based) payment integration
- **TypeScript Support**: Full TypeScript support with comprehensive type definitions
- **Core Payment APIs**: Essential payment functionality
  - `createPayment()` - Create checkout payments
  - `executePayment()` - Execute payments after user completion
  - `verifyPayment()` - Verify payment status
  - `checkTransactionStatus()` - Check transaction status
  - `refundPayment()` - Process refunds (v1 API)
  - `searchTransaction()` - Search transactions (v1 API)
- **Webhook Integration**: Secure webhook handling with HMAC-SHA256 signature verification
- **Event System**: EventEmitter-based architecture for real-time updates
- **Error Handling**: Custom error types and comprehensive error management
- **Input Validation**: Zod-based request validation
- **Logging**: Winston-based logging system
- **Testing**: Jest-based test suite with good coverage
- **Developer Experience**: ESLint, Prettier, and development tooling setup

### 🔧 Technical Features
- **Automatic Token Management**: Handles authentication lifecycle
- **Retry Logic**: Built-in retry mechanism for failed requests
- **Request Timeout**: Configurable request timeouts
- **Sandbox Support**: Complete sandbox environment support
- **Production Ready**: Battle-tested configuration and error handling

---

## Migration Guide

### Upgrading from v1.x to v2.x

#### Breaking Changes

1. **RefundResponse Interface**:
   ```typescript
   // v1.x
   interface RefundResponse {
     refundTrxId: string;
     // ... other fields
   }
   
   // v2.x
   interface RefundResponse {
     refundTrxId: string;
     originalTrxAmount: string; // NEW
     sku: string; // NEW
     reason: string; // NEW
     // ... other fields
   }
   ```

2. **ExecutePaymentResponse Interface**:
   ```typescript
   // v1.x
   interface ExecutePaymentResponse {
     payerReference?: string; // Optional
     // ... other fields
   }
   
   // v2.x
   interface ExecutePaymentResponse {
     customerMsisdn: string; // NEW required field
     payerReference: string; // Now required
     // ... other fields
   }
   ```

3. **Refund API**:
   ```typescript
   // v1.x
   await bkash.refundPayment({
     paymentId: 'PAY123',
     transactionId: 'TXN456',
     amount: 100,
     reason: 'Refund'
   });
   
   // v2.x (Recommended)
   await bkash.refundPayment({
     paymentId: 'PAY123',
     trxId: 'TXN456', // Changed field name
     refundAmount: '100.00', // String format with decimals
     sku: 'PRODUCT-001', // New required field
     reason: 'Refund'
   });
   
   // v2.x (Legacy compatibility)
   await bkash.refundPaymentLegacy({
     paymentId: 'PAY123',
     transactionId: 'TXN456', // Old field name still works
     amount: 100, // Number format still works
     reason: 'Refund'
   });
   ```

#### New Features Available

1. **Refund Status Checking**:
   ```typescript
   const refundStatus = await bkash.checkRefundStatus({
     paymentId: 'PAY123',
     trxId: 'TXN456'
   });
   ```

2. **Enhanced Token Management**:
   ```typescript
   const token = await bkash.grantToken();
   const refreshed = await bkash.refreshToken(refreshTokenValue);
   ```

3. **Full Payment Response**:
   ```typescript
   const fullResponse = await bkash.createPaymentFull(paymentData);
   // Returns complete API response instead of simplified format
   ```

#### Event System Updates

New event types available:
- `refund.status.checked` - When refund status is successfully retrieved
- `refund.status.failed` - When refund status check fails

#### Recommended Migration Steps

1. **Update Dependencies**:
   ```bash
   npm install bkash-js@latest
   ```

2. **Update Type Imports**:
   ```typescript
   import { 
     RefundStatusRequest,
     RefundStatusResponse,
     CreatePaymentResponse,
     QueryPaymentResponse 
   } from 'bkash-js';
   ```

3. **Test Refund Integration**:
   - Use `refundPaymentLegacy()` for immediate compatibility
   - Migrate to `refundPayment()` for enhanced features
   - Add `checkRefundStatus()` for better refund tracking

4. **Update Execute Payment Handling**:
   - Access `customerMsisdn` field in execute payment response
   - Ensure `payerReference` is provided in create payment

5. **Leverage New Features**:
   - Implement refund status checking for better UX
   - Use query payment API for detailed payment information
   - Add comprehensive error handling for new error codes
