/**
 * Express.js bKash Integration Example
 * 
 * This example shows how to integrate bKash checkout in an Express.js application
 * 
 * To run this example:
 * npm install express @types/express
 */

import express from 'express';
import { BkashError, BkashPayment } from '../src/index';

const app = express();
app.use(express.json());

// Initialize bKash
const bkash = new BkashPayment({
    appKey: process.env.BKASH_APP_KEY || 'your-app-key',
    appSecret: process.env.BKASH_APP_SECRET || 'your-app-secret',
    username: process.env.BKASH_USERNAME || 'your-username',
    password: process.env.BKASH_PASSWORD || 'your-password',
    isSandbox: process.env.NODE_ENV !== 'production',
    webhook: {
        secret: process.env.BKASH_WEBHOOK_SECRET || 'your-webhook-secret',
    },
});

// Create payment endpoint
app.post('/payment/create', async (req, res) => {
    try {
        const { amount, merchantInvoiceNumber, customerEmail } = req.body;

        // Validate input
        if (!amount || !merchantInvoiceNumber) {
            return res.status(400).json({
                success: false,
                message: 'Amount and merchantInvoiceNumber are required'
            });
        }

        const payment = await bkash.createPayment({
            amount: parseFloat(amount),
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber,
            callbackURL: `${req.protocol}://${req.get('host')}/payment/callback`,
            payerReference: customerEmail,
        });

        res.json({
            success: true,
            data: {
                paymentID: payment.paymentID,
                bkashURL: payment.bkashURL,
                statusCode: payment.statusCode,
                statusMessage: payment.statusMessage,
            },
        });
    } catch (error) {
        console.error('Payment creation failed:', error);

        if (error instanceof BkashError) {
            return res.status(400).json({
                success: false,
                message: error.message,
                code: error.code,
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

// Payment callback endpoint
app.get('/payment/callback', async (req, res) => {
    try {
        const { paymentID, status } = req.query;

        if (status === 'success' && paymentID) {
            // Execute the payment
            const result = await bkash.executePayment(paymentID as string);

            // Store result in your database here
            console.log('Payment successful:', result);

            res.redirect(`/payment/success?trxID=${result.trxID}&amount=${result.amount}`);
        } else if (status === 'failure') {
            res.redirect('/payment/failure');
        } else if (status === 'cancel') {
            res.redirect('/payment/cancel');
        } else {
            res.redirect('/payment/failure');
        }
    } catch (error) {
        console.error('Payment callback error:', error);
        res.redirect('/payment/failure');
    }
});

// Verify payment endpoint  
app.post('/payment/verify', async (req, res) => {
    try {
        const { transactionId } = req.body;

        if (!transactionId) {
            return res.status(400).json({
                success: false,
                message: 'Transaction ID is required'
            });
        }

        const verification = await bkash.verifyPayment(transactionId);

        res.json({
            success: true,
            data: verification,
        });
    } catch (error) {
        console.error('Payment verification failed:', error);

        if (error instanceof BkashError) {
            return res.status(400).json({
                success: false,
                message: error.message,
                code: error.code,
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

// Refund payment endpoint
app.post('/payment/refund', async (req, res) => {
    try {
        const { paymentId, transactionId, amount, reason } = req.body;

        if (!paymentId || !transactionId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID, transaction ID, and amount are required'
            });
        }

        const refund = await bkash.refundPayment({
            paymentId,
            transactionId,
            amount: parseFloat(amount),
            reason,
        });

        res.json({
            success: true,
            data: refund,
        });
    } catch (error) {
        console.error('Refund failed:', error);

        if (error instanceof BkashError) {
            return res.status(400).json({
                success: false,
                message: error.message,
                code: error.code,
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

// Webhook endpoint
app.post('/webhook/bkash', async (req, res) => {
    try {
        const signature = req.headers['x-bkash-signature'] as string;

        await bkash.handleWebhook(req.body, signature);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : 'Webhook processing failed'
        });
    }
});

// Listen for payment events
bkash.on('bkash:event', (event) => {
    console.log('📢 bKash Event Received:', {
        type: event.type,
        timestamp: event.timestamp,
    });

    // Handle different event types
    switch (event.type) {
        case 'payment.created':
            console.log('✅ Payment created:', event.data);
            break;
        case 'payment.success':
            console.log('✅ Payment successful:', event.data);
            // Update your database, send confirmation email, etc.
            break;
        case 'payment.failed':
            console.log('❌ Payment failed:', event.data);
            // Handle failed payment
            break;
        case 'refund.success':
            console.log('💰 Refund successful:', event.data);
            // Handle successful refund
            break;
        default:
            console.log('📝 Other event:', event.type, event.data);
    }
});

// Success page
app.get('/payment/success', (req, res) => {
    const { trxID, amount } = req.query;
    res.send(`
    <h1>Payment Successful!</h1>
    <p>Transaction ID: ${trxID}</p>
    <p>Amount: ${amount} BDT</p>
    <p>Thank you for your payment!</p>
  `);
});

// Failure page
app.get('/payment/failure', (req, res) => {
    res.send(`
    <h1>Payment Failed</h1>
    <p>Your payment could not be processed. Please try again.</p>
    <a href="/">Go Back</a>
  `);
});

// Cancel page
app.get('/payment/cancel', (req, res) => {
    res.send(`
    <h1>Payment Cancelled</h1>
    <p>You have cancelled the payment.</p>
    <a href="/">Go Back</a>
  `);
});

// Home page with payment form
app.get('/', (req, res) => {
    res.send(`
    <h1>bKash Payment Demo</h1>
    <form method="POST" action="/payment/create">
      <label>Amount (BDT): <input type="number" name="amount" required></label><br>
      <label>Invoice Number: <input type="text" name="merchantInvoiceNumber" required></label><br>
      <label>Email: <input type="email" name="customerEmail"></label><br>
      <button type="submit">Pay with bKash</button>
    </form>
  `);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook/bkash`);
});

export default app;
