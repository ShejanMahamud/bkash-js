/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto';
import {
  BkashConfig,
  BkashPayment,
  BkashServiceFactory,
  IPaymentService,
  IRefundService,
  ITokenManager,
  ITransactionService,
  ITransactionUtils,
  IWebhookService,
  PaymentData,
} from '../index';

// Mock the service factory and individual services
jest.mock('../services/service-factory');
jest.mock('../services/token-manager');
jest.mock('../services/payment-service');
jest.mock('../services/transaction-service');
jest.mock('../services/refund-service');
jest.mock('../services/webhook-service');

describe('BkashPayment', () => {
  const config: BkashConfig = {
    username: 'user',
    password: 'pass',
    appKey: 'key',
    appSecret: 'secret',
    isSandbox: true,
    webhook: { secret: 'webhook' },
  };

  let mockTokenManager: jest.Mocked<ITokenManager>;
  let mockPaymentService: jest.Mocked<IPaymentService>;
  let mockTransactionService: jest.Mocked<ITransactionService>;
  let mockRefundService: jest.Mocked<IRefundService>;
  let mockWebhookService: jest.Mocked<IWebhookService>;
  let mockTransactionUtils: jest.Mocked<ITransactionUtils>;
  let mockServiceFactory: jest.Mocked<BkashServiceFactory>;

  beforeEach(() => {
    // Create mocked services
    mockTokenManager = {
      getToken: jest.fn(),
      refreshToken: jest.fn(),
      grantToken: jest.fn(),
      isTokenExpired: jest.fn(),
      clearToken: jest.fn(),
    };

    mockPaymentService = {
      createPayment: jest.fn(),
      createPaymentFull: jest.fn(),
      executePayment: jest.fn(),
      verifyPayment: jest.fn(),
    };

    mockTransactionService = {
      queryPayment: jest.fn(),
      checkTransactionStatus: jest.fn(),
      searchTransaction: jest.fn(),
      searchTransactionLegacy: jest.fn(),
    };

    mockRefundService = {
      refundPayment: jest.fn(),
      refundPaymentLegacy: jest.fn(),
      checkRefundStatus: jest.fn(),
    };

    mockWebhookService = {
      handleWebhook: jest.fn(),
      verifyWebhookSignature: jest.fn(),
      createWebhookEvent: jest.fn(),
    };

    mockTransactionUtils = {
      isTransactionSuccessful: jest.fn(),
      isTransactionPending: jest.fn(),
      isTransactionFailed: jest.fn(),
    };

    // Mock the service factory
    mockServiceFactory = {
      getTokenManager: jest.fn().mockReturnValue(mockTokenManager),
      getPaymentService: jest.fn().mockReturnValue(mockPaymentService),
      getTransactionService: jest.fn().mockReturnValue(mockTransactionService),
      getRefundService: jest.fn().mockReturnValue(mockRefundService),
      getWebhookService: jest.fn().mockReturnValue(mockWebhookService),
      getTransactionUtils: jest.fn().mockReturnValue(mockTransactionUtils),
      getEventEmitter: jest.fn().mockReturnValue({
        on: jest.fn(),
        emit: jest.fn(),
        once: jest.fn(),
        removeListener: jest.fn(),
      }),
    } as any;

    // Mock the BkashServiceFactory constructor
    (BkashServiceFactory as jest.MockedClass<typeof BkashServiceFactory>).mockImplementation(
      () => mockServiceFactory
    );
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

    const mockResponse = {
      paymentID: 'PID',
      bkashURL: 'https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/create/PID',
      statusCode: '0000',
      statusMessage: 'Successful',
      amount: '100',
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: 'INV-1'
    };

    mockPaymentService.createPayment.mockResolvedValue(mockResponse);

    await bkash.createPayment(paymentData);

    expect(mockPaymentService.createPayment).toHaveBeenCalledWith(paymentData);
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

    mockPaymentService.executePayment.mockResolvedValue(mockExecuteResponse);

    const result = await bkash.executePayment(paymentID);

    expect(mockPaymentService.executePayment).toHaveBeenCalledWith(paymentID);
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

    mockPaymentService.executePayment.mockResolvedValue(mockFailedResponse);

    const result = await bkash.executePayment(paymentID);

    expect(mockPaymentService.executePayment).toHaveBeenCalledWith(paymentID);
    expect(result.statusCode).toBe('0002');
    expect(result.statusMessage).toBe('Failed');
    expect(result.transactionStatus).toBe('Failed');
  });

  it('should handle payment execution API errors', async () => {
    const bkash = new BkashPayment(config);
    const paymentID = 'TR0011ON1565154754797';

    const error = new Error('API Error');
    mockPaymentService.executePayment.mockRejectedValue(error);

    await expect(bkash.executePayment(paymentID)).rejects.toThrow('API Error');
    expect(mockPaymentService.executePayment).toHaveBeenCalledWith(paymentID);
  });

  it('should throw on invalid config', () => {
    const invalidConfig = {
      username: '',
      password: 'pass',
      appKey: 'key',
      appSecret: 'secret',
    };

    expect(() => new BkashPayment(invalidConfig as BkashConfig)).toThrow();
  });

  it('should verify webhook signature', () => {
    const bkash = new BkashPayment(config);
    const payload = '{"test": "data"}';
    const webhookSecret = 'webhook';

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    mockWebhookService.verifyWebhookSignature.mockReturnValue(true);

    const result = bkash.verifyWebhookSignature(payload, expectedSignature);

    expect(mockWebhookService.verifyWebhookSignature).toHaveBeenCalledWith(payload, expectedSignature);
    expect(result).toBe(true);
  });

  it('should throw on invalid webhook signature', () => {
    const bkash = new BkashPayment(config);
    const payload = '{"test": "data"}';
    const invalidSignature = 'invalid';

    mockWebhookService.verifyWebhookSignature.mockReturnValue(false);

    const result = bkash.verifyWebhookSignature(payload, invalidSignature);

    expect(mockWebhookService.verifyWebhookSignature).toHaveBeenCalledWith(payload, invalidSignature);
    expect(result).toBe(false);
  });

  it('should query payment status successfully', async () => {
    const bkash = new BkashPayment(config);
    const paymentID = 'TR0011ON1565154754797';

    const mockQueryResponse = {
      statusCode: '0000',
      statusMessage: 'Successful',
      paymentID: paymentID,
      mode: '0011',
      transactionStatus: 'Completed',
      userVerificationStatus: 'Completed',
      amount: '15',
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: 'MER1231',
      merchantInvoice: 'MER1231',
      payerReference: '01770618575',
      paymentCreateTime: '2019-08-07T10:00:00:000 GMT+0600',
      paymentExecuteTime: '2019-08-07T11:15:56:336 GMT+0600',
      trxID: '6H7801QFYM',
    };

    mockTransactionService.queryPayment.mockResolvedValue(mockQueryResponse);

    const result = await bkash.queryPayment(paymentID);

    expect(mockTransactionService.queryPayment).toHaveBeenCalledWith(paymentID);
    expect(result.paymentID).toBe(paymentID);
    expect(result.transactionStatus).toBe('Completed');
    expect(result.userVerificationStatus).toBe('Completed');
  });

  it('should search transaction successfully', async () => {
    const bkash = new BkashPayment(config);
    const searchData = { trxID: '6H7801QFYM' };

    const mockSearchResponse = {
      statusCode: '0000',
      statusMessage: 'Successful',
      trxID: '6H7801QFYM',
      transactionStatus: 'Completed',
      transactionType: 'Check Out',
      amount: '15',
      currency: 'BDT',
      customerMsisdn: '01770618575',
      organizationShortCode: '40001',
      initiationTime: '2019-08-07T10:45:47:234 GMT+0000',
      completedTime: '2019-08-07T11:15:56:336 GMT+0000',
    };

    mockTransactionService.searchTransaction.mockResolvedValue(mockSearchResponse);

    const result = await bkash.searchTransaction(searchData);

    expect(mockTransactionService.searchTransaction).toHaveBeenCalledWith(searchData);
    expect(result.trxID).toBe('6H7801QFYM');
    expect(result.transactionStatus).toBe('Completed');
  });

  it('should process refund successfully (v2 API)', async () => {
    const bkash = new BkashPayment(config);
    const refundData = {
      paymentId: 'TR0001xt7mXxG1718274354990',
      trxId: 'BFD90JRLST',
      refundAmount: '1.00',
      sku: 'PRODUCT-001',
      reason: 'Customer request'
    };

    const mockRefundResponse = {
      originalTrxId: 'BFD90JRLST',
      refundTrxId: 'BFD90JRLRF',
      refundTransactionStatus: 'Completed',
      originalTrxAmount: '15.00',
      refundAmount: '1.00',
      currency: 'BDT',
      completedTime: '2024-06-13T16:47:53.095 GMT+0600',
      sku: 'PRODUCT-001',
      reason: 'Customer request',
    };

    mockRefundService.refundPayment.mockResolvedValue(mockRefundResponse);

    const result = await bkash.refundPayment(refundData);

    expect(mockRefundService.refundPayment).toHaveBeenCalledWith(refundData);
    expect(result.refundTransactionStatus).toBe('Completed');
    expect(result.refundAmount).toBe('1.00');
  });

  it('should process legacy refund successfully', async () => {
    const bkash = new BkashPayment(config);
    const legacyRefundData = {
      paymentId: 'TR0001xt7mXxG1718274354990',
      transactionId: 'BFD90JRLST',
      amount: 1,
      reason: 'Customer request'
    };

    const mockLegacyResponse = {
      statusCode: '0000',
      statusMessage: 'Successful',
      paymentID: 'TR0001xt7mXxG1718274354990',
      trxID: 'BFD90JRLST',
      amount: '1.00',
      currency: 'BDT',
      refundTrxID: 'BFD90JRLRF',
      completedTime: '2024-06-13T16:47:53.095 GMT+0600',
    };

    mockRefundService.refundPaymentLegacy.mockResolvedValue(mockLegacyResponse);

    const result = await bkash.refundPaymentLegacy(legacyRefundData);

    expect(mockRefundService.refundPaymentLegacy).toHaveBeenCalledWith(legacyRefundData);
    expect(result.statusCode).toBe('0000');
    expect(result.statusMessage).toBe('Successful');
  });

  it('should handle refund validation errors', async () => {
    const bkash = new BkashPayment(config);
    const invalidRefundData = {
      paymentId: '',
      trxId: 'BFD90JRLST',
      refundAmount: '1.00',
      sku: 'PRODUCT-001',
      reason: 'Customer request'
    };

    const error = new Error('Validation failed');
    mockRefundService.refundPayment.mockRejectedValue(error);

    await expect(bkash.refundPayment(invalidRefundData)).rejects.toThrow('Validation failed');
  });

  it('should handle legacy refund validation errors', async () => {
    const bkash = new BkashPayment(config);
    const invalidLegacyData = {
      paymentId: '',
      transactionId: 'BFD90JRLST',
      amount: -1,
    };

    const error = new Error('Validation failed');
    mockRefundService.refundPaymentLegacy.mockRejectedValue(error);

    await expect(bkash.refundPaymentLegacy(invalidLegacyData)).rejects.toThrow('Validation failed');
  });

  it('should handle refund API errors', async () => {
    const bkash = new BkashPayment(config);
    const refundData = {
      paymentId: 'TR0001xt7mXxG1718274354990',
      trxId: 'BFD90JRLST',
      refundAmount: '1.00',
      sku: 'PRODUCT-001',
      reason: 'Customer request'
    };

    const error = new Error('API Error');
    mockRefundService.refundPayment.mockRejectedValue(error);

    await expect(bkash.refundPayment(refundData)).rejects.toThrow('API Error');
  });

  it('should handle failed refund status in legacy method', async () => {
    const bkash = new BkashPayment(config);
    const legacyRefundData = {
      paymentId: 'TR0001xt7mXxG1718274354990',
      transactionId: 'BFD90JRLST',
      amount: 1,
      reason: 'Customer request'
    };

    const mockFailedResponse = {
      statusCode: '0001',
      statusMessage: 'Failed',
      paymentID: 'TR0001xt7mXxG1718274354990',
      trxID: 'BFD90JRLST',
      amount: '1.00',
      currency: 'BDT',
      refundTrxID: '',
      completedTime: '',
    };

    mockRefundService.refundPaymentLegacy.mockResolvedValue(mockFailedResponse);

    const result = await bkash.refundPaymentLegacy(legacyRefundData);

    expect(result.statusCode).toBe('0001');
    expect(result.statusMessage).toBe('Failed');
  });

  it('should process partial refunds', async () => {
    const bkash = new BkashPayment(config);
    const partialRefundData = {
      paymentId: 'TR0001xt7mXxG1718274354990',
      trxId: 'BFD90JRLST',
      refundAmount: '5.50',
      sku: 'PRODUCT-001',
      reason: 'Partial refund requested'
    };

    const mockPartialRefundResponse = {
      originalTrxId: 'BFD90JRLST',
      refundTrxId: 'BFD90JRLRF',
      refundTransactionStatus: 'Completed',
      originalTrxAmount: '15.00',
      refundAmount: '5.50',
      currency: 'BDT',
      completedTime: '2024-06-13T16:47:53.095 GMT+0600',
      sku: 'PRODUCT-001',
      reason: 'Partial refund requested',
    };

    mockRefundService.refundPayment.mockResolvedValue(mockPartialRefundResponse);

    const result = await bkash.refundPayment(partialRefundData);

    expect(result.refundAmount).toBe('5.50');
    expect(result.originalTrxAmount).toBe('15.00');
  });

  it('should use default reason in legacy refund when not provided', async () => {
    const bkash = new BkashPayment(config);
    const legacyDataWithoutReason = {
      paymentId: 'TR0001xt7mXxG1718274354990',
      transactionId: 'BFD90JRLST',
      amount: 1
    };

    const mockResponse = {
      statusCode: '0000',
      statusMessage: 'Successful',
      paymentID: 'TR0001xt7mXxG1718274354990',
      trxID: 'BFD90JRLST',
      amount: '1.00',
      currency: 'BDT',
      refundTrxID: 'BFD90JRLRF',
      completedTime: '2024-06-13T16:47:53.095 GMT+0600',
    };

    mockRefundService.refundPaymentLegacy.mockResolvedValue(mockResponse);

    const result = await bkash.refundPaymentLegacy(legacyDataWithoutReason);

    expect(mockRefundService.refundPaymentLegacy).toHaveBeenCalledWith(legacyDataWithoutReason);
    expect(result.statusCode).toBe('0000');
  });

  it('should check refund status successfully', async () => {
    const bkash = new BkashPayment(config);
    const refundStatusData = {
      paymentId: 'TR0001xt7mXxG1718274354990',
      trxId: 'BFD90JRLST'
    };

    const mockRefundStatusResponse = {
      originalTrxId: 'BFD90JRLST',
      originalTrxAmount: '15.00',
      originalTrxCompletedTime: '2024-06-13T15:30:00.000 GMT+0600',
      refundTransactions: [
        {
          refundTrxId: 'BFD90JRLRF1',
          refundAmount: '5.00',
          refundTransactionStatus: 'Completed',
          completedTime: '2024-06-13T16:47:53.095 GMT+0600',
          sku: 'PRODUCT-001',
          reason: 'Partial refund 1'
        },
        {
          refundTrxId: 'BFD90JRLRF2',
          refundAmount: '3.50',
          refundTransactionStatus: 'Completed',
          completedTime: '2024-06-13T17:20:15.200 GMT+0600',
          sku: 'PRODUCT-002',
          reason: 'Partial refund 2'
        }
      ]
    };

    mockRefundService.checkRefundStatus.mockResolvedValue(mockRefundStatusResponse);

    const result = await bkash.checkRefundStatus(refundStatusData);

    expect(mockRefundService.checkRefundStatus).toHaveBeenCalledWith(refundStatusData);
    expect(result.originalTrxId).toBe('BFD90JRLST');
    expect(result.refundTransactions).toHaveLength(2);
  });

  it('should handle refund status validation errors', async () => {
    const bkash = new BkashPayment(config);
    const invalidRefundStatusData = {
      paymentId: '',
      trxId: ''
    };

    const error = new Error('Validation failed');
    mockRefundService.checkRefundStatus.mockRejectedValue(error);

    await expect(bkash.checkRefundStatus(invalidRefundStatusData)).rejects.toThrow('Validation failed');
  });

  it('should handle refund status API errors', async () => {
    const bkash = new BkashPayment(config);
    const refundStatusData = {
      paymentId: 'TR0001xt7mXxG1718274354990',
      trxId: 'BFD90JRLST'
    };

    const error = new Error('API Error');
    mockRefundService.checkRefundStatus.mockRejectedValue(error);

    await expect(bkash.checkRefundStatus(refundStatusData)).rejects.toThrow('API Error');
  });

  it('should handle empty refund transactions list', async () => {
    const bkash = new BkashPayment(config);
    const refundStatusData = {
      paymentId: 'TR0001xt7mXxG1718274354990',
      trxId: 'BFD90JRLST'
    };

    const mockRefundStatusResponse = {
      originalTrxId: 'BFD90JRLST',
      originalTrxAmount: '15.00',
      originalTrxCompletedTime: '2024-06-13T15:30:00.000 GMT+0600',
      refundTransactions: []
    };

    mockRefundService.checkRefundStatus.mockResolvedValue(mockRefundStatusResponse);

    const result = await bkash.checkRefundStatus(refundStatusData);

    expect(result.refundTransactions).toHaveLength(0);
  });

  it('should handle single refund transaction', async () => {
    const bkash = new BkashPayment(config);
    const refundStatusData = {
      paymentId: 'TR0001xt7mXxG1718274354990',
      trxId: 'BFD90JRLST'
    };

    const mockRefundStatusResponse = {
      originalTrxId: 'BFD90JRLST',
      originalTrxAmount: '15.00',
      originalTrxCompletedTime: '2024-06-13T15:30:00.000 GMT+0600',
      refundTransactions: [
        {
          refundTrxId: 'BFD90JRLRF',
          refundAmount: '15.00',
          refundTransactionStatus: 'Completed',
          completedTime: '2024-06-13T16:47:53.095 GMT+0600',
          sku: 'PRODUCT-001',
          reason: 'Full refund'
        }
      ]
    };

    mockRefundService.checkRefundStatus.mockResolvedValue(mockRefundStatusResponse);

    const result = await bkash.checkRefundStatus(refundStatusData);

    expect(result.refundTransactions).toHaveLength(1);
    expect(result.refundTransactions[0].refundAmount).toBe('15.00');
    expect(result.refundTransactions[0].refundTransactionStatus).toBe('Completed');
  });
});
