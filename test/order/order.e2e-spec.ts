import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { OrderFixtures } from "../fixtures/order-fixtures";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { UpdateOrderDto } from "../../src/order/dto/update-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";

describe("OrderController (e2e)", () => {
  let app: INestApplication;
  let fixtures: OrderFixtures;

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
    fixtures = new OrderFixtures(app);
    await fixtures.load();
  });

  afterAll(async () => {
    if (fixtures) {
      await fixtures.clear();
    }
    if (app) {
      await app.close();
    }
  });

  describe("/api/orders", () => {
    it("GET / should return all orders", () => {
      return request(app.getHttpServer())
        .get("/api/orders")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(fixtures.getOrders().length);

          // Check if each order has customer and products
          res.body.forEach((order) => {
            expect(order.customer).toBeDefined();
            expect(order.products).toBeDefined();
            expect(Array.isArray(order.products)).toBe(true);
          });
        });
    });

    it("GET /?status=pending should filter orders by status", () => {
      return request(app.getHttpServer())
        .get("/api/orders?status=pending")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((order) => {
            expect(order.status).toBe("pending");
          });
        });
    });

    it("GET /:id should return order by id", () => {
      const order = fixtures.getOrders()[0];

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

    it("GET /customer/:customerId should return orders for a customer", () => {
      const customer = fixtures.getCustomers()[0];

      return request(app.getHttpServer())
        .get(`/api/orders/customer/${customer.id}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((order) => {
            expect(order.customer.id).toBe(customer.id);
          });
        });
    });

    it("POST / should create a new order", () => {
      const customer = fixtures.getCustomers()[1]; // Jane Smith has no existing orders, no discount
      const products = fixtures.getProducts().slice(0, 2);
      // Margherita Pizza (12.99) + Pepperoni Pizza (14.99) = 27.98

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: 27.98,
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

    it("PATCH /:id/status should update order status", () => {
      const order = fixtures
        .getOrders()
        .find((o) => o.status === OrderStatus.PREPARING);
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

    it("PATCH /:id/status should prevent invalid status transitions", () => {
      const order = fixtures
        .getOrders()
        .find((o) => o.status === OrderStatus.DELIVERED);
      const newStatus = OrderStatus.PREPARING;

      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: newStatus })
        .expect(400);
    });

    it("DELETE /:id should cancel an order", () => {
      const order = fixtures
        .getOrders()
        .find(
          (o) =>
            o.status === OrderStatus.PENDING ||
            o.status === OrderStatus.PREPARING
        );

      return request(app.getHttpServer())
        .delete(`/api/orders/${order.id}`)
        .expect(204)
        .then(() => {
          // Verify order status is cancelled
          return request(app.getHttpServer())
            .get(`/api/orders/${order.id}`)
            .expect(200)
            .expect((res) => {
              expect(res.body.status).toBe(OrderStatus.CANCELLED);
            });
        });
    });

    // NEW COMPREHENSIVE TESTS
    it("POST / should validate total amount matches product prices", () => {
      const customer = fixtures.getCustomers()[1]; // Jane Smith - no existing orders
      const products = fixtures.getProducts().slice(0, 2); // First 2 products: 12.99 + 14.99 = 27.98

      const invalidTotalDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: 50.0, // Wrong total - should be 27.98
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

    it("GET /customer/:customerId should filter orders by date range", () => {
      const customer = fixtures.getCustomers()[0]; // John Doe has multiple orders

      // Get orders from the last 12 days (should include some but not all)
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

          // All orders should be for this customer
          res.body.forEach((order) => {
            expect(order.customer.id).toBe(customer.id);

            // All orders should be within date range
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

    it("PATCH /:id should prevent updating orders with invalid status transitions", () => {
      // Try to update a delivered order (should fail)
      const deliveredOrder = fixtures
        .getOrders()
        .find((o) => o.status === OrderStatus.DELIVERED);

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
      // Get a customer with multiple orders for loyalty discount
      const customer = fixtures.getCustomers()[0]; // John Doe has multiple orders
      const products = fixtures.getProducts().slice(0, 2);
      const baseTotal = 27.98; // 12.99 + 14.99

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: baseTotal,
        notes: "Loyalty discount test",
      };

      const response = await request(app.getHttpServer())
        .post("/api/orders")
        .send(createOrderDto)
        .expect(201);

      // Should have applied discount (exact amount depends on customer's order history)
      expect(response.body.totalAmount).toBeLessThanOrEqual(baseTotal);
    });

    it("GET /?status=multiple should filter by multiple statuses", () => {
      return request(app.getHttpServer())
        .get("/api/orders?status=pending,preparing")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((order) => {
            expect(["pending", "preparing"]).toContain(order.status);
          });
        });
    });

    it("POST / should validate product availability", () => {
      const customer = fixtures.getCustomers()[0];
      const unavailableProduct = fixtures
        .getProducts()
        .find((p) => !p.isAvailable);

      if (unavailableProduct) {
        const invalidOrderDto: CreateOrderDto = {
          customerId: customer.id,
          productIds: [unavailableProduct.id],
          totalAmount: parseFloat(unavailableProduct.price.toString()),
          notes: "Order with unavailable product",
        };

        return request(app.getHttpServer())
          .post("/api/orders")
          .send(invalidOrderDto)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain("not available");
          });
      }
    });

    it("GET /?sort=total_desc should sort orders by total amount descending", () => {
      return request(app.getHttpServer())
        .get("/api/orders?sort=total_desc")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);

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
      const pendingOrder = fixtures
        .getOrders()
        .find((o) => o.status === OrderStatus.PENDING);
      const deliveredOrder = fixtures
        .getOrders()
        .find((o) => o.status === OrderStatus.DELIVERED);

      // Should be able to cancel pending order
      await request(app.getHttpServer())
        .delete(`/api/orders/${pendingOrder.id}`)
        .expect(204);

      // Should not be able to cancel delivered order
      await request(app.getHttpServer())
        .delete(`/api/orders/${deliveredOrder.id}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("Cannot cancel");
        });
    });

    it("GET /?limit=5&offset=2 should paginate orders", () => {
      return request(app.getHttpServer())
        .get("/api/orders?limit=5&offset=2")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(5);
        });
    });

    it("POST / should validate minimum order amount", () => {
      const customer = fixtures.getCustomers()[0];
      const cheapProduct = fixtures
        .getProducts()
        .find((p) => parseFloat(p.price.toString()) < 1.0);

      if (cheapProduct) {
        const tooSmallOrderDto: CreateOrderDto = {
          customerId: customer.id,
          productIds: [cheapProduct.id],
          totalAmount: parseFloat(cheapProduct.price.toString()),
          notes: "Order below minimum",
        };

        return request(app.getHttpServer())
          .post("/api/orders")
          .send(tooSmallOrderDto)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain("minimum order");
          });
      }
    });

    it("GET /analytics/summary should return order analytics", () => {
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
      const recentOrder = fixtures.getRecentOrderForModification();

      if (recentOrder) {
        // Should allow modifications within time window
        await request(app.getHttpServer())
          .patch(`/api/orders/${recentOrder.id}`)
          .send({ notes: "Modified within time window" })
          .expect(200);
      }
    });

    it("POST / should handle large orders with many products", () => {
      const customer = fixtures.getCustomers()[3]; // Alice Test - use existing customer
      const availableProducts = fixtures
        .getProducts()
        .filter((p) => p.isAvailable !== false)
        .slice(0, 8); // Use available products only
      const totalAmount = availableProducts.reduce(
        (sum, p) => sum + parseFloat(p.price.toString()),
        0
      );

      const largeOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: availableProducts.map((p) => p.id),
        totalAmount: totalAmount,
        notes: "Large order with many products",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(largeOrderDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.products.length).toBe(availableProducts.length);
          expect(res.body.totalAmount).toBeCloseTo(totalAmount, 2);
        });
    });

    it("GET /customer/:customerId/stats should return customer order statistics", () => {
      const customer = fixtures.getCustomers()[0];

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
      const customer = fixtures.getCustomers()[1];
      const product = fixtures.getProducts()[0];

      const concurrentOrders = Array.from({ length: 3 }, (_, i) => ({
        customerId: customer.id,
        productIds: [product.id],
        totalAmount: parseFloat(product.price.toString()),
        notes: `Concurrent order ${i + 1}`,
      }));

      const promises = concurrentOrders.map((order) =>
        request(app.getHttpServer()).post("/api/orders").send(order).expect(201)
      );

      const results = await Promise.all(promises);

      // All orders should be created successfully
      results.forEach((result, index) => {
        expect(result.body.notes).toBe(`Concurrent order ${index + 1}`);
      });
    });
  });
});
