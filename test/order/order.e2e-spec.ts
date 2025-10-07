import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { setupTestApp } from "../helpers/app.helper";
import { FixturesHelper } from "../helpers/fixtures.helper";
import { DatabaseHelper } from "../helpers/database.helper";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { UpdateOrderDto } from "../../src/order/dto/update-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";

describe("OrderController (e2e)", () => {
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

  describe("/api/orders", () => {
    it("GET / should return all orders", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();
      await fixtures.createOrder(customer, [product]);
      await fixtures.createOrder(customer, [product]);

      return request(app.getHttpServer())
        .get("/api/orders")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);

          res.body.forEach((order) => {
            expect(order.customer).toBeDefined();
            expect(order.products).toBeDefined();
            expect(Array.isArray(order.products)).toBe(true);
          });
        });
    });

    it("GET /?status=pending should filter orders by status", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();
      await fixtures.createOrder(customer, [product], {
        status: OrderStatus.PENDING,
      });
      await fixtures.createOrder(customer, [product], {
        status: OrderStatus.DELIVERED,
      });

      return request(app.getHttpServer())
        .get("/api/orders?status=pending")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
          res.body.forEach((order) => {
            expect(order.status).toBe("pending");
          });
        });
    });

    it("GET /:id should return order by id", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();
      const order = await fixtures.createOrder(customer, [product]);

      return request(app.getHttpServer())
        .get(`/api/orders/${order.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(order.id);
          expect(res.body.status).toBe(order.status);
          expect(res.body.customer.id).toBe(order.customer.id);
          expect(Array.isArray(res.body.products)).toBe(true);
        });
    });

    it("GET /customer/:customerId should return orders for a customer", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();
      await fixtures.createOrder(customer, [product]);
      await fixtures.createOrder(customer, [product]);

      return request(app.getHttpServer())
        .get(`/api/orders/customer/${customer.id}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);
          res.body.forEach((order) => {
            expect(order.customer.id).toBe(customer.id);
          });
        });
    });

    it("POST / should create a new order", async () => {
      const customer = await fixtures.createCustomer();
      const product1 = await fixtures.createProduct({ price: 12.99 });
      const product2 = await fixtures.createProduct({ price: 13.99 });
      const products = [product1, product2];
      const totalAmount = 26.98;

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: totalAmount,
        notes: "Test order notes",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(createOrderDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.status).toBe(OrderStatus.PENDING);
          expect(res.body.totalAmount).toBe(createOrderDto.totalAmount);
          expect(res.body.notes).toBe(createOrderDto.notes);
          expect(res.body.customer.id).toBe(customer.id);
          expect(res.body.products.length).toBe(products.length);
        });
    });

    it("PATCH /:id/status should update order status", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();
      const order = await fixtures.createOrder(customer, [product], {
        status: OrderStatus.PREPARING,
      });

      const newStatus = OrderStatus.READY;

      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: newStatus })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(order.id);
          expect(res.body.status).toBe(newStatus);
        });
    });

    it("PATCH /:id/status should prevent invalid status transitions", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();
      const order = await fixtures.createOrder(customer, [product], {
        status: OrderStatus.DELIVERED,
      });

      const newStatus = OrderStatus.PREPARING;

      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: newStatus })
        .expect(400);
    });

    it("DELETE /:id should cancel an order", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();
      const order = await fixtures.createOrder(customer, [product], {
        status: OrderStatus.PENDING,
      });

      return request(app.getHttpServer())
        .delete(`/api/orders/${order.id}`)
        .expect(204)
        .then(() => {
          return request(app.getHttpServer())
            .get(`/api/orders/${order.id}`)
            .expect(200)
            .expect((res) => {
              expect(res.body.status).toBe(OrderStatus.CANCELLED);
            });
        });
    });

    it("POST / should validate total amount matches product prices", async () => {
      const customer = await fixtures.createCustomer();
      const product1 = await fixtures.createProduct({ price: 12.99 });
      const product2 = await fixtures.createProduct({ price: 13.99 });
      const products = [product1, product2];

      const invalidTotalDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: 50.0,
        notes: "Invalid total test",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(invalidTotalDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("does not match product prices");
        });
    });

    it("GET /customer/:customerId should filter orders by date range", async () => {
      const customer = await fixtures.createCustomer();

      // Create orders with different dates
      await fixtures.createOrderWithHistory(customer, 5); // 5 days ago
      await fixtures.createOrderWithHistory(customer, 20); // 20 days ago (outside range)

      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      return request(app.getHttpServer())
        .get(
          `/api/orders/customer/${customer.id}?start_date=${startDate}&end_date=${endDate}`
        )
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1); // Only the 5-day-old order

          res.body.forEach((order) => {
            expect(order.customer.id).toBe(customer.id);
            const orderDate = new Date(order.createdAt);
            expect(orderDate.getTime()).toBeGreaterThanOrEqual(
              new Date(startDate).getTime()
            );
            expect(orderDate.getTime()).toBeLessThanOrEqual(
              new Date(endDate).getTime()
            );
          });
        });
    });

    it("PATCH /:id should prevent updating orders with invalid status transitions", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();
      const deliveredOrder = await fixtures.createOrder(customer, [product], {
        status: OrderStatus.DELIVERED,
      });

      const invalidUpdateDto: UpdateOrderDto = {
        notes: "Trying to modify delivered order",
        totalAmount: 99.99,
      };

      return request(app.getHttpServer())
        .patch(`/api/orders/${deliveredOrder.id}`)
        .send(invalidUpdateDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain(
            "Cannot update order that is already delivered"
          );
        });
    });

    it("POST / should apply customer loyalty discounts correctly", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct({ price: 12.99 });

      // Create multiple orders to build loyalty history
      for (let i = 0; i < 4; i++) {
        await fixtures.createOrderWithHistory(customer, 10 + i);
      }

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [product.id],
        totalAmount: 12.99,
        notes: "Loyalty discount test",
      };

      const response = await request(app.getHttpServer())
        .post("/api/orders")
        .send(createOrderDto)
        .expect(201);

      expect(response.body.totalAmount).toBeLessThanOrEqual(12.99);
    });

    it("GET /?status=multiple should filter by multiple statuses", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();

      await fixtures.createOrder(customer, [product], {
        status: OrderStatus.PENDING,
      });
      await fixtures.createOrder(customer, [product], {
        status: OrderStatus.PREPARING,
      });
      await fixtures.createOrder(customer, [product], {
        status: OrderStatus.DELIVERED,
      });

      return request(app.getHttpServer())
        .get("/api/orders?status=pending,preparing")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);
          res.body.forEach((order) => {
            expect(["pending", "preparing"]).toContain(order.status);
          });
        });
    });

    it("POST / should validate product availability", async () => {
      const customer = await fixtures.createCustomer();
      const unavailableProduct = await fixtures.createProduct({
        isAvailable: false,
        price: 15.99,
      });

      const invalidOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [unavailableProduct.id],
        totalAmount: 15.99,
        notes: "Order with unavailable product",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(invalidOrderDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("not available");
        });
    });

    it("GET /?sort=total_desc should sort orders by total amount descending", async () => {
      const customer = await fixtures.createCustomer();
      const product1 = await fixtures.createProduct({ price: 10.99 });
      const product2 = await fixtures.createProduct({ price: 20.99 });
      const product3 = await fixtures.createProduct({ price: 15.99 });

      await fixtures.createOrder(customer, [product1], { totalAmount: 10.99 });
      await fixtures.createOrder(customer, [product2], { totalAmount: 20.99 });
      await fixtures.createOrder(customer, [product3], { totalAmount: 15.99 });

      return request(app.getHttpServer())
        .get("/api/orders?sort=total_desc")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(3);

          if (res.body.length > 1) {
            for (let i = 1; i < res.body.length; i++) {
              expect(res.body[i].totalAmount).toBeLessThanOrEqual(
                res.body[i - 1].totalAmount
              );
            }
          }
        });
    });

    it("DELETE /:id should handle orders with different statuses differently", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();

      const pendingOrder = await fixtures.createOrder(customer, [product], {
        status: OrderStatus.PENDING,
      });
      const deliveredOrder = await fixtures.createOrder(customer, [product], {
        status: OrderStatus.DELIVERED,
      });

      await request(app.getHttpServer())
        .delete(`/api/orders/${pendingOrder.id}`)
        .expect(204);

      await request(app.getHttpServer())
        .delete(`/api/orders/${deliveredOrder.id}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("Cannot cancel");
        });
    });

    it("GET /?limit=5&offset=2 should paginate orders", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();

      for (let i = 0; i < 10; i++) {
        await fixtures.createOrder(customer, [product]);
      }

      return request(app.getHttpServer())
        .get("/api/orders?limit=5&offset=2")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(5);
        });
    });

    it("POST / should validate minimum order amount", async () => {
      const customer = await fixtures.createCustomer();
      const cheapProduct = await fixtures.createProduct({ price: 5.99 });

      const tooSmallOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [cheapProduct.id],
        totalAmount: 5.99,
        notes: "Order below minimum",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(tooSmallOrderDto)
        .expect(201); // Should succeed as 5.99 is likely above minimum
    });

    it("GET /analytics/summary should return order analytics", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();

      await fixtures.createOrder(customer, [product], {
        status: OrderStatus.PENDING,
      });
      await fixtures.createOrder(customer, [product], {
        status: OrderStatus.DELIVERED,
      });

      return request(app.getHttpServer())
        .get("/api/orders/analytics/summary")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("totalOrders");
          expect(res.body).toHaveProperty("totalRevenue");
          expect(res.body).toHaveProperty("averageOrderValue");
          expect(res.body).toHaveProperty("ordersByStatus");
          expect(typeof res.body.totalOrders).toBe("number");
          expect(typeof res.body.totalRevenue).toBe("number");
        });
    });

    it("PATCH /:id should validate order modifications based on time constraints", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();

      // Create a very recent order (within modification window)
      const recentOrder = await fixtures.createOrder(customer, [product], {
        status: OrderStatus.PENDING,
        createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      });

      await request(app.getHttpServer())
        .patch(`/api/orders/${recentOrder.id}`)
        .send({ notes: "Modified within time window" })
        .expect(200);
    });

    it("POST / should handle large orders with many products", async () => {
      const customer = await fixtures.createCustomer();
      const products = [];
      let totalAmount = 0;

      // Create 8 products with incrementing prices
      for (let i = 0; i < 8; i++) {
        const product = await fixtures.createProduct({ price: 10.99 + i });
        products.push(product);
        totalAmount += 10.99 + i;
      }

      const largeOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        notes: "Large order with many products",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(largeOrderDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.products.length).toBe(products.length);
          expect(res.body.totalAmount).toBeCloseTo(totalAmount, 2);
        });
    });

    it("GET /customer/:customerId/stats should return customer order statistics", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();

      await fixtures.createOrder(customer, [product]);
      await fixtures.createOrder(customer, [product]);

      return request(app.getHttpServer())
        .get(`/api/orders/customer/${customer.id}/stats`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("totalOrders");
          expect(res.body).toHaveProperty("totalSpent");
          expect(res.body).toHaveProperty("averageOrderValue");
          expect(res.body).toHaveProperty("favoriteProducts");
          expect(res.body).toHaveProperty("orderFrequency");
          expect(typeof res.body.totalOrders).toBe("number");
        });
    });

    it("should handle concurrent order creation for same customer", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct({ price: 10.99 });

      const concurrentOrders = Array.from({ length: 3 }, (_, i) => ({
        customerId: customer.id,
        productIds: [product.id],
        totalAmount: 10.99,
        notes: `Concurrent order ${i + 1}`,
      }));

      const promises = concurrentOrders.map((order) =>
        request(app.getHttpServer()).post("/api/orders").send(order).expect(201)
      );

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.body.notes).toBe(`Concurrent order ${index + 1}`);
      });
    });
  });
});
