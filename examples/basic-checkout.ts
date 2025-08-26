/**
 * Basic bKash Checkout Integration Example
 * 
 * This example shows how to integrate bKash checkout in your Node.js application
 */

import { BkashPayment, ExecutePaymentResponse, PaymentResponse, VerificationResponse } from '../src/index';

// Configuration
const bkash = new BkashPayment({
    appKey: 'your-app-key',
    appSecret: 'your-app-secret',
    username: 'your-username',
    password: 'your-password',
    isSandbox: true, // Set to false for production
    log: true, // Enable logging for debugging
});

// Example payment flow
async function createPayment(): Promise<PaymentResponse> {
    try {
        // 1. Create a payment
        const payment = await bkash.createPayment({
            payerReference: '01723888888', // Customer's mobile number or reference
            callbackURL: 'https://yourwebsite.com/payment/callback',
            amount: '100', // Amount as string
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: `INV-${Date.now()}`,
            // Optional: for aggregators and system integrators
            // merchantAssociationInfo: 'MI05MID54RF09123456789'
        });

        console.log('✅ Payment created successfully!');
        console.log('Payment ID:', payment.paymentID);
        console.log('Transaction Status:', payment.transactionStatus);
        console.log('Redirect user to:', payment.bkashURL);
        console.log('Success Callback:', payment.successCallbackURL);
        console.log('Failure Callback:', payment.failureCallbackURL);

        return payment;
    } catch (error) {
        console.error('❌ Payment creation failed:', error);
        throw error;
    }
}

// Execute payment after user returns from bKash
async function executePayment(paymentID: string): Promise<ExecutePaymentResponse> {
    try {
        const result = await bkash.executePayment(paymentID);

        console.log('✅ Payment executed successfully!');
        console.log('Transaction ID:', result.trxID);
        console.log('Status:', result.transactionStatus);

        return result;
    } catch (error) {
        console.error('❌ Payment execution failed:', error);
        throw error;
    }
}

// Verify payment
async function verifyPayment(transactionId: string): Promise<VerificationResponse> {
    try {
        const verification = await bkash.verifyPayment(transactionId);
        console.log('✅ Payment verified:', verification);
        return verification;
    } catch (error) {
        console.error('❌ Payment verification failed:', error);
        throw error;
    }
}

// Example usage
async function main(): Promise<void> {
    try {
        // Create payment and get redirect URL
        const payment = await createPayment();
        console.log('Payment created with ID:', payment.paymentID);

        // Check initial payment status
        console.log('\n🔍 Checking payment status...');
        const paymentStatus = await bkash.queryPayment(payment.paymentID);
        console.log('Initial status:', paymentStatus.transactionStatus);
        console.log('User verification:', paymentStatus.userVerificationStatus);

        // In real application, redirect user to payment.bkashURL
        // After user completes payment and returns to your callback URL,
        // extract paymentID from callback URL and execute payment

        // Simulate payment execution (in real app, this happens in your callback endpoint)
        // const execution = await executePayment(payment.paymentID);

        // Verify the payment
        // await verifyPayment(execution.trxID);

    } catch (error) {
        console.error('❌ Payment process failed:', error);
    }
}

// Listen for payment events
bkash.on('bkash:event', (event) => {
    console.log('📢 Payment Event:', {
        type: event.type,
        timestamp: event.timestamp,
        data: event.data
    });
});

// Run the example
if (require.main === module) {
    main().catch(console.error);
}

export { createPayment, executePayment, verifyPayment };
