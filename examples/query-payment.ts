import { BkashPayment, QueryPaymentResponse } from '../src/index';

/**
 * Example demonstrating bKash Query Payment API
 * 
 * This example shows how to:
 * 1. Query payment status using paymentID
 * 2. Handle different transaction statuses
 * 3. Check user verification status
 * 4. Handle payment lifecycle
 */

const config = {
    username: 'your-username',
    password: 'your-password',
    appKey: 'your-app-key',
    appSecret: 'your-app-secret',
    isSandbox: true, // Use sandbox for testing
    log: true,
};

async function demonstrateQueryPayment() {
    try {
        // Initialize bKash payment instance
        const bkash = new BkashPayment(config);

        console.log('🚀 Starting bKash Query Payment Demo\n');

        // Example paymentID (you would get this from createPayment response)
        const samplePaymentID = 'TR0001IV1565085942653';

        // Query payment status
        console.log('📝 Querying payment status...');
        const paymentStatus: QueryPaymentResponse = await bkash.queryPayment(samplePaymentID);

        console.log('✅ Payment Status Retrieved:');
        console.log(`   Status Code: ${paymentStatus.statusCode}`);
        console.log(`   Status Message: ${paymentStatus.statusMessage}`);
        console.log(`   Payment ID: ${paymentStatus.paymentID}`);
        console.log(`   Mode: ${paymentStatus.mode}`);
        console.log(`   Payment Create Time: ${paymentStatus.paymentCreateTime}`);

        if (paymentStatus.paymentExecuteTime) {
            console.log(`   Payment Execute Time: ${paymentStatus.paymentExecuteTime}`);
        }

        if (paymentStatus.trxID) {
            console.log(`   Transaction ID: ${paymentStatus.trxID}`);
        }

        console.log(`   Transaction Status: ${paymentStatus.transactionStatus}`);
        console.log(`   Amount: ${paymentStatus.amount} ${paymentStatus.currency}`);
        console.log(`   Intent: ${paymentStatus.intent}`);
        console.log(`   Merchant Invoice: ${paymentStatus.merchantInvoice}`);
        console.log(`   User Verification Status: ${paymentStatus.userVerificationStatus}`);
        console.log(`   Payer Reference: ${paymentStatus.payerReference}`);

        // Check for agreement fields (if present)
        if (paymentStatus.agreementID) {
            console.log(`   Agreement ID: ${paymentStatus.agreementID}`);
            console.log(`   Agreement Status: ${paymentStatus.agreementStatus}`);
            console.log(`   Agreement Create Time: ${paymentStatus.agreementCreateTime}`);
            console.log(`   Agreement Execute Time: ${paymentStatus.agreementExecuteTime}`);
        }

        // Handle different transaction statuses
        console.log('\n📋 Status Analysis:');
        switch (paymentStatus.transactionStatus) {
            case 'Completed':
                console.log('   ✅ Payment has been completed successfully');
                if (paymentStatus.trxID) {
                    console.log('   💰 Transaction ID is available for records');
                }
                break;
            case 'Initiated':
                console.log('   ⏳ Payment is still in progress');
                console.log('   👤 Customer needs to complete the payment process');
                break;
            default:
                console.log(`   ⚠️ Unknown transaction status: ${paymentStatus.transactionStatus}`);
        }

        // Handle user verification status
        console.log('\n👤 User Verification Analysis:');
        switch (paymentStatus.userVerificationStatus) {
            case 'Complete':
                console.log('   ✅ User has completed verification (wallet number, OTP, PIN)');
                break;
            case 'Incomplete':
                console.log('   ⏳ User verification is incomplete or in progress');
                console.log('   📱 User may still need to enter wallet details or PIN');
                break;
            default:
                console.log(`   ⚠️ Unknown verification status: ${paymentStatus.userVerificationStatus}`);
        }

        console.log('\n🎉 Query payment demonstration completed successfully!');

    } catch (error: any) {
        console.error('❌ Query payment failed:', error.message);

        if (error.code) {
            console.error('   Error Code:', error.code);
        }

        if (error.details) {
            console.error('   Error Details:', error.details);
        }
    }
}

// Example of polling payment status until completion
async function pollPaymentStatus(paymentID: string, maxAttempts = 10, intervalMs = 5000) {
    const bkash = new BkashPayment(config);

    console.log(`🔄 Starting payment status polling for ${paymentID}`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`\n📡 Polling attempt ${attempt}/${maxAttempts}...`);

            const status = await bkash.queryPayment(paymentID);

            console.log(`   Status: ${status.transactionStatus}`);
            console.log(`   User Verification: ${status.userVerificationStatus}`);

            if (status.transactionStatus === 'Completed') {
                console.log('   ✅ Payment completed successfully!');
                console.log(`   💰 Transaction ID: ${status.trxID}`);
                return status;
            }

            if (attempt < maxAttempts) {
                console.log(`   ⏳ Payment still in progress. Waiting ${intervalMs}ms before next check...`);
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }

        } catch (error: any) {
            console.error(`   ❌ Polling attempt ${attempt} failed:`, error.message);

            if (attempt < maxAttempts) {
                console.log(`   🔄 Retrying in ${intervalMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }
        }
    }

    throw new Error(`Payment status polling exceeded ${maxAttempts} attempts`);
}

// Example of comprehensive payment flow with query
async function completePaymentFlow() {
    try {
        const bkash = new BkashPayment(config);

        console.log('🚀 Starting Complete Payment Flow Demo\n');

        // 1. Create Payment
        console.log('📝 Step 1: Creating payment...');
        const payment = await bkash.createPayment({
            payerReference: '01723888888',
            callbackURL: 'https://yourdomain.com/callback',
            amount: '250',
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: `INV-DEMO-${Date.now()}`,
        });

        console.log(`   ✅ Payment created: ${payment.paymentID}`);
        console.log(`   🔗 bKash URL: ${payment.bkashURL}`);

        // 2. Initial Query
        console.log('\n🔍 Step 2: Querying initial payment status...');
        const initialStatus = await bkash.queryPayment(payment.paymentID);
        console.log(`   📊 Initial Status: ${initialStatus.transactionStatus}`);
        console.log(`   👤 User Verification: ${initialStatus.userVerificationStatus}`);

        // 3. Simulate waiting for user action
        console.log('\n⏳ Step 3: In real scenario, user would complete payment in bKash app...');
        console.log('   (This demo will just query the current status)');

        // 4. Final Query
        console.log('\n🔍 Step 4: Final payment status query...');
        const finalStatus = await bkash.queryPayment(payment.paymentID);
        console.log(`   📊 Final Status: ${finalStatus.transactionStatus}`);
        console.log(`   👤 User Verification: ${finalStatus.userVerificationStatus}`);

        console.log('\n✅ Complete payment flow demonstration finished!');

        return {
            payment,
            initialStatus,
            finalStatus
        };

    } catch (error: any) {
        console.error('❌ Complete payment flow failed:', error.message);
        throw error;
    }
}

// Run the demonstrations
if (require.main === module) {
    Promise.all([
        demonstrateQueryPayment(),
        completePaymentFlow()
    ]).catch(console.error);
}

export {
    completePaymentFlow, demonstrateQueryPayment,
    pollPaymentStatus
};

