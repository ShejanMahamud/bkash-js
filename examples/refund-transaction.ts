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

async function refundTransactionExample() {
    try {
        // Method 1: New Refund API (v2) - Recommended
        console.log('=== Refund Transaction Example (v2 API) ===');

        const refundData = {
            paymentId: 'TR001',
            trxId: 'BFD90JRLST', // Original transaction ID from bKash
            refundAmount: '25.50', // Amount as string with decimal places
            sku: 'PRODUCT-001', // Product SKU
            reason: 'Customer requested refund', // Optional reason
        };

        const refundResult = await bkash.refundPayment(refundData);

        console.log('Refund Response:');
        console.log('- Refund Transaction ID:', refundResult.refundTrxId);
        console.log('- Status:', refundResult.refundTransactionStatus);
        console.log('- Refund Amount:', refundResult.refundAmount);
        console.log('- Currency:', refundResult.currency);
        console.log('- Completed Time:', refundResult.completedTime);
        console.log('- Original Transaction ID:', refundResult.originalTrxId);


        // Multiple Partial Refunds
        console.log('\n=== Multiple Partial Refunds Example ===');

        const refunds = [
            {
                paymentId: 'TR003',
                trxId: 'BFD90OPQRS',
                refundAmount: '15.00',
                sku: 'ITEM-001',
                reason: 'Damaged item',
            },
            {
                paymentId: 'TR003',
                trxId: 'BFD90OPQRS',
                refundAmount: '5.00',
                sku: 'SHIPPING-001',
                reason: 'Shipping fee refund',
            },
        ];

        for (const refund of refunds) {
            const result = await bkash.refundPayment(refund);
            console.log(`Refund ${result.refundTrxId}: ${result.refundAmount} ${result.currency}`);
        }

        // Check Refund Status Example
        console.log('\n=== Check Refund Status Example ===');

        const refundStatusData = {
            paymentId: 'TR0001xt7mXxG1718274354990',
            trxId: 'BFD90JRLST'
        };

        const refundStatus = await bkash.checkRefundStatus(refundStatusData);

        console.log('Refund Status Response:');
        console.log('- Original Transaction ID:', refundStatus.originalTrxId);
        console.log('- Original Amount:', refundStatus.originalTrxAmount);
        console.log('- Original Completed Time:', refundStatus.originalTrxCompletedTime);
        console.log('- Number of Refunds:', refundStatus.refundTransactions.length);

        // Display details of each refund
        refundStatus.refundTransactions.forEach((refund, index) => {
            console.log(`\nRefund ${index + 1}:`);
            console.log(`  - Refund Transaction ID: ${refund.refundTrxId}`);
            console.log(`  - Status: ${refund.refundTransactionStatus}`);
            console.log(`  - Amount: ${refund.refundAmount}`);
            console.log(`  - Completed Time: ${refund.completedTime}`);
        });

        // Calculate total refunded amount
        const totalRefunded = refundStatus.refundTransactions
            .reduce((sum, refund) => sum + parseFloat(refund.refundAmount), 0);
        const remainingAmount = parseFloat(refundStatus.originalTrxAmount) - totalRefunded;

        console.log('\nSummary:');
        console.log(`- Original Amount: ${refundStatus.originalTrxAmount}`);
        console.log(`- Total Refunded: ${totalRefunded.toFixed(2)}`);
        console.log(`- Remaining Amount: ${remainingAmount.toFixed(2)}`);

    } catch (error) {
        console.error('Refund transaction error:', error);

        if (error instanceof Error) {
            console.error('Error message:', error.message);
        }
    }
}

// Error handling example
async function refundErrorHandlingExample() {
    try {
        console.log('\n=== Refund Error Handling Example ===');

        // This will trigger validation error
        const invalidRefund = {
            paymentId: '', // Empty payment ID will cause validation error
            trxId: 'BFD90JRLST',
            refundAmount: 'invalid', // Invalid amount format
            sku: 'PRODUCT-001',
            reason: 'Test refund',
        };

        await bkash.refundPayment(invalidRefund as any);

    } catch (error) {
        console.log('Expected validation error caught:', error);
    }

    try {
        // This will trigger API error (assuming invalid transaction ID)
        const apiErrorRefund = {
            paymentId: 'INVALID_PAYMENT_ID',
            trxId: 'INVALID_TRX_ID',
            refundAmount: '10.00',
            sku: 'PRODUCT-001',
            reason: 'Test refund',
        };

        await bkash.refundPayment(apiErrorRefund);

    } catch (error) {
        console.log('Expected API error caught:', error);
    }

    try {
        // This will trigger refund status validation error
        const invalidStatusRequest = {
            paymentId: '', // Empty payment ID
            trxId: 'BFD90JRLST'
        };

        await bkash.checkRefundStatus(invalidStatusRequest as any);

    } catch (error) {
        console.log('Expected refund status validation error caught:', error);
    }

    try {
        // This will trigger refund status API error
        const invalidStatusRequest = {
            paymentId: 'INVALID_PAYMENT_ID',
            trxId: 'INVALID_TRX_ID'
        };

        await bkash.checkRefundStatus(invalidStatusRequest);

    } catch (error) {
        console.log('Expected refund status API error caught:', error);
    }
}

// Event listener example
bkash.on('refund.processed', (refundData) => {
    console.log('Refund processed event:', refundData);
});

bkash.on('refund.failed', (errorData) => {
    console.log('Refund failed event:', errorData);
});

bkash.on('refund.status.checked', (statusData) => {
    console.log('Refund status checked event:', statusData);
});

bkash.on('refund.status.failed', (errorData) => {
    console.log('Refund status failed event:', errorData);
});

// Run examples
async function runExamples() {
    await refundTransactionExample();
    await refundErrorHandlingExample();
}

if (require.main === module) {
    runExamples().catch(console.error);
}

export { refundErrorHandlingExample, refundTransactionExample };

