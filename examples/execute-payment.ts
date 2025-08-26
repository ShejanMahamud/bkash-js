import { BkashPayment } from '../src';

// Initialize bKash with your credentials
const bkash = new BkashPayment({
    username: process.env.BKASH_USERNAME || '',
    password: process.env.BKASH_PASSWORD || '',
    appKey: process.env.BKASH_APP_KEY || '',
    appSecret: process.env.BKASH_APP_SECRET || '',
    isSandbox: true, // Set to false for production
    log: true,
});

async function executePaymentExample() {
    try {
        console.log('=== Execute Payment Example ===');

        // Step 1: Create a payment first
        console.log('\n1. Creating payment...');
        const paymentData = {
            amount: '100.00',
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: 'INV-' + Date.now(),
            callbackURL: 'https://yourwebsite.com/payment/callback',
            payerReference: '01712345678', // Customer's mobile number
        };

        const payment = await bkash.createPayment(paymentData);

        console.log('Payment created successfully:');
        console.log('- Payment ID:', payment.paymentID);
        console.log('- bKash URL:', payment.bkashURL);
        console.log('- Status:', payment.statusMessage);

        // Step 2: In real scenario, customer would complete payment via bKash app
        console.log('\n2. Customer completes payment in bKash app...');
        console.log('   (Customer enters PIN and authorizes payment)');

        // Step 3: Execute the payment
        console.log('\n3. Executing payment...');
        const executionResult = await bkash.executePayment(payment.paymentID);

        console.log('\nPayment execution result:');
        console.log('- Payment ID:', executionResult.paymentID);
        console.log('- Status Code:', executionResult.statusCode);
        console.log('- Status Message:', executionResult.statusMessage);
        console.log('- Transaction Status:', executionResult.transactionStatus);
        console.log('- Transaction ID:', executionResult.trxID);
        console.log('- Customer Mobile:', executionResult.customerMsisdn);
        console.log('- Payer Reference:', executionResult.payerReference);
        console.log('- Amount:', executionResult.amount, executionResult.currency);
        console.log('- Execute Time:', executionResult.paymentExecuteTime);
        console.log('- Intent:', executionResult.intent);
        console.log('- Invoice Number:', executionResult.merchantInvoiceNumber);

        // Check if payment was successful
        if (executionResult.transactionStatus === 'Completed') {
            console.log('\n✅ Payment completed successfully!');
            console.log('🎉 Transaction can be fulfilled');

            // Store transaction details for your records
            const transactionRecord = {
                paymentId: executionResult.paymentID,
                transactionId: executionResult.trxID,
                amount: executionResult.amount,
                currency: executionResult.currency,
                customerMobile: executionResult.customerMsisdn,
                completedAt: executionResult.paymentExecuteTime,
                merchantInvoice: executionResult.merchantInvoiceNumber,
                status: 'completed'
            };

            console.log('\nTransaction record for database:', transactionRecord);

        } else {
            console.log('\n❌ Payment failed or incomplete');
            console.log('Status:', executionResult.transactionStatus);
            console.log('Message:', executionResult.statusMessage);
        }

    } catch (error) {
        console.error('\n💥 Execute payment error:', error);

        if (error instanceof Error) {
            console.error('Error message:', error.message);

            // Handle specific error scenarios
            if (error.message.includes('session of this payment has timed out')) {
                console.log('\n⏰ Payment session expired (24 hour limit)');
                console.log('Solution: Create a new payment');
            } else if (error.message.includes('already been executed')) {
                console.log('\n🔄 Payment ID already used');
                console.log('Solution: Use payment ID only once for execution');
            }
        }
    }
}

// Comprehensive payment flow example
async function completePaymentFlowExample() {
    try {
        console.log('\n=== Complete Payment Flow Example ===');

        // 1. Create Payment
        const paymentData = {
            amount: '250.75',
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: 'ORDER-' + Date.now(),
            callbackURL: 'https://yourstore.com/payment/callback',
            payerReference: '01987654321',
        };

        console.log('\n📱 Step 1: Creating payment...');
        const payment = await bkash.createPayment(paymentData);

        // 2. Redirect customer or show bKash URL
        console.log('\n🔗 Step 2: Redirect customer to bKash');
        console.log('Customer should visit:', payment.bkashURL);

        // 3. Wait for customer to complete payment
        console.log('\n⏳ Step 3: Waiting for customer to complete payment...');
        console.log('(In production, this would be triggered by webhook or polling)');

        // 4. Execute payment
        console.log('\n✅ Step 4: Executing payment...');
        const result = await bkash.executePayment(payment.paymentID);

        // 5. Process result
        console.log('\n📊 Step 5: Processing result...');

        if (result.transactionStatus === 'Completed') {
            console.log('\n🎉 Payment Flow Completed Successfully!');

            // Update order status
            console.log('- Updating order status to "paid"');
            console.log('- Sending confirmation email to customer');
            console.log('- Preparing order for fulfillment');

            // Generate receipt data
            const receipt = {
                orderId: paymentData.merchantInvoiceNumber,
                transactionId: result.trxID,
                amount: result.amount,
                currency: result.currency,
                customerPhone: result.customerMsisdn,
                paymentMethod: 'bKash',
                completedAt: new Date(result.paymentExecuteTime),
                status: 'completed'
            };

            console.log('\n🧾 Receipt generated:', receipt);

        } else {
            console.log('\n❌ Payment Flow Failed');
            console.log('- Order remains unpaid');
            console.log('- Customer needs to retry payment');
        }

    } catch (error) {
        console.error('\n💥 Payment flow error:', error);
    }
}

// Payment ID limitations demo
async function paymentIdLimitationsDemo() {
    try {
        console.log('\n=== Payment ID Limitations Demo ===');

        // Create a payment
        const payment = await bkash.createPayment({
            amount: '50.00',
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: 'DEMO-' + Date.now(),
            callbackURL: 'https://example.com/callback',
            payerReference: '01712345678',
        });

        console.log('\n✅ Payment created:', payment.paymentID);

        // Execute payment first time
        console.log('\n1️⃣ Executing payment (first time)...');
        const firstExecution = await bkash.executePayment(payment.paymentID);
        console.log('First execution result:', firstExecution.transactionStatus);

        // Try to execute same payment ID again (should fail)
        console.log('\n2️⃣ Trying to execute same payment ID again...');
        try {
            await bkash.executePayment(payment.paymentID);
            console.log('❌ This should not happen!');
        } catch (error) {
            console.log('✅ Expected error: Payment ID cannot be reused for execution');
            console.log('Error:', error instanceof Error ? error.message : error);
        }

        // But we can still query the payment
        console.log('\n3️⃣ Querying payment status (should work)...');
        const queryResult = await bkash.queryPayment(payment.paymentID);
        console.log('✅ Query successful:', queryResult.transactionStatus);

        console.log('\n💡 Key Takeaways:');
        console.log('- Payment ID expires after 24 hours if not executed');
        console.log('- Payment ID can only be executed once');
        console.log('- After execution, payment ID is still valid for queries');

    } catch (error) {
        console.error('Demo error:', error);
    }
}

// Event listener examples
bkash.on('payment.success', (paymentData) => {
    console.log('\n🎉 Payment success event received:', paymentData.trxID);
});

bkash.on('payment.failed', (errorData) => {
    console.log('\n❌ Payment failed event received:', errorData);
});

// Run examples
async function runExamples() {
    await executePaymentExample();
    await completePaymentFlowExample();
    await paymentIdLimitationsDemo();
}

if (require.main === module) {
    runExamples().catch(console.error);
}

export {
    completePaymentFlowExample, executePaymentExample, paymentIdLimitationsDemo
};

