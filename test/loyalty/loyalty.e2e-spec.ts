import { TestContext, createTestContext } from "../utils/test-context";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { OrderService } from "../../src/order/order.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";

describe("LoyaltyService (e2e)", () => {
  let testContext: TestContext;
  let loyaltyService: LoyaltyService;
  let orderService: OrderService;

  beforeAll(async () => {
    testContext = await createTestContext();
    loyaltyService = testContext.app.get(LoyaltyService);
    orderService = testContext.app.get(OrderService);
  });

  beforeEach(async () => {
    await testContext.cleanDatabase();
  });

  afterAll(async () => {
    await testContext.cleanup();
  });

  describe("Basic Loyalty Features", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      const customer = await testContext.customerBuilder()
        .withName("Bob Johnson")
        .withEmail("bob.johnson@example.com")
        .build();
      
      const margherita = await testContext.margheritaPizza().build(); // 12.99
      const pepperoni = await testContext.pepperoniPizza().build(); // 14.99
      const products = [margherita, pepperoni];
      const originalTotal = 27.98; // Margherita (12.99) + Pepperoni (14.99)

      // Create 5 more orders to make customer eligible for 10% discount
      for (let i = 0; i < 5; i++) {
        const createOrderDto: CreateOrderDto = {
          customerId: customer.id,
          productIds: [margherita.id],
          totalAmount: 12.99,
          notes: `Loyalty test order ${i + 1}`,
        };
        await orderService.create(createOrderDto);
      }

      // Create the order that should get 10% discount
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
      const customer = await testContext.customerBuilder()
        .withName("Charlie Test")
        .withEmail("charlie.test@example.com")
        .build();
      
      const margherita = await testContext.margheritaPizza().build();
      const pepperoni = await testContext.pepperoniPizza().build();
      const products = [margherita, pepperoni];
      const originalTotal = 27.98;

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Testing progressive discounts",
      };

      // Create first 3 orders (no discount)
      for (let i = 0; i < 3; i++) {
        const order = await orderService.create(createOrderDto);
        expect(order.totalAmount).toBe(originalTotal);
      }

      // 4th order should get 5% discount
      const fourthOrder = await orderService.create(createOrderDto);
      const expected5Percent = parseFloat((originalTotal * 0.95).toFixed(2));
      expect(fourthOrder.totalAmount).toBe(expected5Percent);

      // Create 2 more orders to reach 6 orders total
      for (let i = 0; i < 2; i++) {
        await orderService.create(createOrderDto);
      }

      // 7th order should get 10% discount
      const seventhOrder = await orderService.create(createOrderDto);
      const expected10Percent = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(seventhOrder.totalAmount).toBe(expected10Percent);
    });

    it("should calculate customer loyalty tier correctly", async () => {
      const customer = await testContext.johnDoe().build();
      const product = await testContext.margheritaPizza().build();
      
      // Create some orders for the customer
      for (let i = 0; i < 4; i++) {
        await testContext.orderBuilder()
          .withCustomer(customer)
          .withProducts([product])
          .delivered()
          .createdDaysAgo(10 + i)
          .build();
      }

      const tierInfo = await loyaltyService.calculateCustomerTier(customer.id);

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
      const customer = await testContext.johnDoe().build();
      const product = await testContext.margheritaPizza().build();
      
      // Create some orders for loyalty status
      for (let i = 0; i < 4; i++) {
        await testContext.orderBuilder()
          .withCustomer(customer)
          .withProducts([product])
          .delivered()
          .build();
      }

      const orderAmount = 100.0;
      const discountedAmount = await loyaltyService.calculateNextOrderAmount(
        customer.id,
        orderAmount
      );

      expect(typeof discountedAmount).toBe("number");
      expect(discountedAmount).toBeLessThanOrEqual(orderAmount);
      expect(discountedAmount).toBeGreaterThan(0);
    });

    it("should get customer loyalty statistics", async () => {
      const customer = await testContext.johnDoe().build();
      const product = await testContext.margheritaPizza().build();
      
      // Create some orders for statistics
      for (let i = 0; i < 3; i++) {
        await testContext.orderBuilder()
          .withCustomer(customer)
          .withProducts([product])
          .delivered()
          .build();
      }

      const stats = await loyaltyService.getCustomerLoyaltyStats(customer.id);

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
      const customer = await testContext.vipCustomer().build();
      const product = await testContext.margheritaPizza().build();
      
      // Create some orders for points calculation
      await testContext.orderBuilder()
        .withCustomer(customer)
        .withProducts([product])
        .delivered()
        .build();

      const points = await loyaltyService.calculateLoyaltyPoints(customer.id);
      expect(typeof points).toBe("number");
      expect(points).toBeGreaterThanOrEqual(0);
    });

    it("should get loyalty information", async () => {
      const customer = await testContext.johnDoe().build();
      const product = await testContext.margheritaPizza().build();
      
      // Create an order for loyalty info
      await testContext.orderBuilder()
        .withCustomer(customer)
        .withProducts([product])
        .delivered()
        .build();

      const loyaltyInfo = await loyaltyService.getCustomerLoyaltyInfo(
        customer.id
      );

      expect(loyaltyInfo).toHaveProperty("customerId");
      expect(loyaltyInfo).toHaveProperty("loyaltyPoints");
      expect(loyaltyInfo).toHaveProperty("currentTier");
      expect(loyaltyInfo).toHaveProperty("isActive");
      expect(loyaltyInfo.customerId).toBe(customer.id);
    });

    it("should get loyalty metrics", async () => {
      const customer = await testContext.johnDoe().build();
      const product = await testContext.margheritaPizza().build();
      
      // Create orders for metrics
      await testContext.orderBuilder()
        .withCustomer(customer)
        .withProducts([product])
        .delivered()
        .build();

      const metrics = await loyaltyService.getLoyaltyMetrics(customer.id);

      expect(metrics).toHaveProperty("totalPointsEarned");
      expect(metrics).toHaveProperty("totalPointsRedeemed");
      expect(metrics).toHaveProperty("currentBalance");
      expect(metrics).toHaveProperty("tierStatus");
      expect(typeof metrics.totalPointsEarned).toBe("number");
    });

    it("should handle point adjustments", async () => {
      const customer = await testContext.janeSmith().build();

      const adjustment = await loyaltyService.adjustPoints(
        customer.id,
        50,
        "Test bonus"
      );

      expect(adjustment).toBeDefined();
      expect(adjustment.adjustment).toBe(50);
      expect(adjustment.customerId).toBe(customer.id);
    });

    it("should prevent excessive point adjustments", async () => {
      const customer = await testContext.customerBuilder()
        .withName("Point Test Customer")
        .build();

      await expect(
        loyaltyService.adjustPoints(customer.id, 999999, "Too many points")
      ).rejects.toThrow();
    });

    it("should handle loyalty program suspension", async () => {
      const customer = await testContext.vipCustomer().build();

      await loyaltyService.suspendLoyaltyProgram(
        customer.id,
        "Test suspension"
      );

      const loyaltyInfo = await loyaltyService.getCustomerLoyaltyInfo(
        customer.id
      );
      expect(loyaltyInfo.isActive).toBe(false);
    });

    it("should handle loyalty program reactivation", async () => {
      const customer = await testContext.vipCustomer().build();

      // First suspend, then reactivate
      await loyaltyService.suspendLoyaltyProgram(
        customer.id,
        "Test suspension"
      );
      
      await loyaltyService.reactivateLoyaltyProgram(customer.id);

      const loyaltyInfo = await loyaltyService.getCustomerLoyaltyInfo(
        customer.id
      );
      expect(loyaltyInfo.isActive).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero order amounts", async () => {
      const customer = await testContext.johnDoe().build();
      const zeroAmount = 0;

      const discountedAmount = await loyaltyService.calculateNextOrderAmount(
        customer.id,
        zeroAmount
      );
      expect(discountedAmount).toBe(0);
    });

    it("should handle expired points", async () => {
      const customer = await testContext.johnDoe().build();

      const expiredPoints = await loyaltyService.getExpiredPoints(
        customer.id,
        new Date()
      );
      expect(typeof expiredPoints).toBe("number");
      expect(expiredPoints).toBeGreaterThanOrEqual(0);
    });

    it("should maintain data consistency", async () => {
      const customer = await testContext.johnDoe().build();
      const product = await testContext.margheritaPizza().build();
      
      // Create orders for consistency test
      for (let i = 0; i < 3; i++) {
        await testContext.orderBuilder()
          .withCustomer(customer)
          .withProducts([product])
          .delivered()
          .build();
      }

      const tierInfo = await loyaltyService.calculateCustomerTier(customer.id);
      const stats = await loyaltyService.getCustomerLoyaltyStats(customer.id);

      expect(tierInfo.orderCount).toBe(stats.totalOrders);
      expect(tierInfo.totalSpent).toBe(stats.totalSpent);
      expect(tierInfo.currentTier).toBe(stats.currentTier);
    });
  });
});
