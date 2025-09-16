import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { GlobalFixtures } from "../fixtures/global-fixtures";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { OrderService } from "../../src/order/order.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";

describe("LoyaltyService (e2e)", () => {
  let app: INestApplication;
  let fixtures: GlobalFixtures;
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

    fixtures = new GlobalFixtures(app);
    await fixtures.load();

    loyaltyService = app.get(LoyaltyService);
    orderService = app.get(OrderService);
  });

  afterAll(async () => {
    if (fixtures) {
      await fixtures.clear();
    }
    if (app) {
      await app.close();
    }
  });

  describe("Basic Loyalty Features", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      const customer = fixtures.getCustomers()[2]; // Bob Johnson
      const products = fixtures.getProducts().slice(0, 2);
      const originalTotal = 27.98; // Margherita (12.99) + Pepperoni (14.99)

      // Create 5 more orders to make customer eligible for 10% discount
      for (let i = 0; i < 5; i++) {
        const createOrderDto: CreateOrderDto = {
          customerId: customer.id,
          productIds: [products[0].id],
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
      const customer = fixtures.getCustomers()[4]; // Charlie Test
      const products = fixtures.getProducts().slice(0, 2);
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
      const customer = fixtures.getCustomers()[0];

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
      const customer = fixtures.getCustomers()[0];
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
      const customer = fixtures.getCustomers()[0];

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
      const customer = fixtures.getCustomers()[3];
      const orderTotal = 50.0;

      const points = await loyaltyService.calculateLoyaltyPoints(customer.id);
      expect(typeof points).toBe("number");
      expect(points).toBeGreaterThanOrEqual(0);
    });

    it("should get loyalty information", async () => {
      const customer = fixtures.getCustomers()[0];

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
      const customer = fixtures.getCustomers()[0];

      const metrics = await loyaltyService.getLoyaltyMetrics(customer.id);

      expect(metrics).toHaveProperty("totalPointsEarned");
      expect(metrics).toHaveProperty("totalPointsRedeemed");
      expect(metrics).toHaveProperty("currentBalance");
      expect(metrics).toHaveProperty("tierStatus");
      expect(typeof metrics.totalPointsEarned).toBe("number");
    });

    it("should handle point adjustments", async () => {
      const customer = fixtures.getCustomers()[1];

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
      const customer = fixtures.getCustomers()[2];

      await expect(
        loyaltyService.adjustPoints(customer.id, 999999, "Too many points")
      ).rejects.toThrow();
    });

    it("should handle loyalty program suspension", async () => {
      const customer = fixtures.getCustomers()[3];

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
      const customer = fixtures.getCustomers()[3]; // Previously suspended

      await loyaltyService.reactivateLoyaltyProgram(customer.id);

      const loyaltyInfo = await loyaltyService.getCustomerLoyaltyInfo(
        customer.id
      );
      expect(loyaltyInfo.isActive).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero order amounts", async () => {
      const customer = fixtures.getCustomers()[0];
      const zeroAmount = 0;

      const discountedAmount = await loyaltyService.calculateNextOrderAmount(
        customer.id,
        zeroAmount
      );
      expect(discountedAmount).toBe(0);
    });

    it("should handle expired points", async () => {
      const customer = fixtures.getCustomers()[0];

      const expiredPoints = await loyaltyService.getExpiredPoints(
        customer.id,
        new Date()
      );
      expect(typeof expiredPoints).toBe("number");
      expect(expiredPoints).toBeGreaterThanOrEqual(0);
    });

    it("should maintain data consistency", async () => {
      const customer = fixtures.getCustomers()[0];

      const tierInfo = await loyaltyService.calculateCustomerTier(customer.id);
      const stats = await loyaltyService.getCustomerLoyaltyStats(customer.id);

      expect(tierInfo.orderCount).toBe(stats.totalOrders);
      expect(tierInfo.totalSpent).toBe(stats.totalSpent);
      expect(tierInfo.currentTier).toBe(stats.currentTier);
    });
  });

  describe("Tier and Discount Logic", () => {
    it("should prioritize spending-based discount and set Platinum tier when spending >= $500 with few orders", async () => {
      const customer = fixtures.getCustomers()[8]; // Concurrent Test Customer (no prior orders)
      const expensiveProduct = fixtures.getProducts()[4]; // Tiramisu 7.99

      const quantity = 70; // 70 * 7.99 = 559.30
      const productIds = Array.from({ length: quantity }, () => expensiveProduct.id);
      const totalAmount = parseFloat((expensiveProduct.price * quantity).toFixed(2));

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds,
        totalAmount,
        notes: "High spending single order",
      };

      await orderService.create(createOrderDto);

      const tierInfo = await loyaltyService.calculateCustomerTier(customer.id);

      expect(tierInfo.currentTier).toBe("Platinum");
      expect(tierInfo.discountRate).toBeCloseTo(0.12, 5); // spending-based 12% should apply over order-based 0%
      // Spending already at top tier; next tier requirement only applies for orders
      expect(tierInfo.nextTierRequirement?.spending).toBeUndefined();
      expect(tierInfo.nextTierRequirement?.orders).toBeGreaterThan(0);
    });

    it("should ignore cancelled orders when calculating next order discount (no discount applied)", async () => {
      const customer = fixtures.getCustomers()[5]; // Update Test Customer
      const product = fixtures.getProducts()[0]; // Margherita 12.99

      // Create 5 orders, then cancel them all
      const orders = [] as Array<{ id: string }>;
      for (let i = 0; i < 5; i++) {
        const dto: CreateOrderDto = {
          customerId: customer.id,
          productIds: [product.id],
          totalAmount: parseFloat(product.price.toFixed(2)),
          notes: `Temp order ${i + 1}`,
        };
        const order = await orderService.create(dto);
        orders.push(order);
      }

      // Cancel all the created orders
      for (const o of orders) {
        await orderService.remove(o.id);
      }

      // Since all recent orders are cancelled, discount rate should be 0
      const amount = 100;
      const discounted = await loyaltyService.calculateNextOrderAmount(
        customer.id,
        amount
      );

      expect(discounted).toBe(amount);
    });
  });
});
