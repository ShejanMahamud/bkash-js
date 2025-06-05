import axios from 'axios';
import crypto from 'crypto';
import {
  BkashConfig,
  BkashPayment,
  NagadConfig,
  NagadPayment,
  NagadPaymentData,
  PaymentData,
} from '../index';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function createMockAxiosInstance() {
  return {
    interceptors: {
      response: { use: jest.fn() },
    },
    post: jest.fn(),
    get: jest.fn(),
  } as any;
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
      amount: 100,
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: 'INV-1',
      callbackURL: 'https://callback',
    };
    const mockClient = (bkash as any).client;
    mockClient.post
      .mockResolvedValueOnce({ data: { id_token: 'token' } }) // getToken
      .mockResolvedValueOnce({ data: { paymentID: 'PID' } }); // createPayment
    const eventPromise = new Promise((resolve) => bkash.on('bkash:event', resolve));
    await bkash.createPayment(paymentData);
    expect(await eventPromise).toMatchObject({ type: 'payment.created' });
  });

  it('should throw on invalid config', () => {
    expect(() => new BkashPayment({ ...config, username: '' })).toThrow();
  });

  it('should verify webhook signature', () => {
    const bkash = new BkashPayment(config);
    const payload = JSON.stringify({ foo: 'bar' });
    const signature = crypto
      .createHmac('sha256', config.webhook!.secret)
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
});

describe('NagadPayment', () => {
  const config: NagadConfig = {
    merchantId: 'mid',
    merchantNumber: 'mnum',
    callbackUrl: 'https://callback',
    isSandbox: true,
    webhook: { secret: 'webhook' },
  };

  beforeEach(() => {
    mockedAxios.create.mockImplementation(createMockAxiosInstance);
  });

  it('should emit payment.created event', async () => {
    const nagad = new NagadPayment(config);
    const paymentData: NagadPaymentData = {
      amount: 100,
      currency: 'BDT',
      merchantOrderId: 'ORDER-1',
    };
    const mockClient = (nagad as any).client;
    mockClient.post.mockResolvedValueOnce({ data: { paymentRefId: 'PRID' } });
    const eventPromise = new Promise((resolve) => nagad.on('nagad:event', resolve));
    await nagad.createPayment(paymentData);
    expect(await eventPromise).toMatchObject({ type: 'payment.created' });
  });

  it('should throw on invalid config', () => {
    expect(() => new NagadPayment({ ...config, merchantId: '' })).toThrow();
  });

  it('should verify webhook signature', () => {
    const nagad = new NagadPayment(config);
    const payload = JSON.stringify({ foo: 'bar' });
    const signature = crypto
      .createHmac('sha256', config.webhook!.secret)
      .update(payload)
      .digest('hex');
    expect(nagad.verifyWebhookSignature(payload, signature)).toBe(true);
  });

  it('should throw on invalid webhook signature', async () => {
    const nagad = new NagadPayment(config);
    await expect(nagad.handleWebhook({ foo: 'bar' }, 'invalid')).rejects.toThrow(
      'Invalid webhook signature'
    );
  });
});
