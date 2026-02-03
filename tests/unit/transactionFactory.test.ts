// @ts-nocheck
import TransactionServiceFactory from '../../src/Modules/TransactionServiceFactory';

class DummyQueue {}

jest.mock('../../src/Modules/Tron/Services/TronTransactionService', () => {
  return jest.fn().mockImplementation((r: any, b: any, a: any) => {
    return { created: true, r, b, a };
  });
});

import TronTransactionService from '../../src/Modules/Tron/Services/TronTransactionService';

describe('TransactionServiceFactory', () => {
  const balanceQ = new DummyQueue();
  const resourceQ = new DummyQueue();
  const activationQ = new DummyQueue();

  const factory = new TransactionServiceFactory(balanceQ as any, resourceQ as any, activationQ as any);

  test('creates TronTransactionService for TRC20', async () => {
    const svc = await factory.createTransactionService('TRC20');
    expect(svc).toBeDefined();
    expect(svc.created).toBe(true);
  });

  test('throws for unsupported network', async () => {
    await expect(factory.createTransactionService('UNKNOWN')).rejects.toThrow(/Unsupported network/);
  });
});
