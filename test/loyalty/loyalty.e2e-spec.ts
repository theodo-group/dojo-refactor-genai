import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { OrderService } from "../../src/order/order.service";
import { LoyaltyFixtures, LoyaltyTestScenario } from "../fixtures/loyalty-fixtures";

describe("LoyaltyService (e2e)", () => {
  let app: INestApplication;
  let fixtures: LoyaltyFixtures;
  let scenario: LoyaltyTestScenario;
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

    fixtures = new LoyaltyFixtures(app);
    loyaltyService = app.get(LoyaltyService);
    orderService = app.get(OrderService);
  });

  beforeEach(async () => {
    // Clean up and create fresh test scenario for each test
    await fixtures.cleanup();
    scenario = await fixtures.createTestScenario();
  });

  afterAll(async () => {
    if (fixtures) {
      await fixtures.cleanup();
    }
    if (app) {
      await app.close();
    }
  });

  describe("Basic Loyalty Features", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      const customer = scenario.bronzeCustomer;
      const products = scenario.products.slice(0, 2);
      const originalTotal = products.reduce((sum, p) => sum + p.price, 0);

      // Create 3 more orders to make customer eligible for 10% discount
      for (let i = 0; i < 3; i++) {
        const createOrderDto: CreateOrderDto = {
          customerId: customer.id,
          productIds: [products[0].id],
          totalAmount: products[0].price,
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
      const customer = scenario.newCustomer;
      const products = scenario.products.slice(0, 2);
      const originalTotal = products.reduce((sum, p) => sum + p.price, 0);

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
      const customer = scenario.loyalCustomer;

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
      const customer = scenario.loyalCustomer;
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
      const customer = scenario.loyalCustomer;

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
      const customer = scenario.loyalCustomer;

      const points = await loyaltyService.calculateLoyaltyPoints(customer.id);
      expect(typeof points).toBe("number");
      expect(points).toBeGreaterThanOrEqual(0);
    });

    it("should get loyalty information", async () => {
      const customer = scenario.loyalCustomer;

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
      const customer = scenario.loyalCustomer;

      const metrics = await loyaltyService.getLoyaltyMetrics(customer.id);

      expect(metrics).toHaveProperty("totalPointsEarned");
      expect(metrics).toHaveProperty("totalPointsRedeemed");
      expect(metrics).toHaveProperty("currentBalance");
      expect(metrics).toHaveProperty("tierStatus");
      expect(typeof metrics.totalPointsEarned).toBe("number");
    });

    it("should handle point adjustments", async () => {
      const customer = scenario.newCustomer;

      const adjustment = await loyaltyService.adjustPoints(
        customer.id,
        50,
        "Test point adjustment"
      );

      expect(adjustment).toHaveProperty("pointsAdjusted");
      expect(adjustment).toHaveProperty("newBalance");
      expect(adjustment.pointsAdjusted).toBe(50);
    });

    it("should validate loyalty tier progression", async () => {
      const customer = scenario.silverCustomer;

      const initialTier = await loyaltyService.calculateCustomerTier(customer.id);
      expect(initialTier.currentTier).toBe("Silver");

      // Add more orders to potentially upgrade tier
      const products = scenario.products.slice(0, 1);
      for (let i = 0; i < 3; i++) {
        const createOrderDto: CreateOrderDto = {
          customerId: customer.id,
          productIds: products.map((p) => p.id),
          totalAmount: products[0].price,
          notes: `Tier progression test ${i + 1}`,
        };
        await orderService.create(createOrderDto);
      }

      const newTier = await loyaltyService.calculateCustomerTier(customer.id);
      expect(newTier.orderCount).toBeGreaterThan(initialTier.orderCount);
    });

    it("should handle new customer loyalty correctly", async () => {
      const customer = scenario.newCustomer;

      const loyaltyInfo = await loyaltyService.getCustomerLoyaltyInfo(
        customer.id
      );

      expect(loyaltyInfo.loyaltyPoints).toBe(0);
      expect(loyaltyInfo.currentTier).toBe("Bronze");

      const stats = await loyaltyService.getCustomerLoyaltyStats(customer.id);
      expect(stats.totalOrders).toBe(0);
      expect(stats.totalSpent).toBe(0);
    });
  });

  describe("Loyalty Discount Integration", () => {
    it("should not apply discount for new customers", async () => {
      const customer = scenario.newCustomer;
      const products = scenario.products.slice(0, 1);
      const originalTotal = products[0].price;

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "New customer first order",
      };

      const order = await orderService.create(createOrderDto);
      expect(order.totalAmount).toBe(originalTotal);
    });

    it("should apply appropriate discount for silver tier customers", async () => {
      const customer = scenario.silverCustomer;
      const products = scenario.products.slice(0, 1);
      const originalTotal = products[0].price;

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Silver tier customer order",
      };

      const order = await orderService.create(createOrderDto);
      expect(order.totalAmount).toBeLessThan(originalTotal);
    });

    it("should handle loyalty calculations correctly for multiple products", async () => {
      const customer = scenario.loyalCustomer;
      const products = scenario.products; // Use all products
      const originalTotal = products.reduce((sum, p) => sum + p.price, 0);

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Multiple products loyalty test",
      };

      const order = await orderService.create(createOrderDto);
      expect(order.totalAmount).toBeLessThan(originalTotal);
      expect(order.products.length).toBe(products.length);
    });
  });
});
