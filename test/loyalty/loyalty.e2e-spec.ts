import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { createFixtures, FixtureFactory } from "../fixtures";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { OrderService } from "../../src/order/order.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";

describe("LoyaltyService (e2e)", () => {
  let app: INestApplication;
  let fixtures: FixtureFactory;
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

    // Initialize fixtures
    fixtures = createFixtures(app);

    loyaltyService = app.get(LoyaltyService);
    orderService = app.get(OrderService);
  });

  beforeEach(async () => {
    // Clean up before each test to ensure isolation
    await fixtures.cleanup();
  });

  afterAll(async () => {
    await fixtures.cleanup();
    await app.close();
  });

  describe("Loyalty discounts", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      // Create a loyal customer with order history using the builder
      // Note: Orders must be within the last month to count for discounts
      const { customer, orders } = await fixtures
        .scenario()
        .loyalCustomer()
        .withName("John Doe")
        .withEmail("john@example.com")
        .withOrderHistory([
          { daysAgo: 25, products: ["pizza"], status: OrderStatus.DELIVERED },
          {
            daysAgo: 20,
            products: ["pizza", "salad"],
            status: OrderStatus.DELIVERED,
          },
          { daysAgo: 15, products: ["pizza"], status: OrderStatus.DELIVERED },
          { daysAgo: 10, products: ["dessert"], status: OrderStatus.DELIVERED },
          { daysAgo: 5, products: ["pizza"], status: OrderStatus.DELIVERED },
          { daysAgo: 3, products: ["salad"], status: OrderStatus.DELIVERED },
        ])
        .build();

      // Create products for the new order
      const margherita = await fixtures
        .product()
        .asPizza("Margherita Pizza")
        .build();
      const caesarSalad = await fixtures
        .product()
        .asSalad("Caesar Salad")
        .build();

      const originalTotal = parseFloat(
        (margherita.price + caesarSalad.price).toFixed(2)
      );

      // Create an order using the orderService directly
      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [margherita.id, caesarSalad.id],
        totalAmount: originalTotal,
        notes: "Test loyalty discount",
      };

      // Create the order - loyalty discount should be applied
      const order = await orderService.create(createOrderDto);

      // Verify the discount was applied (should be 10% less)
      const expectedTotal = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(order.totalAmount).toBe(expectedTotal);

      // No more shared fixture pollution! Each test gets its own data.
    });

    it("should not apply discount for new customers", async () => {
      // Create a new customer with no order history
      const customer = await fixtures
        .scenario()
        .newCustomer()
        .withName("Jane Smith")
        .withEmail("jane@example.com")
        .build();

      const pizza = await fixtures.product().asPizza().build();
      const originalTotal = 12.99;

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [pizza.id],
        totalAmount: originalTotal,
        notes: "First order",
      };

      const order = await orderService.create(createOrderDto);

      // No discount should be applied
      expect(order.totalAmount).toBe(originalTotal);
    });

    it("should apply progressive discounts based on order count", async () => {
      // Create a customer with initial order history to get progressive discounts
      const { customer } = await fixtures
        .scenario()
        .loyalCustomer()
        .withName("Charlie Test")
        .withEmail("charlie.test@example.com")
        .withOrderHistory([
          { daysAgo: 25, products: ["pizza"], status: OrderStatus.DELIVERED },
          { daysAgo: 20, products: ["salad"], status: OrderStatus.DELIVERED },
          { daysAgo: 15, products: ["dessert"], status: OrderStatus.DELIVERED },
          { daysAgo: 10, products: ["pizza"], status: OrderStatus.DELIVERED },
        ])
        .build();

      const pizza = await fixtures.product().asPizza().build();
      const salad = await fixtures.product().asSalad().build();
      const originalTotal = parseFloat((pizza.price + salad.price).toFixed(2));

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [pizza.id, salad.id],
        totalAmount: originalTotal,
        notes: "Testing progressive discounts",
      };

      // 5th order should get 5% discount (4+ orders = 5% discount)
      const fifthOrder = await orderService.create(createOrderDto);
      const expected5Percent = parseFloat((originalTotal * 0.95).toFixed(2));
      expect(fifthOrder.totalAmount).toBe(expected5Percent);

      // Create 1 more order to reach 6 orders total
      await orderService.create(createOrderDto);

      // 7th order should get 10% discount (6+ orders = 10% discount)
      const seventhOrder = await orderService.create(createOrderDto);
      const expected10Percent = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(seventhOrder.totalAmount).toBe(expected10Percent);
    });

    it("should calculate customer loyalty tier correctly", async () => {
      // Create a customer with some order history
      const { customer } = await fixtures
        .scenario()
        .loyalCustomer()
        .withName("Tier Test Customer")
        .withEmail("tier.test@example.com")
        .withOrderHistory([
          { daysAgo: 30, products: ["pizza"], status: OrderStatus.DELIVERED },
          { daysAgo: 25, products: ["salad"], status: OrderStatus.DELIVERED },
        ])
        .build();

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
      // Create a customer with order history to qualify for discounts
      const { customer } = await fixtures
        .scenario()
        .loyalCustomer()
        .withName("Discount Test Customer")
        .withEmail("discount.test@example.com")
        .withOrderHistory([
          { daysAgo: 20, products: ["pizza"], status: OrderStatus.DELIVERED },
          { daysAgo: 15, products: ["salad"], status: OrderStatus.DELIVERED },
          { daysAgo: 10, products: ["dessert"], status: OrderStatus.DELIVERED },
          { daysAgo: 5, products: ["pizza"], status: OrderStatus.DELIVERED },
        ])
        .build();

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
      // Create a customer with order history for stats testing
      const { customer } = await fixtures
        .scenario()
        .loyalCustomer()
        .withName("Stats Test Customer")
        .withEmail("stats.test@example.com")
        .withOrderHistory([
          { daysAgo: 30, products: ["pizza"], status: OrderStatus.DELIVERED },
          {
            daysAgo: 25,
            products: ["salad", "dessert"],
            status: OrderStatus.DELIVERED,
          },
          { daysAgo: 20, products: ["pizza"], status: OrderStatus.DELIVERED },
        ])
        .build();

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
      // Create a customer for points testing
      const customer = await fixtures
        .scenario()
        .newCustomer()
        .withName("Points Test Customer")
        .withEmail("points.test@example.com")
        .build();

      const points = await loyaltyService.calculateLoyaltyPoints(customer.id);
      expect(typeof points).toBe("number");
      expect(points).toBeGreaterThanOrEqual(0);
    });

    it("should get loyalty information", async () => {
      // Create a customer for loyalty info testing
      const customer = await fixtures
        .scenario()
        .newCustomer()
        .withName("Loyalty Info Customer")
        .withEmail("loyaltyinfo.test@example.com")
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
      // Create a customer for metrics testing
      const customer = await fixtures
        .scenario()
        .newCustomer()
        .withName("Metrics Test Customer")
        .withEmail("metrics.test@example.com")
        .build();

      const metrics = await loyaltyService.getLoyaltyMetrics(customer.id);

      expect(metrics).toHaveProperty("totalPointsEarned");
      expect(metrics).toHaveProperty("totalPointsRedeemed");
      expect(metrics).toHaveProperty("currentBalance");
      expect(metrics).toHaveProperty("tierStatus");
      expect(typeof metrics.totalPointsEarned).toBe("number");
    });

    it("should handle point adjustments", async () => {
      // Create a customer for point adjustment testing
      const customer = await fixtures
        .scenario()
        .newCustomer()
        .withName("Point Adjustment Customer")
        .withEmail("pointadjustment.test@example.com")
        .build();

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
      // Create a customer for excessive point adjustment testing
      const customer = await fixtures
        .scenario()
        .newCustomer()
        .withName("Excessive Points Customer")
        .withEmail("excessive.test@example.com")
        .build();

      await expect(
        loyaltyService.adjustPoints(customer.id, 999999, "Too many points")
      ).rejects.toThrow();
    });

    it("should handle loyalty program suspension", async () => {
      // Create a customer for suspension testing
      const customer = await fixtures
        .scenario()
        .newCustomer()
        .withName("Suspension Test Customer")
        .withEmail("suspension.test@example.com")
        .build();

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
      // Create a customer for reactivation testing
      const customer = await fixtures
        .scenario()
        .newCustomer()
        .withName("Reactivation Test Customer")
        .withEmail("reactivation.test@example.com")
        .build();

      // First suspend the program
      await loyaltyService.suspendLoyaltyProgram(
        customer.id,
        "Test suspension for reactivation"
      );

      // Then reactivate it
      await loyaltyService.reactivateLoyaltyProgram(customer.id);

      const loyaltyInfo = await loyaltyService.getCustomerLoyaltyInfo(
        customer.id
      );
      expect(loyaltyInfo.isActive).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero order amounts", async () => {
      // Create a customer for zero amount testing
      const customer = await fixtures
        .scenario()
        .newCustomer()
        .withName("Zero Amount Customer")
        .withEmail("zeroamount.test@example.com")
        .build();

      const zeroAmount = 0;

      const discountedAmount = await loyaltyService.calculateNextOrderAmount(
        customer.id,
        zeroAmount
      );
      expect(discountedAmount).toBe(0);
    });

    it("should handle expired points", async () => {
      // Create a customer for expired points testing
      const customer = await fixtures
        .scenario()
        .newCustomer()
        .withName("Expired Points Customer")
        .withEmail("expiredpoints.test@example.com")
        .build();

      const expiredPoints = await loyaltyService.getExpiredPoints(
        customer.id,
        new Date()
      );
      expect(typeof expiredPoints).toBe("number");
      expect(expiredPoints).toBeGreaterThanOrEqual(0);
    });

    it("should maintain data consistency", async () => {
      // Create a customer with some order history for consistency testing
      const { customer } = await fixtures
        .scenario()
        .loyalCustomer()
        .withName("Consistency Test Customer")
        .withEmail("consistency.test@example.com")
        .withOrderHistory([
          { daysAgo: 20, products: ["pizza"], status: OrderStatus.DELIVERED },
          { daysAgo: 15, products: ["salad"], status: OrderStatus.DELIVERED },
        ])
        .build();

      const tierInfo = await loyaltyService.calculateCustomerTier(customer.id);
      const stats = await loyaltyService.getCustomerLoyaltyStats(customer.id);

      expect(tierInfo.orderCount).toBe(stats.totalOrders);
      expect(tierInfo.totalSpent).toBe(stats.totalSpent);
      expect(tierInfo.currentTier).toBe(stats.currentTier);
    });
  });
});
