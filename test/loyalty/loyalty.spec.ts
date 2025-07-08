import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { LoyaltyService } from '../../src/loyalty/loyalty.service';
import { Order } from '../../src/entities/order.entity';

export type MockType<T> = {
  [P in keyof T]?: jest.Mock<any>;
};

const createQueryBuilderMock = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getCount: jest.fn(),
});

const repositoryMockFactory: () => MockType<Repository<any>> = jest.fn(() => ({
  createQueryBuilder: jest.fn(() => createQueryBuilderMock()),
}));

describe('LoyaltyService', () => {
  let service: LoyaltyService;
  let repository: MockType<Repository<Order>>;
  let queryBuilder: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        {
          provide: getRepositoryToken(Order),
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    service = module.get<LoyaltyService>(LoyaltyService);
    repository = module.get(getRepositoryToken(Order));
    queryBuilder = createQueryBuilderMock();
    repository.createQueryBuilder.mockReturnValue(queryBuilder);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('calculateNextOrderAmount', () => {
    describe('when customer is eligible for discount (>3 orders in last month)', () => {
      const eligibleTestCases = [
        ['customer-1', 100, 4, 90.00],
        ['customer-2', 50, 5, 45.00],
        ['customer-3', 200, 10, 180.00],
        ['customer-4', 33.33, 6, 30.00],
        ['customer-5', 15.55, 8, 14.00],
      ] as [string, number, number, number][];

      it.each(eligibleTestCases)(
        'should apply 10%% discount for customer %s with %d orders and amount %d',
        async (customerId, totalAmount, orderCount, expectedAmount) => {
          queryBuilder.getCount.mockResolvedValue(orderCount);

          const result = await service.calculateNextOrderAmount(customerId, totalAmount);

          expect(repository.createQueryBuilder).toHaveBeenCalledWith('order');
          expect(queryBuilder.where).toHaveBeenCalledWith('order.customerId = :customerId', { customerId });
          expect(queryBuilder.andWhere).toHaveBeenCalledWith(
            'order.createdAt >= :oneMonthAgo',
            expect.objectContaining({ oneMonthAgo: expect.any(String) })
          );
          expect(queryBuilder.getCount).toHaveBeenCalled();
          expect(result).toBeCloseTo(expectedAmount, 2);
        }
      );
    });

    describe('when customer is not eligible for discount (≤3 orders in last month)', () => {
      const notEligibleTestCases = [
        ['customer-1', 100, 0, 100.00],
        ['customer-2', 50, 1, 50.00],
        ['customer-3', 200, 2, 200.00],
        ['customer-4', 33.33, 3, 33.33],
        ['customer-5', 15.55, 3, 15.55],
      ] as [string, number, number, number][];

      it.each(notEligibleTestCases)(
        'should not apply discount for customer %s with %d orders and amount %d',
        async (customerId, totalAmount, orderCount, expectedAmount) => {
          queryBuilder.getCount.mockResolvedValue(orderCount);

          const result = await service.calculateNextOrderAmount(customerId, totalAmount);

          expect(repository.createQueryBuilder).toHaveBeenCalledWith('order');
          expect(queryBuilder.where).toHaveBeenCalledWith('order.customerId = :customerId', { customerId });
          expect(queryBuilder.andWhere).toHaveBeenCalledWith(
            'order.createdAt >= :oneMonthAgo',
            expect.objectContaining({ oneMonthAgo: expect.any(String) })
          );
          expect(queryBuilder.getCount).toHaveBeenCalled();
          expect(result).toBe(expectedAmount);
        }
      );
    });

    describe('edge cases', () => {
      it('should handle zero amount', async () => {
        queryBuilder.getCount.mockResolvedValue(5);

        const result = await service.calculateNextOrderAmount('customer-1', 0);

        expect(result).toBe(0.00);
      });

      it('should handle very small amounts with discount', async () => {
        queryBuilder.getCount.mockResolvedValue(5);

        const result = await service.calculateNextOrderAmount('customer-1', 0.01);

        expect(result).toBe(0.01);
      });

      it('should handle large amounts with discount', async () => {
        queryBuilder.getCount.mockResolvedValue(5);

        const result = await service.calculateNextOrderAmount('customer-1', 1000);

        expect(result).toBe(900.00);
      });

      it('should round to 2 decimal places', async () => {
        queryBuilder.getCount.mockResolvedValue(5);

        const result = await service.calculateNextOrderAmount('customer-1', 33.333);

        expect(result).toBe(30.00);
      });
    });

    describe('date calculation', () => {
      it('should query orders from exactly one month ago', async () => {
        const mockDate = new Date('2023-07-15T10:00:00Z');
        const expectedOneMonthAgo = new Date('2023-06-15T10:00:00Z');

        jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
        queryBuilder.getCount.mockResolvedValue(2);

        await service.calculateNextOrderAmount('customer-1', 100);

        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'order.createdAt >= :oneMonthAgo',
          { oneMonthAgo: expectedOneMonthAgo.toISOString() }
        );

        jest.restoreAllMocks();
      });
    });

    describe('discount rate verification', () => {
      it('should apply exactly 10% discount rate', async () => {
        queryBuilder.getCount.mockResolvedValue(5);

        const testAmounts = [10, 25, 50, 100, 250];
        const expectedDiscounts = [1, 2.5, 5, 10, 25];

        for (let i = 0; i < testAmounts.length; i++) {
          const originalAmount = testAmounts[i];
          const expectedDiscount = expectedDiscounts[i];
          const expectedFinalAmount = originalAmount - expectedDiscount;

          const result = await service.calculateNextOrderAmount('customer-1', originalAmount);

          expect(result).toBe(expectedFinalAmount);
        }
      });
    });

    describe('boundary conditions', () => {
      it('should not apply discount when exactly 3 orders', async () => {
        queryBuilder.getCount.mockResolvedValue(3);

        const result = await service.calculateNextOrderAmount('customer-1', 100);

        expect(result).toBe(100.00);
      });

      it('should apply discount when exactly 4 orders', async () => {
        queryBuilder.getCount.mockResolvedValue(4);

        const result = await service.calculateNextOrderAmount('customer-1', 100);

        expect(result).toBe(90.00);
      });
    });
  });
});
