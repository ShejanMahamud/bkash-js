import { BkashPayment, SearchTransactionResponse } from '../src/index';

/**
 * Example demonstrating bKash Search Transaction API
 * 
 * This example shows how to:
 * 1. Search for transaction details using trxID
 * 2. Handle comprehensive transaction information
 * 3. Parse customer and timing information
 * 4. Handle transaction reconciliation scenarios
 */

const config = {
    username: 'your-username',
    password: 'your-password',
    appKey: 'your-app-key',
    appSecret: 'your-app-secret',
    isSandbox: true, // Use sandbox for testing
    log: true,
};

async function demonstrateSearchTransaction() {
    try {
        // Initialize bKash payment instance
        const bkash = new BkashPayment(config);

        console.log('🚀 Starting bKash Search Transaction Demo\n');

        // Example trxID (you would get this from executePayment response)
        const sampleTrxID = '6H7XXXXTCT';

        // Search for transaction details
        console.log('🔍 Searching transaction details...');
        const transactionDetails: SearchTransactionResponse = await bkash.searchTransaction({
            trxID: sampleTrxID
        });

        console.log('✅ Transaction Details Retrieved:');
        console.log(`   Status Code: ${transactionDetails.statusCode}`);
        console.log(`   Status Message: ${transactionDetails.statusMessage}`);
        console.log(`   Transaction ID: ${transactionDetails.trxID}`);
        console.log(`   Transaction Status: ${transactionDetails.transactionStatus}`);
        console.log(`   Transaction Type: ${transactionDetails.transactionType}`);
        console.log(`   Amount: ${transactionDetails.amount} ${transactionDetails.currency}`);
        console.log(`   Customer Mobile: ${transactionDetails.customerMsisdn}`);
        console.log(`   Organization Code: ${transactionDetails.organizationShortCode}`);
        console.log(`   Initiation Time: ${transactionDetails.initiationTime}`);
        console.log(`   Completion Time: ${transactionDetails.completedTime}`);

        if (transactionDetails.transactionReference) {
            console.log(`   Transaction Reference: ${transactionDetails.transactionReference}`);
        }

        // Analyze transaction status
        console.log('\n📊 Transaction Analysis:');
        switch (transactionDetails.transactionStatus) {
            case 'Completed':
                console.log('   ✅ Transaction completed successfully');
                console.log('   💰 Payment has been processed and confirmed');
                break;
            case 'Failed':
                console.log('   ❌ Transaction failed');
                console.log('   💔 Payment was not successful');
                break;
            case 'Pending':
                console.log('   ⏳ Transaction is still pending');
                console.log('   🔄 Payment is being processed');
                break;
            default:
                console.log(`   ⚠️ Unknown transaction status: ${transactionDetails.transactionStatus}`);
        }

        // Parse timing information
        console.log('\n⏰ Timing Information:');
        const initTime = new Date(transactionDetails.initiationTime);
        const completeTime = new Date(transactionDetails.completedTime);
        const processingTime = completeTime.getTime() - initTime.getTime();

        console.log(`   🚀 Initiated: ${initTime.toLocaleString()}`);
        console.log(`   ✅ Completed: ${completeTime.toLocaleString()}`);
        console.log(`   ⚡ Processing Time: ${processingTime}ms`);

        // Customer information
        console.log('\n👤 Customer Information:');
        console.log(`   📱 Mobile Number: ${transactionDetails.customerMsisdn}`);
        console.log(`   🏢 Organization: ${transactionDetails.organizationShortCode}`);

        console.log('\n🎉 Search transaction demonstration completed successfully!');

        return transactionDetails;

    } catch (error: any) {
        console.error('❌ Search transaction failed:', error.message);

        if (error.code) {
            console.error('   Error Code:', error.code);
        }

        if (error.details) {
            console.error('   Error Details:', error.details);
        }
    }
}

// Example of transaction reconciliation
async function reconcileTransactions(trxIDs: string[]) {
    const bkash = new BkashPayment(config);
    const results: Array<{
        trxID: string;
        status: 'found' | 'error';
        details?: SearchTransactionResponse;
        error?: string;
    }> = [];

    console.log(`🔄 Starting transaction reconciliation for ${trxIDs.length} transactions\n`);

    for (let i = 0; i < trxIDs.length; i++) {
        const trxID = trxIDs[i];
        console.log(`📋 Processing ${i + 1}/${trxIDs.length}: ${trxID}`);

        try {
            const transaction = await bkash.searchTransaction({ trxID });

            console.log(`   ✅ Status: ${transaction.transactionStatus}`);
            console.log(`   💰 Amount: ${transaction.amount} ${transaction.currency}`);
            console.log(`   📅 Completed: ${transaction.completedTime}`);

            results.push({
                trxID,
                status: 'found',
                details: transaction
            });

        } catch (error: any) {
            console.log(`   ❌ Error: ${error.message}`);
            results.push({
                trxID,
                status: 'error',
                error: error.message
            });
        }

        // Add delay between requests to avoid rate limiting
        if (i < trxIDs.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log('\n📊 Reconciliation Summary:');
    const successful = results.filter(r => r.status === 'found').length;
    const failed = results.filter(r => r.status === 'error').length;

    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Total: ${results.length}`);

    return results;
}

// Example of transaction reporting
async function generateTransactionReport(trxID: string) {
    try {
        const bkash = new BkashPayment(config);

        console.log(`📊 Generating transaction report for ${trxID}\n`);

        const transaction = await bkash.searchTransaction({ trxID });

        // Generate a comprehensive report
        const report = {
            transactionId: transaction.trxID,
            status: transaction.transactionStatus,
            financials: {
                amount: parseFloat(transaction.amount),
                currency: transaction.currency
            },
            customer: {
                mobile: transaction.customerMsisdn,
                // Extract mobile without country code for compatibility
                localMobile: transaction.customerMsisdn.startsWith('01')
                    ? transaction.customerMsisdn
                    : transaction.customerMsisdn.replace(/^88/, '')
            },
            merchant: {
                organizationCode: transaction.organizationShortCode
            },
            timeline: {
                initiated: transaction.initiationTime,
                completed: transaction.completedTime,
                processingTimeMs: new Date(transaction.completedTime).getTime() -
                    new Date(transaction.initiationTime).getTime()
            },
            metadata: {
                transactionType: transaction.transactionType,
                reference: transaction.transactionReference || null
            }
        };

        console.log('📋 Transaction Report:');
        console.log(JSON.stringify(report, null, 2));

        return report;

    } catch (error: any) {
        console.error('❌ Report generation failed:', error.message);
        throw error;
    }
}

// Example showing complete payment flow with search
async function completePaymentFlowWithSearch() {
    try {
        const bkash = new BkashPayment(config);

        console.log('🚀 Starting Complete Payment Flow with Search Demo\n');

        // 1. Create Payment
        console.log('📝 Step 1: Creating payment...');
        const payment = await bkash.createPayment({
            payerReference: '01723888888',
            callbackURL: 'https://yourdomain.com/callback',
            amount: '150',
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: `INV-SEARCH-${Date.now()}`,
        });

        console.log(`   ✅ Payment created: ${payment.paymentID}`);

        // 2. Simulate payment execution (would happen after user authorization)
        console.log('\n⚡ Step 2: Simulating payment execution...');
        console.log('   (In real scenario, user would complete payment in bKash app)');

        // 3. After execution, you would get a trxID - simulating this
        const simulatedTrxID = '6H7XXXXTCT'; // This would come from executePayment response

        // 4. Search transaction details
        console.log('\n🔍 Step 3: Searching transaction details...');
        const transactionDetails = await bkash.searchTransaction({
            trxID: simulatedTrxID
        });

        console.log(`   📊 Transaction Status: ${transactionDetails.transactionStatus}`);
        console.log(`   💰 Amount: ${transactionDetails.amount} ${transactionDetails.currency}`);
        console.log(`   👤 Customer: ${transactionDetails.customerMsisdn}`);

        console.log('\n✅ Complete payment flow with search finished!');

        return {
            payment,
            transactionDetails
        };

    } catch (error: any) {
        console.error('❌ Complete payment flow failed:', error.message);
        throw error;
    }
}

// Run the demonstrations
if (require.main === module) {
    Promise.all([
        demonstrateSearchTransaction(),
        reconcileTransactions(['6H7XXXXTCT', '6H8XXXXYYY']),
        generateTransactionReport('6H7XXXXTCT'),
        completePaymentFlowWithSearch()
    ]).catch(console.error);
}

export {
    completePaymentFlowWithSearch, demonstrateSearchTransaction, generateTransactionReport, reconcileTransactions
};

