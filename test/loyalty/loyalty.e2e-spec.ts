import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { TestDataManager } from "../fixtures/base/test-data-manager";
import { ScenarioFixtures } from "../fixtures/scenarios/scenario-fixtures";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { OrderService } from "../../src/order/order.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";

describe("LoyaltyService (e2e)", () => {
  let app: INestApplication;
  let dataManager: TestDataManager;
  let scenarios: ScenarioFixtures;
  let loyaltyService: LoyaltyService;
  let orderService: OrderService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    app.setGlobalPrefix("api");
    await app.init();

    dataManager = new TestDataManager(app);
    scenarios = new ScenarioFixtures(app);
    await dataManager.setup();

    loyaltyService = app.get(LoyaltyService);
    orderService = app.get(OrderService);
  });

  afterAll(async () => {
    if (dataManager) {
      await dataManager.teardown();
    }
    if (app) {
      await app.close();
    }
  });

  describe("Basic Loyalty Features", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      // GIVEN: A customer who will become eligible for loyalty discounts
      const customer = await dataManager.customerFactory.createLoyalCustomer({
        name: "Bob Johnson",
        email: "bob.discount@example.com",
      });

      const products = await Promise.all([
        dataManager.productFactory.createMargheritaPizza({ price: 12.99 }),
        dataManager.productFactory.createPepperoniPizza({ price: 14.99 }),
      ]);

      const originalTotal = 27.98; // Margherita (12.99) + Pepperoni (14.99)

      // WHEN: Customer places 5 orders to qualify for 10% discount
      for (let i = 0; i < 5; i++) {
        const createOrderDto: CreateOrderDto = {
          customerId: customer.id,
          productIds: [products[0].id],
          totalAmount: 12.99,
          notes: `Loyalty test order ${i + 1}`,
        };
        await orderService.create(createOrderDto);
      }

      // THEN: The next order should receive 10% discount
      const finalOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Final order with discount",
      };

      const order = await orderService.create(finalOrderDto);

      // Verify the discount was applied
      const expectedTotal = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(order.totalAmount).toBe(expectedTotal);
    });

    it("should apply progressive discounts based on order count", async () => {
      // GIVEN: A customer who will test progressive discount tiers
      const customer = await dataManager.customerFactory.createLoyalCustomer({
        name: "Charlie Test",
        email: "charlie.progressive@example.com",
      });

      const products = await Promise.all([
        dataManager.productFactory.createMargheritaPizza({ price: 12.99 }),
        dataManager.productFactory.createPepperoniPizza({ price: 14.99 }),
      ]);

      const originalTotal = 27.98;

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Testing progressive discounts",
      };

      // WHEN: Customer places first 3 orders (no discount expected)
      for (let i = 0; i < 3; i++) {
        const order = await orderService.create(createOrderDto);
        expect(order.totalAmount).toBe(originalTotal);
      }

      // THEN: 4th order should get 5% discount
      const fourthOrder = await orderService.create(createOrderDto);
      const expected5Percent = parseFloat((originalTotal * 0.95).toFixed(2));
      expect(fourthOrder.totalAmount).toBe(expected5Percent);

      // WHEN: Customer places 2 more orders to reach 6 orders total
      for (let i = 0; i < 2; i++) {
        await orderService.create(createOrderDto);
      }

      // THEN: 7th order should get 10% discount
      const seventhOrder = await orderService.create(createOrderDto);
      const expected10Percent = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(seventhOrder.totalAmount).toBe(expected10Percent);
    });

    it("should calculate customer loyalty tier correctly", async () => {
      // GIVEN: A customer with qualifying order history for loyalty tiers
      const loyaltyScenario = await scenarios.setupLoyaltyEligibleCustomer();
      const customer = loyaltyScenario.customer;

      // WHEN: Calculating the customer's loyalty tier
      const tierInfo = await loyaltyService.calculateCustomerTier(customer.id);

      // THEN: Tier information should be complete and valid
      expect(tierInfo).toHaveProperty("orderCount");
      expect(tierInfo).toHaveProperty("totalSpent");
      expect(tierInfo).toHaveProperty("currentTier");
      expect(tierInfo).toHaveProperty("discountRate");
      expect(typeof tierInfo.orderCount).toBe("number");
      expect(typeof tierInfo.totalSpent).toBe("number");
      expect(["Bronze", "Silver", "Gold", "Platinum"]).toContain(
        tierInfo.currentTier
      );
    });

    it("should calculate next order amount with discount", async () => {
      // GIVEN: A customer with existing loyalty status
      const loyaltyScenario = await scenarios.setupLoyaltyEligibleCustomer();
      const customer = loyaltyScenario.customer;
      const orderAmount = 100.0;

      // WHEN: Calculating the next order amount with applicable discounts
      const discountedAmount = await loyaltyService.calculateNextOrderAmount(
        customer.id,
        orderAmount
      );

      // THEN: Discounted amount should be valid and reasonable
      expect(typeof discountedAmount).toBe("number");
      expect(discountedAmount).toBeLessThanOrEqual(orderAmount);
      expect(discountedAmount).toBeGreaterThan(0);
    });

    it("should get customer loyalty statistics", async () => {
      // GIVEN: A customer with complete loyalty history
      const loyaltyScenario = await scenarios.setupLoyaltyEligibleCustomer();
      const customer = loyaltyScenario.customer;

      // WHEN: Retrieving customer loyalty statistics
      const stats = await loyaltyService.getCustomerLoyaltyStats(customer.id);

      // THEN: Statistics should include all expected properties
      expect(stats).toHaveProperty("totalOrders");
      expect(stats).toHaveProperty("totalSpent");
      expect(stats).toHaveProperty("currentTier");
      expect(stats).toHaveProperty("discountEarned");
      expect(stats).toHaveProperty("averageOrderValue");
      expect(stats).toHaveProperty("lifetimeDiscountSaved");

      expect(typeof stats.totalOrders).toBe("number");
      expect(typeof stats.totalSpent).toBe("number");
    });
  });

  describe("Advanced Loyalty Features", () => {
    it("should calculate loyalty points", async () => {
      // GIVEN: A VIP customer with order history
      const customer = await dataManager.customerFactory.createVipCustomer({
        name: "VIP Points Customer",
        email: "vip.points@example.com",
      });
      const orderTotal = 50.0;

      // WHEN: Calculating loyalty points for the customer
      const points = await loyaltyService.calculateLoyaltyPoints(customer.id);

      // THEN: Points should be a valid number
      expect(typeof points).toBe("number");
      expect(points).toBeGreaterThanOrEqual(0);
    });

    it("should get loyalty information", async () => {
      // GIVEN: A customer with loyalty program participation
      const loyaltyScenario = await scenarios.setupLoyaltyEligibleCustomer();
      const customer = loyaltyScenario.customer;

      // WHEN: Retrieving loyalty information
      const loyaltyInfo = await loyaltyService.getCustomerLoyaltyInfo(
        customer.id
      );

      // THEN: Loyalty information should be complete
      expect(loyaltyInfo).toHaveProperty("customerId");
      expect(loyaltyInfo).toHaveProperty("loyaltyPoints");
      expect(loyaltyInfo).toHaveProperty("currentTier");
      expect(loyaltyInfo).toHaveProperty("isActive");
      expect(loyaltyInfo.customerId).toBe(customer.id);
    });

    it("should get loyalty metrics", async () => {
      // GIVEN: A customer with loyalty metrics to track
      const loyaltyScenario = await scenarios.setupLoyaltyEligibleCustomer();
      const customer = loyaltyScenario.customer;

      // WHEN: Retrieving loyalty metrics
      const metrics = await loyaltyService.getLoyaltyMetrics(customer.id);

      // THEN: Metrics should include all tracking properties
      expect(metrics).toHaveProperty("totalPointsEarned");
      expect(metrics).toHaveProperty("totalPointsRedeemed");
      expect(metrics).toHaveProperty("currentBalance");
      expect(metrics).toHaveProperty("tierStatus");
      expect(typeof metrics.totalPointsEarned).toBe("number");
    });

    it("should handle point adjustments", async () => {
      // GIVEN: A customer eligible for point adjustments
      const customer = await dataManager.customerFactory.createLoyalCustomer({
        name: "Point Adjustment Customer",
        email: "points.adjust@example.com",
      });

      // WHEN: Applying a point adjustment
      const adjustment = await loyaltyService.adjustPoints(
        customer.id,
        50,
        "Test bonus"
      );

      // THEN: Adjustment should be recorded correctly
      expect(adjustment).toBeDefined();
      expect(adjustment.adjustment).toBe(50);
      expect(adjustment.customerId).toBe(customer.id);
    });

    it("should prevent excessive point adjustments", async () => {
      // GIVEN: A customer subject to point adjustment limits
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Excessive Points Test Customer",
        email: "excessive.points@example.com",
      });

      // WHEN: Attempting an excessive point adjustment
      // THEN: Should reject the adjustment
      await expect(
        loyaltyService.adjustPoints(customer.id, 999999, "Too many points")
      ).rejects.toThrow();
    });

    it("should handle loyalty program suspension", async () => {
      // GIVEN: A customer with active loyalty program participation
      const customer = await dataManager.customerFactory.createVipCustomer({
        name: "Suspension Test Customer",
        email: "suspend.test@example.com",
      });

      // WHEN: Suspending the customer's loyalty program
      await loyaltyService.suspendLoyaltyProgram(
        customer.id,
        "Test suspension"
      );

      // THEN: Loyalty program should be marked as inactive
      const loyaltyInfo = await loyaltyService.getCustomerLoyaltyInfo(
        customer.id
      );
      expect(loyaltyInfo.isActive).toBe(false);
    });

    it("should handle loyalty program reactivation", async () => {
      // GIVEN: A customer with suspended loyalty program
      const customer = await dataManager.customerFactory.createVipCustomer({
        name: "Reactivation Test Customer",
        email: "reactivate.test@example.com",
      });

      // Suspend first
      await loyaltyService.suspendLoyaltyProgram(
        customer.id,
        "Pre-reactivation suspension"
      );

      // WHEN: Reactivating the loyalty program
      await loyaltyService.reactivateLoyaltyProgram(customer.id);

      // THEN: Loyalty program should be active again
      const loyaltyInfo = await loyaltyService.getCustomerLoyaltyInfo(
        customer.id
      );
      expect(loyaltyInfo.isActive).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero order amounts", async () => {
      // GIVEN: A customer with loyalty status
      const customer = await dataManager.customerFactory.createLoyalCustomer({
        name: "Zero Amount Test Customer",
        email: "zero.amount@example.com",
      });
      const zeroAmount = 0;

      // WHEN: Calculating discount for zero amount
      const discountedAmount = await loyaltyService.calculateNextOrderAmount(
        customer.id,
        zeroAmount
      );

      // THEN: Result should remain zero
      expect(discountedAmount).toBe(0);
    });

    it("should handle expired points", async () => {
      // GIVEN: A customer who may have expired points
      const customer = await dataManager.customerFactory.createLoyalCustomer({
        name: "Expired Points Customer",
        email: "expired.points@example.com",
      });

      // WHEN: Checking for expired points
      const expiredPoints = await loyaltyService.getExpiredPoints(
        customer.id,
        new Date()
      );

      // THEN: Expired points count should be valid
      expect(typeof expiredPoints).toBe("number");
      expect(expiredPoints).toBeGreaterThanOrEqual(0);
    });

    it("should maintain data consistency", async () => {
      // GIVEN: A customer with established loyalty data
      const loyaltyScenario = await scenarios.setupLoyaltyEligibleCustomer();
      const customer = loyaltyScenario.customer;

      // WHEN: Retrieving loyalty data from different sources
      const tierInfo = await loyaltyService.calculateCustomerTier(customer.id);
      const stats = await loyaltyService.getCustomerLoyaltyStats(customer.id);

      // THEN: Data should be consistent across different service methods
      expect(tierInfo.orderCount).toBe(stats.totalOrders);
      expect(tierInfo.totalSpent).toBe(stats.totalSpent);
      expect(tierInfo.currentTier).toBe(stats.currentTier);
    });
  });
});
