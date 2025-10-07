import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { setupTestApp } from "../helpers/app.helper";
import { FixturesHelper } from "../helpers/fixtures.helper";
import { DatabaseHelper } from "../helpers/database.helper";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";

describe("Loyalty (e2e)", () => {
  let app: INestApplication;
  let fixtures: FixturesHelper;
  let database: DatabaseHelper;

  beforeEach(async () => {
    app = await setupTestApp();
    fixtures = new FixturesHelper(app);
    database = new DatabaseHelper(app);
    await database.cleanDatabase();
  });

  afterEach(async () => {
    await database.cleanDatabase();
    if (app) {
      await app.close();
    }
  });

  describe("Basic Loyalty Features", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct({ price: 12.99 });

      // Create 5 orders to make customer eligible for discount
      for (let i = 0; i < 5; i++) {
        const createOrderDto: CreateOrderDto = {
          customerId: customer.id,
          productIds: [product.id],
          totalAmount: 12.99,
          notes: `Loyalty test order ${i + 1}`,
        };
        await request(app.getHttpServer())
          .post("/api/orders")
          .send(createOrderDto)
          .expect(201);
      }

      // Create the order that should get 10% discount
      const product1 = await fixtures.createProduct({ price: 12.99 });
      const product2 = await fixtures.createProduct({ price: 13.99 });
      const products = [product1, product2];
      const originalTotal = 26.98;

      const finalOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Final order with discount",
      };

      const res = await request(app.getHttpServer())
        .post("/api/orders")
        .send(finalOrderDto)
        .expect(201);

      const expectedTotal = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(res.body.totalAmount).toBe(expectedTotal);
    });

    it("should apply progressive discounts based on order count", async () => {
      const customer = await fixtures.createCustomer();
      const product1 = await fixtures.createProduct({ price: 12.99 });
      const product2 = await fixtures.createProduct({ price: 13.99 });
      const products = [product1, product2];
      const originalTotal = 26.98;

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Testing progressive discounts",
      };

      // First 3 orders (no discount)
      for (let i = 0; i < 3; i++) {
        const res = await request(app.getHttpServer())
          .post("/api/orders")
          .send(createOrderDto)
          .expect(201);
        expect(res.body.totalAmount).toBe(originalTotal);
      }

      // 4th order -> 5%
      const fourthOrder = await request(app.getHttpServer())
        .post("/api/orders")
        .send(createOrderDto)
        .expect(201);
      const expected5Percent = parseFloat((originalTotal * 0.95).toFixed(2));
      expect(fourthOrder.body.totalAmount).toBe(expected5Percent);

      // +2 orders (now 6 total) -> next should be 10%
      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .post("/api/orders")
          .send(createOrderDto)
          .expect(201);
      }

      const seventhOrder = await request(app.getHttpServer())
        .post("/api/orders")
        .send(createOrderDto)
        .expect(201);
      const expected10Percent = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(seventhOrder.body.totalAmount).toBe(expected10Percent);
    });

    it("should calculate customer loyalty tier correctly", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();

      // Create some orders
      for (let i = 0; i < 3; i++) {
        await fixtures.createOrderWithHistory(customer, 5 + i);
      }

      const res = await request(app.getHttpServer())
        .get(`/api/loyalty/tier/${customer.id}`)
        .expect(200);

      const tierInfo = res.body;
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
      const customer = await fixtures.createCustomer();

      // Create orders to establish loyalty history
      for (let i = 0; i < 4; i++) {
        await fixtures.createOrderWithHistory(customer, 10 + i);
      }

      const orderAmount = 100.0;

      const res = await request(app.getHttpServer())
        .get(`/api/loyalty/calculate/${customer.id}/${orderAmount}`)
        .expect(200);

      expect(typeof res.body.discountedAmount).toBe("number");
      expect(res.body.discountedAmount).toBeLessThanOrEqual(orderAmount);
      expect(res.body.discountedAmount).toBeGreaterThan(0);
    });

    it("should get customer loyalty statistics", async () => {
      const customer = await fixtures.createCustomer();

      // Create orders
      for (let i = 0; i < 3; i++) {
        await fixtures.createOrderWithHistory(customer, 7 + i);
      }

      const res = await request(app.getHttpServer())
        .get(`/api/loyalty/stats/${customer.id}`)
        .expect(200);

      const stats = res.body;
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
      const customer = await fixtures.createCustomer();

      // Create orders
      for (let i = 0; i < 2; i++) {
        await fixtures.createOrderWithHistory(customer, 5 + i);
      }

      const res = await request(app.getHttpServer())
        .get(`/api/loyalty/points/${customer.id}`)
        .expect(200);

      expect(typeof res.body.points).toBe("number");
      expect(res.body.points).toBeGreaterThanOrEqual(0);
    });

    it("should get loyalty information", async () => {
      const customer = await fixtures.createCustomer();

      await fixtures.createOrderWithHistory(customer, 5);

      const res = await request(app.getHttpServer())
        .get(`/api/loyalty/info/${customer.id}`)
        .expect(200);

      const loyaltyInfo = res.body;
      expect(loyaltyInfo).toHaveProperty("customerId");
      expect(loyaltyInfo).toHaveProperty("loyaltyPoints");
      expect(loyaltyInfo).toHaveProperty("currentTier");
      expect(loyaltyInfo).toHaveProperty("isActive");
      expect(loyaltyInfo.customerId).toBe(customer.id);
    });

    it("should get loyalty metrics", async () => {
      const customer = await fixtures.createCustomer();

      await fixtures.createOrderWithHistory(customer, 3);

      const res = await request(app.getHttpServer())
        .get(`/api/loyalty/metrics/${customer.id}`)
        .expect(200);

      const metrics = res.body;
      expect(metrics).toHaveProperty("totalPointsEarned");
      expect(metrics).toHaveProperty("totalPointsRedeemed");
      expect(metrics).toHaveProperty("currentBalance");
      expect(metrics).toHaveProperty("tierStatus");
      expect(typeof metrics.totalPointsEarned).toBe("number");
    });

    it("should handle point adjustments", async () => {
      const customer = await fixtures.createCustomer();

      const res = await request(app.getHttpServer())
        .post("/api/loyalty/adjust")
        .send({ customerId: customer.id, adjustment: 50, reason: "Test bonus" })
        .expect(201);

      const adjustment = res.body;
      expect(adjustment).toBeDefined();
      expect(adjustment.adjustment).toBe(50);
      expect(adjustment.customerId).toBe(customer.id);
    });

    it("should prevent excessive point adjustments", async () => {
      const customer = await fixtures.createCustomer();

      await request(app.getHttpServer())
        .post("/api/loyalty/adjust")
        .send({
          customerId: customer.id,
          adjustment: 999999,
          reason: "Too many points",
        })
        .expect(400);
    });

    it("should handle loyalty program suspension", async () => {
      const customer = await fixtures.createCustomer();

      await request(app.getHttpServer())
        .post(`/api/loyalty/suspend`)
        .send({ customerId: customer.id, reason: "Test suspension" })
        .expect(201);

      const info = await request(app.getHttpServer())
        .get(`/api/loyalty/info/${customer.id}`)
        .expect(200);
      expect(info.body.isActive).toBe(false);
    });

    it("should handle loyalty program reactivation", async () => {
      const customer = await fixtures.createCustomer();

      // Suspend first
      await request(app.getHttpServer())
        .post(`/api/loyalty/suspend`)
        .send({ customerId: customer.id, reason: "Test suspension" })
        .expect(201);

      // Then reactivate
      await request(app.getHttpServer())
        .post(`/api/loyalty/reactivate/${customer.id}`)
        .expect(201);

      const info = await request(app.getHttpServer())
        .get(`/api/loyalty/info/${customer.id}`)
        .expect(200);
      expect(info.body.isActive).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero order amounts", async () => {
      const customer = await fixtures.createCustomer();
      const zeroAmount = 0;

      const res = await request(app.getHttpServer())
        .get(`/api/loyalty/calculate/${customer.id}/${zeroAmount}`)
        .expect(200);
      expect(res.body.discountedAmount).toBe(0);
    });

    it("should handle expired points", async () => {
      const customer = await fixtures.createCustomer();

      const res = await request(app.getHttpServer())
        .get(`/api/loyalty/expired/${customer.id}`)
        .expect(200);
      expect(typeof res.body.expiredPoints).toBe("number");
      expect(res.body.expiredPoints).toBeGreaterThanOrEqual(0);
    });

    it("should maintain data consistency", async () => {
      const customer = await fixtures.createCustomer();

      // Create orders
      for (let i = 0; i < 3; i++) {
        await fixtures.createOrderWithHistory(customer, 6 + i);
      }

      const tierRes = await request(app.getHttpServer())
        .get(`/api/loyalty/tier/${customer.id}`)
        .expect(200);
      const statsRes = await request(app.getHttpServer())
        .get(`/api/loyalty/stats/${customer.id}`)
        .expect(200);

      const tierInfo = tierRes.body;
      const stats = statsRes.body;
      expect(tierInfo.orderCount).toBe(stats.totalOrders);
      expect(tierInfo.totalSpent).toBe(stats.totalSpent);
      expect(tierInfo.currentTier).toBe(stats.currentTier);
    });
  });

  describe("Tier and Discount Logic", () => {
    it("should prioritize spending-based discount and set Platinum tier when spending >= $500 with few orders", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct({ price: 100.0 });

      // Create 6 orders of $100 each = $600
      for (let i = 0; i < 6; i++) {
        const createOrderDto: CreateOrderDto = {
          customerId: customer.id,
          productIds: [product.id],
          totalAmount: 100.0,
          notes: `High spending order ${i + 1}`,
        };
        await request(app.getHttpServer())
          .post("/api/orders")
          .send(createOrderDto)
          .expect(201);
      }

      const tierRes = await request(app.getHttpServer())
        .get(`/api/loyalty/tier/${customer.id}`)
        .expect(200);

      const tierInfo = tierRes.body;
      expect(tierInfo.currentTier).toBe("Platinum");
      expect(tierInfo.discountRate).toBeCloseTo(0.12, 5);
    });

    it("should ignore cancelled orders when calculating next order discount (no discount applied)", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct({ price: 12.99 });

      // Create 5 orders, then cancel them all
      const orders: Array<{ id: string }> = [];
      for (let i = 0; i < 5; i++) {
        const dto: CreateOrderDto = {
          customerId: customer.id,
          productIds: [product.id],
          totalAmount: 12.99,
          notes: `Temp order ${i + 1}`,
        };
        const res = await request(app.getHttpServer())
          .post("/api/orders")
          .send(dto)
          .expect(201);
        orders.push({ id: res.body.id });
      }

      // Cancel all created orders
      for (const o of orders) {
        await request(app.getHttpServer())
          .delete(`/api/orders/${o.id}`)
          .expect(204);
      }

      const amount = 100;
      const discounted = await request(app.getHttpServer())
        .get(`/api/loyalty/calculate/${customer.id}/${amount}`)
        .expect(200);

      expect(discounted.body.discountedAmount).toBe(amount);
    });
  });

  describe("API validation", () => {
    it("GET /api/loyalty/tier/:customerId should validate UUID format", async () => {
      await request(app.getHttpServer())
        .get(`/api/loyalty/tier/not-a-uuid`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("Invalid UUID format");
        });
    });

    it("GET /api/loyalty/info/:customerId should return 400 for non-existent customer", async () => {
      const nonExistentId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
      await request(app.getHttpServer())
        .get(`/api/loyalty/info/${nonExistentId}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("Customer not found");
        });
    });
  });
});
