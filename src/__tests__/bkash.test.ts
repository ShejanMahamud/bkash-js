/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import crypto from 'crypto';
import {
  BkashConfig,
  BkashPayment,
  PaymentData
} from '../index';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function createMockAxiosInstance(): any {
  return {
    interceptors: {
      response: { use: jest.fn() },
    },
    post: jest.fn(),
    get: jest.fn(),
  };
}

describe('BkashPayment', () => {
  const config: BkashConfig = {
    username: 'user',
    password: 'pass',
    appKey: 'key',
    appSecret: 'secret',
    isSandbox: true,
    webhook: { secret: 'webhook' },
  };

  beforeEach(() => {
    mockedAxios.create.mockImplementation(createMockAxiosInstance);
  });

  it('should emit payment.created event', async () => {
    const bkash = new BkashPayment(config);
    const paymentData: PaymentData = {
      payerReference: '01723888888',
      callbackURL: 'https://callback',
      amount: '100',
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: 'INV-1',
    };
    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockResolvedValueOnce({
        data: {
          paymentID: 'PID',
          bkashURL: 'https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/create/PID',
          statusCode: '0000',
          statusMessage: 'Successful',
          amount: '100',
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: 'INV-1'
        }
      }); // createPayment
    const eventPromise = new Promise((resolve) => bkash.on('bkash:event', resolve));
    await bkash.createPayment(paymentData);
    expect(await eventPromise).toMatchObject({ type: 'payment.created' });
  });

  it('should execute payment successfully with all response fields', async () => {
    const bkash = new BkashPayment(config);
    const paymentID = 'TR0011ON1565154754797';

    const mockExecuteResponse = {
      statusCode: '0000',
      statusMessage: 'Successful',
      paymentID: paymentID,
      customerMsisdn: '01770618575',
      payerReference: '01770618575',
      trxID: '6H7801QFYM',
      transactionStatus: 'Completed',
      amount: '15',
      paymentExecuteTime: '2019-08-07T11:15:56:336 GMT+0600',
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: 'MER1231',
    };

    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockResolvedValueOnce({ data: mockExecuteResponse }); // executePayment

    const result = await bkash.executePayment(paymentID);

    // Validate all response fields
    expect(result.paymentID).toBe(paymentID);
    expect(result.statusCode).toBe('0000');
    expect(result.statusMessage).toBe('Successful');
    expect(result.customerMsisdn).toBe('01770618575');
    expect(result.payerReference).toBe('01770618575');
    expect(result.trxID).toBe('6H7801QFYM');
    expect(result.transactionStatus).toBe('Completed');
    expect(result.amount).toBe('15');
    expect(result.currency).toBe('BDT');
    expect(result.intent).toBe('sale');
    expect(result.merchantInvoiceNumber).toBe('MER1231');
    expect(result.paymentExecuteTime).toBe('2019-08-07T11:15:56:336 GMT+0600');

    // Verify correct API call
    expect(mockClient.post).toHaveBeenCalledWith(
      '/tokenized/checkout/execute',
      { paymentID: paymentID },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'token',
          'x-app-key': 'key',
        }),
      })
    );
  });

  it('should handle failed payment execution', async () => {
    const bkash = new BkashPayment(config);
    const paymentID = 'TR0011ON1565154754797';

    const mockFailedResponse = {
      statusCode: '0002',
      statusMessage: 'Failed',
      paymentID: paymentID,
      customerMsisdn: '01770618575',
      payerReference: '01770618575',
      trxID: '',
      transactionStatus: 'Failed',
      amount: '15',
      paymentExecuteTime: '2019-08-07T11:15:56:336 GMT+0600',
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: 'MER1231',
    };

    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockResolvedValueOnce({ data: mockFailedResponse }); // executePayment

    const result = await bkash.executePayment(paymentID);

    expect(result.statusCode).toBe('0002');
    expect(result.statusMessage).toBe('Failed');
    expect(result.transactionStatus).toBe('Failed');
    expect(result.trxID).toBe('');
  });

  it('should handle payment execution API errors', async () => {
    const bkash = new BkashPayment(config);
    const paymentID = 'INVALID_PAYMENT_ID';

    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockRejectedValueOnce({
        response: {
          data: {
            errorCode: '2029',
            errorMessage: 'Payment ID is invalid'
          }
        },
        isAxiosError: true,
      }); // executePayment error

    await expect(bkash.executePayment(paymentID))
      .rejects.toThrow('Failed to execute payment');
  });

  it('should throw on invalid config', () => {
    expect(() => new BkashPayment({ ...config, username: '' })).toThrow();
  });

  it('should verify webhook signature', () => {
    const bkash = new BkashPayment(config);
    const payload = JSON.stringify({ foo: 'bar' });
    const webhookSecret = config.webhook?.secret;
    if (!webhookSecret) {
      throw new Error('Webhook secret is required for this test');
    }
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');
    expect(bkash.verifyWebhookSignature(payload, signature)).toBe(true);
  });

  it('should throw on invalid webhook signature', async () => {
    const bkash = new BkashPayment(config);
    await expect(bkash.handleWebhook({ foo: 'bar' }, 'invalid')).rejects.toThrow(
      'Invalid webhook signature'
    );
  });

  it('should query payment status successfully', async () => {
    const bkash = new BkashPayment(config);
    const paymentID = 'TR0001IV1565085942653';
    const mockQueryResponse = {
      statusCode: '0000',
      statusMessage: 'Successful',
      paymentID: paymentID,
      mode: '0011',
      paymentCreateTime: '2019-08-06T16:05:42:731 GMT+0600',
      amount: '12',
      currency: 'BDT',
      intent: 'sale',
      merchantInvoice: 'merchant101',
      transactionStatus: 'Initiated',
      userVerificationStatus: 'Incomplete',
      payerReference: '01770618575',
    };

    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockResolvedValueOnce({ data: mockQueryResponse }); // queryPayment

    const result = await bkash.queryPayment(paymentID);

    expect(result.paymentID).toBe(paymentID);
    expect(result.transactionStatus).toBe('Initiated');
    expect(result.userVerificationStatus).toBe('Incomplete');
    expect(result.statusCode).toBe('0000');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/tokenized/checkout/payment/status',
      { paymentID: paymentID },
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'token',
          'X-App-Key': 'key',
        }),
      })
    );
  });

  it('should search transaction successfully', async () => {
    const bkash = new BkashPayment(config);
    const trxID = '6H7XXXXTCT';
    const mockSearchResponse = {
      statusCode: '0000',
      statusMessage: 'Successful',
      trxID: trxID,
      transactionStatus: 'Completed',
      transactionType: 'Purchase',
      amount: '150',
      currency: 'BDT',
      customerMsisdn: '01723888888',
      organizationShortCode: '01XXXXXXXXX',
      initiationTime: '2020-03-18T15:16:51:000 GMT+0000',
      completedTime: '2020-03-18T15:16:51:000 GMT+0000',
      transactionReference: 'REF123456'
    };

    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockResolvedValueOnce({ data: mockSearchResponse }); // searchTransaction

    const result = await bkash.searchTransaction({ trxID });

    expect(result.trxID).toBe(trxID);
    expect(result.transactionStatus).toBe('Completed');
    expect(result.amount).toBe('150');
    expect(result.customerMsisdn).toBe('01723888888');
    expect(result.statusCode).toBe('0000');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/tokenized/checkout/general/searchTran',
      { trxID: trxID },
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'token',
          'X-App-Key': 'key',
        }),
      })
    );
  });

  it('should process refund successfully (v2 API)', async () => {
    const bkash = new BkashPayment(config);
    const refundData = {
      paymentId: 'TR001',
      trxId: 'BFD90JRLST',
      refundAmount: '25.50',
      sku: 'PRODUCT-001',
      reason: 'Customer request',
    };

    const mockRefundResponse = {
      refundTrxId: 'REF123456789',
      refundTransactionStatus: 'Completed',
      originalTrxId: 'BFD90JRLST',
      originalTrxAmount: '100.00',
      refundAmount: '25.50',
      currency: 'BDT',
      completedTime: '2024-01-15T10:30:00 GMT+0000',
      sku: 'PRODUCT-001',
      reason: 'Customer request',
    };

    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockResolvedValueOnce({ data: mockRefundResponse }); // refundPayment

    const result = await bkash.refundPayment(refundData);

    expect(result.refundTrxId).toBe('REF123456789');
    expect(result.refundTransactionStatus).toBe('Completed');
    expect(result.refundAmount).toBe('25.50');
    expect(result.originalTrxId).toBe('BFD90JRLST');
    expect(result.currency).toBe('BDT');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/v2/tokenized-checkout/refund/payment/transaction',
      refundData,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'token',
          'X-App-Key': 'key',
        }),
      })
    );
  });

  it('should process legacy refund successfully', async () => {
    const bkash = new BkashPayment(config);
    const legacyRefundData = {
      paymentId: 'TR001',
      transactionId: 'BFD90JRLST',
      amount: 25.50,
      reason: 'Customer request',
    };

    const mockRefundResponse = {
      refundTrxId: 'REF123456789',
      refundTransactionStatus: 'Completed',
      originalTrxId: 'BFD90JRLST',
      originalTrxAmount: '100.00',
      refundAmount: '25.5',
      currency: 'BDT',
      completedTime: '2024-01-15T10:30:00 GMT+0000',
      sku: 'LEGACY',
      reason: 'Customer request',
    };

    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockResolvedValueOnce({ data: mockRefundResponse }); // refundPayment (called internally)

    const result = await bkash.refundPaymentLegacy(legacyRefundData);

    // Check legacy format response
    expect(result.statusCode).toBe('0000');
    expect(result.statusMessage).toBe('Successful');
    expect(result.paymentID).toBe('TR001');
    expect(result.trxID).toBe('BFD90JRLST');
    expect(result.amount).toBe('25.5');
    expect(result.currency).toBe('BDT');
    expect(result.refundTrxID).toBe('REF123456789');
    expect(result.completedTime).toBe('2024-01-15T10:30:00 GMT+0000');

    // Verify the new API was called internally with converted data
    expect(mockClient.post).toHaveBeenCalledWith(
      '/v2/tokenized-checkout/refund/payment/transaction',
      expect.objectContaining({
        paymentId: 'TR001',
        trxId: 'BFD90JRLST',
        refundAmount: '25.5',
        sku: 'LEGACY',
        reason: 'Customer request',
      }),
      expect.any(Object)
    );
  });

  it('should handle refund validation errors', async () => {
    const bkash = new BkashPayment(config);

    // Test empty payment ID - will be caught by retry mechanism and wrapped
    const invalidRefundData = {
      paymentId: '',
      trxId: 'BFD90JRLST',
      refundAmount: '25.50',
      sku: 'PRODUCT-001',
      reason: 'Customer request',
    };

    await expect(bkash.refundPayment(invalidRefundData as any))
      .rejects.toThrow('Failed to process refund');
  }, 10000); // Increase timeout since retry mechanism takes time

  it('should handle legacy refund validation errors', async () => {
    const bkash = new BkashPayment(config);

    // Test negative amount - legacy validation throws raw Zod error
    const negativeAmountData = {
      paymentId: 'TR001',
      transactionId: 'BFD90JRLST',
      amount: -25.50,
      reason: 'Customer request',
    };

    await expect(bkash.refundPaymentLegacy(negativeAmountData))
      .rejects.toThrow('Amount must be positive');

    // Test empty transaction ID
    const emptyTransactionData = {
      paymentId: 'TR001',
      transactionId: '',
      amount: 25.50,
      reason: 'Customer request',
    };

    await expect(bkash.refundPaymentLegacy(emptyTransactionData as any))
      .rejects.toThrow('Transaction ID is required');
  });

  it('should handle refund API errors', async () => {
    const bkash = new BkashPayment(config);
    const refundData = {
      paymentId: 'TR001',
      trxId: 'INVALID_TRX_ID',
      refundAmount: '25.50',
      sku: 'PRODUCT-001',
      reason: 'Customer request',
    };

    const mockErrorResponse = {
      statusCode: '2001',
      statusMessage: 'Invalid transaction',
      errorCode: 'INVALID_TRANSACTION',
      errorMessage: 'Transaction not found',
    };

    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockRejectedValueOnce({
        response: { data: mockErrorResponse },
        isAxiosError: true,
      }); // refundPayment error

    await expect(bkash.refundPayment(refundData))
      .rejects.toThrow('Failed to process refund');
  });

  it('should handle failed refund status in legacy method', async () => {
    const bkash = new BkashPayment(config);
    const legacyRefundData = {
      paymentId: 'TR001',
      transactionId: 'BFD90JRLST',
      amount: 25.50,
      reason: 'Customer request',
    };

    const mockFailedRefundResponse = {
      refundTrxId: 'REF123456789',
      refundTransactionStatus: 'Failed',
      originalTrxId: 'BFD90JRLST',
      originalTrxAmount: '100.00',
      refundAmount: '25.5',
      currency: 'BDT',
      completedTime: '2024-01-15T10:30:00 GMT+0000',
      sku: 'LEGACY',
      reason: 'Customer request',
    };

    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockResolvedValueOnce({ data: mockFailedRefundResponse }); // refundPayment

    const result = await bkash.refundPaymentLegacy(legacyRefundData);

    expect(result.statusCode).toBe('0001');
    expect(result.statusMessage).toBe('Failed');
  });

  it('should process partial refunds', async () => {
    const bkash = new BkashPayment(config);
    const partialRefundData = {
      paymentId: 'TR001',
      trxId: 'BFD90JRLST',
      refundAmount: '10.00',
      sku: 'PRODUCT-001',
      reason: 'Partial refund',
    };

    const mockPartialRefundResponse = {
      refundTrxId: 'REF987654321',
      refundTransactionStatus: 'Completed',
      originalTrxId: 'BFD90JRLST',
      originalTrxAmount: '100.00',
      refundAmount: '10.00',
      currency: 'BDT',
      completedTime: '2024-01-15T10:30:00 GMT+0000',
      sku: 'PRODUCT-001',
      reason: 'Partial refund',
    };

    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockResolvedValueOnce({ data: mockPartialRefundResponse }); // refundPayment

    const result = await bkash.refundPayment(partialRefundData);

    expect(result.refundAmount).toBe('10.00');
    expect(result.refundTrxId).toBe('REF987654321');
    expect(result.reason).toBe('Partial refund');
  });

  it('should use default reason in legacy refund when not provided', async () => {
    const bkash = new BkashPayment(config);
    const legacyRefundDataWithoutReason = {
      paymentId: 'TR001',
      transactionId: 'BFD90JRLST',
      amount: 25.50,
    };

    const mockRefundResponse = {
      refundTrxId: 'REF123456789',
      refundTransactionStatus: 'Completed',
      originalTrxId: 'BFD90JRLST',
      originalTrxAmount: '100.00',
      refundAmount: '25.5',
      currency: 'BDT',
      completedTime: '2024-01-15T10:30:00 GMT+0000',
      sku: 'LEGACY',
      reason: 'Customer request',
    };

    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockResolvedValueOnce({ data: mockRefundResponse }); // refundPayment

    await bkash.refundPaymentLegacy(legacyRefundDataWithoutReason);

    // Verify the default reason was used
    expect(mockClient.post).toHaveBeenCalledWith(
      '/v2/tokenized-checkout/refund/payment/transaction',
      expect.objectContaining({
        reason: 'Customer request', // Default reason
      }),
      expect.any(Object)
    );
  });

  it('should check refund status successfully', async () => {
    const bkash = new BkashPayment(config);
    const refundStatusRequest = {
      paymentId: 'TR0001xt7mXxG1718274354990',
      trxId: 'BFD90JRLST',
    };

    const mockRefundStatusResponse = {
      originalTrxId: 'BFD90JRLST',
      originalTrxAmount: '4.59',
      originalTrxCompletedTime: '2024-06-13T16:26:41:486 GMT+0600',
      refundTransactions: [
        {
          refundTrxId: 'BFD90JRMH9',
          refundTransactionStatus: 'Completed',
          refundAmount: '1.00',
          completedTime: '2024-06-13T16:27:24:000',
        },
        {
          refundTrxId: 'BFD90JRMK7',
          refundTransactionStatus: 'Completed',
          refundAmount: '2.00',
          completedTime: '2024-06-17T18:27:24:000',
        },
      ],
    };

    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockResolvedValueOnce({ data: mockRefundStatusResponse }); // checkRefundStatus

    const result = await bkash.checkRefundStatus(refundStatusRequest);

    expect(result.originalTrxId).toBe('BFD90JRLST');
    expect(result.originalTrxAmount).toBe('4.59');
    expect(result.refundTransactions).toHaveLength(2);
    expect(result.refundTransactions[0].refundTrxId).toBe('BFD90JRMH9');
    expect(result.refundTransactions[0].refundTransactionStatus).toBe('Completed');
    expect(result.refundTransactions[1].refundAmount).toBe('2.00');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/v2/tokenized-checkout/refund/payment/status',
      refundStatusRequest,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'token',
          'X-App-Key': 'key',
        }),
      })
    );
  });

  it('should handle refund status validation errors', async () => {
    const bkash = new BkashPayment(config);

    // Test empty payment ID
    const invalidRequest = {
      paymentId: '',
      trxId: 'BFD90JRLST',
    };

    await expect(bkash.checkRefundStatus(invalidRequest as any))
      .rejects.toThrow('Failed to check refund status');
  }, 10000);

  it('should handle refund status API errors', async () => {
    const bkash = new BkashPayment(config);
    const refundStatusRequest = {
      paymentId: 'INVALID_PAYMENT_ID',
      trxId: 'INVALID_TRX_ID',
    };

    const mockErrorResponse = {
      internalCode: 'ERR001',
      externalCode: '2077',
      errorMessageEn: 'Invalid TrxID',
      errorMessageBn: 'অবৈধ TrxID',
    };

    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockRejectedValueOnce({
        response: { data: mockErrorResponse },
        isAxiosError: true,
      }); // checkRefundStatus error

    await expect(bkash.checkRefundStatus(refundStatusRequest))
      .rejects.toThrow('Failed to check refund status');
  });

  it('should handle empty refund transactions list', async () => {
    const bkash = new BkashPayment(config);
    const refundStatusRequest = {
      paymentId: 'TR0001xt7mXxG1718274354990',
      trxId: 'BFD90JRLST',
    };

    const mockRefundStatusResponse = {
      originalTrxId: 'BFD90JRLST',
      originalTrxAmount: '4.59',
      originalTrxCompletedTime: '2024-06-13T16:26:41:486 GMT+0600',
      refundTransactions: [], // No refunds yet
    };

    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockResolvedValueOnce({ data: mockRefundStatusResponse }); // checkRefundStatus

    const result = await bkash.checkRefundStatus(refundStatusRequest);

    expect(result.originalTrxId).toBe('BFD90JRLST');
    expect(result.refundTransactions).toHaveLength(0);
  });

  it('should handle single refund transaction', async () => {
    const bkash = new BkashPayment(config);
    const refundStatusRequest = {
      paymentId: 'TR0001xt7mXxG1718274354990',
      trxId: 'BFD90JRLST',
    };

    const mockRefundStatusResponse = {
      originalTrxId: 'BFD90JRLST',
      originalTrxAmount: '10.00',
      originalTrxCompletedTime: '2024-06-13T16:26:41:486 GMT+0600',
      refundTransactions: [
        {
          refundTrxId: 'BFD90JRMH9',
          refundTransactionStatus: 'Completed',
          refundAmount: '10.00', // Full refund
          completedTime: '2024-06-13T16:27:24:000',
        },
      ],
    };

    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockResolvedValueOnce({ data: mockRefundStatusResponse }); // checkRefundStatus

    const result = await bkash.checkRefundStatus(refundStatusRequest);

    expect(result.refundTransactions).toHaveLength(1);
    expect(result.refundTransactions[0].refundAmount).toBe('10.00');
    expect(result.refundTransactions[0].refundTransactionStatus).toBe('Completed');
  });
});

