import { BkashPayment, CreatePaymentResponse } from '../src/index';

/**
 * Example demonstrating bKash Create Payment API
 * 
 * This example shows how to:
 * 1. Create a payment with complete API response
 * 2. Handle various payment parameters
 * 3. Use merchant association info for aggregators
 */

const config = {
    username: 'your-username',
    password: 'your-password',
    appKey: 'your-app-key',
    appSecret: 'your-app-secret',
    isSandbox: true, // Use sandbox for testing
    log: true,
};

async function demonstrateCreatePayment() {
    try {
        // Initialize bKash payment instance
        const bkash = new BkashPayment(config);

        console.log('🚀 Starting bKash Create Payment Demo\n');

        // Example 1: Basic payment creation
        console.log('📝 Creating basic payment...');
        const basicPayment = await bkash.createPayment({
            payerReference: '01723888888', // Customer's mobile number
            callbackURL: 'https://yourdomain.com/callback',
            amount: '500', // Amount as string
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: `INV-BASIC-${Date.now()}`,
        });

        console.log('✅ Basic Payment Created:');
        console.log(`   Payment ID: ${basicPayment.paymentID}`);
        console.log(`   Transaction Status: ${basicPayment.transactionStatus}`);
        console.log(`   Amount: ${basicPayment.amount} ${basicPayment.currency}`);
        console.log(`   bKash URL: ${basicPayment.bkashURL}`);
        console.log(`   Success Callback: ${basicPayment.successCallbackURL}\n`);

        // Example 2: Payment with full response (includes all callback URLs)
        console.log('📝 Creating payment with full response...');
        const fullPayment: CreatePaymentResponse = await bkash.createPaymentFull({
            mode: '0011', // Checkout (URL based)
            payerReference: '01723999999',
            callbackURL: 'https://yourdomain.com/payment/callback',
            amount: '1000',
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: `INV-FULL-${Date.now()}`,
            merchantAssociationInfo: 'MI05MID54RF09123456One', // For aggregators
        });

        console.log('✅ Full Payment Response:');
        console.log(`   Payment ID: ${fullPayment.paymentID}`);
        console.log(`   Payment Create Time: ${fullPayment.paymentCreateTime}`);
        console.log(`   Transaction Status: ${fullPayment.transactionStatus}`);
        console.log(`   Amount: ${fullPayment.amount} ${fullPayment.currency}`);
        console.log(`   Intent: ${fullPayment.intent}`);
        console.log(`   Merchant Invoice: ${fullPayment.merchantInvoiceNumber}`);
        console.log(`   bKash URL: ${fullPayment.bkashURL}`);
        console.log(`   Callback URL: ${fullPayment.callbackURL}`);
        console.log(`   Success Callback: ${fullPayment.successCallbackURL}`);
        console.log(`   Failure Callback: ${fullPayment.failureCallbackURL}`);
        console.log(`   Cancelled Callback: ${fullPayment.cancelledCallbackURL}`);
        console.log(`   Status Code: ${fullPayment.statusCode}`);
        console.log(`   Status Message: ${fullPayment.statusMessage}\n`);

        console.log('🎉 Create payment demonstration completed successfully!');

        // Important notes for merchants
        console.log('\n📋 Important Notes:');
        console.log('   1. Payment ID expires after 24 hours if not executed');
        console.log('   2. Each Payment ID is valid for one execution only');
        console.log('   3. Customer should be redirected to bkashURL for payment');
        console.log('   4. Use signature in successCallbackURL to verify bKash response');
        console.log('   5. Special characters "<", ">" and "&" are not allowed in references');

    } catch (error: any) {
        console.error('❌ Create payment failed:', error.message);

        if (error.code) {
            console.error('   Error Code:', error.code);
        }

        if (error.details) {
            console.error('   Error Details:', error.details);
        }
    }
}

// Example of handling payment creation with validation
async function createPaymentWithValidation() {
    try {
        const bkash = new BkashPayment(config);

        // Validate payment data before sending
        const paymentData = {
            payerReference: '01723888888',
            callbackURL: 'https://yourdomain.com/callback',
            amount: '250',
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: `INV-VALIDATED-${Date.now()}`,
        };

        // Check if amount is valid
        const amount = parseFloat(paymentData.amount);
        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }

        // Check if merchant invoice number is unique (implement your own logic)
        if (paymentData.merchantInvoiceNumber.length > 255) {
            throw new Error('Merchant invoice number too long');
        }

        console.log('📝 Creating validated payment...');
        const payment = await bkash.createPayment(paymentData);

        console.log('✅ Validated Payment Created:');
        console.log(`   Payment ID: ${payment.paymentID}`);
        console.log(`   Status: ${payment.transactionStatus}`);

        return payment;
    } catch (error: any) {
        console.error('❌ Validated payment creation failed:', error.message);
        throw error;
    }
}

// Run the demonstrations
if (require.main === module) {
    Promise.all([
        demonstrateCreatePayment(),
        createPaymentWithValidation()
    ]).catch(console.error);
}

export { createPaymentWithValidation, demonstrateCreatePayment };

