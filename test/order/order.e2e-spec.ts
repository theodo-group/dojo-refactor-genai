import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { OrderStatus } from "../../src/entities/order.entity";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { UpdateOrderDto } from "../../src/order/dto/update-order.dto";
import { OrderFixtures } from "../fixtures/order-fixtures";

describe("OrderController (e2e)", () => {
  let app: INestApplication;
  let fixtures: OrderFixtures;
  let testData: any;

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

    // Initialize order fixtures
    fixtures = new OrderFixtures(app);
  });

  beforeEach(async () => {
    // Create fresh test data for each test
    testData = await fixtures.createTestScenario();
  });

  afterAll(async () => {
    if (fixtures) {
      await fixtures.cleanup();
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
          expect(res.body.length).toBe(testData.orders.length);

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
      const order = testData.orders[0];

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
      const customer = testData.customers[0];

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
      const customer = testData.customers[1]; // Jane Smith
      const products = testData.products.slice(0, 2);
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
      const order = testData.preparingOrders[0];
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
      const order = testData.deliveredOrders[0];
      const newStatus = OrderStatus.PREPARING;

      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: newStatus })
        .expect(400);
    });

    it("DELETE /:id should cancel an order", () => {
      const order = testData.pendingOrders[0];

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
      const customer = testData.customers[1]; // Jane Smith
      const products = testData.products.slice(0, 2); // First 2 products: 12.99 + 14.99 = 27.98

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
      const customer = testData.customers[0]; // Customer with multiple orders

      return request(app.getHttpServer())
        .get(`/api/orders/customer/${customer.id}?start_date=2024-01-01&end_date=2024-12-31`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((order) => {
            expect(order.customer.id).toBe(customer.id);
          });
        });
    });

    it("POST / should handle empty product list", () => {
      const customer = testData.customers[1];
      const emptyProductsDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [], // Empty products
        totalAmount: 0,
        notes: "Empty order test",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(emptyProductsDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("at least one product");
        });
    });

    it("POST / should validate non-existent customer", () => {
      const invalidCustomerDto: CreateOrderDto = {
        customerId: "00000000-0000-0000-0000-000000000000",
        productIds: [testData.products[0].id],
        totalAmount: 12.99,
        notes: "Invalid customer test",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(invalidCustomerDto)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain("Customer not found");
        });
    });

    it("POST / should validate non-existent products", () => {
      const customer = testData.customers[1];
      const invalidProductsDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: ["00000000-0000-0000-0000-000000000000"],
        totalAmount: 12.99,
        notes: "Invalid products test",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(invalidProductsDto)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain("Product not found");
        });
    });

    it("PATCH /:id/status should validate order status values", () => {
      const order = testData.pendingOrders[0];
      const invalidStatusDto = {
        status: "invalid-status",
      };

      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send(invalidStatusDto)
        .expect(400);
    });

    it("POST / should validate required fields", () => {
      const invalidDto = {
        customerId: testData.customers[0].id,
        // Missing productIds and totalAmount
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(invalidDto)
        .expect(400);
    });

    it("GET /:id should return 404 for non-existent order", () => {
      return request(app.getHttpServer())
        .get("/api/orders/00000000-0000-0000-0000-000000000000")
        .expect(404);
    });

    it("PATCH /:id should update order notes", () => {
      const order = testData.pendingOrders[0];
      const updateDto: UpdateOrderDto = {
        notes: "Updated notes",
      };

      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(order.id);
          expect(res.body.notes).toBe("Updated notes");
        });
    });

    it("DELETE /:id should prevent cancellation of delivered orders", () => {
      const order = testData.deliveredOrders[0];

      return request(app.getHttpServer())
        .delete(`/api/orders/${order.id}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("cannot be cancelled");
        });
    });

    it("GET / should support pagination", () => {
      return request(app.getHttpServer())
        .get("/api/orders?page=1&limit=2")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(2);
        });
    });

    it("GET / should sort orders by creation date", () => {
      return request(app.getHttpServer())
        .get("/api/orders?sort=createdAt")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 1) {
            for (let i = 1; i < res.body.length; i++) {
              const currentDate = new Date(res.body[i].createdAt);
              const previousDate = new Date(res.body[i - 1].createdAt);
              expect(currentDate.getTime()).toBeGreaterThanOrEqual(previousDate.getTime());
            }
          }
        });
    });

    it("POST / should handle duplicate product IDs", () => {
      const customer = testData.customers[1];
      const product = testData.products[0];
      const duplicateProductsDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [product.id, product.id], // Duplicate product
        totalAmount: 25.98, // 2 * 12.99
        notes: "Duplicate products test",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(duplicateProductsDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.products.length).toBe(1); // Should de-duplicate
          expect(res.body.customer.id).toBe(customer.id);
        });
    });

    it("PATCH /:id/status should handle rapid status changes", async () => {
      const order = testData.pendingOrders[0];

      // Rapid status change to PREPARING
      const response1 = await request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: OrderStatus.PREPARING })
        .expect(200);

      // Immediate status change to READY
      const response2 = await request(app.getHttpServer())
        .patch(`/api/orders/${response1.body.id}/status`)
        .send({ status: OrderStatus.READY })
        .expect(200);

      expect(response2.body.status).toBe(OrderStatus.READY);
    });

    it("POST / should calculate total with tax", () => {
      const customer = testData.customers[1];
      const products = testData.products.slice(0, 1); // One product: 12.99
      const expectedTotal = 12.99 * 1.1; // Assuming 10% tax

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: expectedTotal,
        notes: "Tax calculation test",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(createOrderDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.totalAmount).toBe(expectedTotal);
        });
    });

    it("GET / should filter by multiple statuses", () => {
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

    it("POST / should handle large orders", () => {
      const customer = testData.customers[1];
      const allProducts = testData.products;
      const totalAmount = allProducts.reduce((sum, product) => sum + product.price, 0);

      const largeOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: allProducts.map((p) => p.id),
        totalAmount: totalAmount,
        notes: "Large order test",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(largeOrderDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.products.length).toBe(allProducts.length);
          expect(res.body.totalAmount).toBe(totalAmount);
        });
    });

    it("DELETE /:id should be idempotent", () => {
      const order = testData.pendingOrders[0];

      return request(app.getHttpServer())
        .delete(`/api/orders/${order.id}`)
        .expect(204)
        .then(() => {
          // Second delete should return 404 or 204 (idempotent)
          return request(app.getHttpServer())
            .delete(`/api/orders/${order.id}`)
            .expect([204, 404]);
        });
    });

    it("GET /customer/:customerId should return empty array for customer with no orders", () => {
      const customer = testData.customers[3]; // Customer with no orders

      return request(app.getHttpServer())
        .get(`/api/orders/customer/${customer.id}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(0);
        });
    });

    it("POST / should handle concurrent order creation", async () => {
      const customer = testData.customers[1];
      const products = testData.products.slice(0, 2);
      const totalAmount = products.reduce((sum, product) => sum + product.price, 0);

      const orderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: totalAmount,
        notes: "Concurrent order test",
      };

      // Create two orders concurrently
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post("/api/orders")
          .send(orderDto),
        request(app.getHttpServer())
          .post("/api/orders")
          .send(orderDto),
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response1.body.id).not.toBe(response2.body.id);
    });

    it("PATCH /:id/status should update timestamps", async () => {
      const order = testData.pendingOrders[0];
      const originalUpdatedAt = order.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: OrderStatus.PREPARING })
        .expect(200);

      expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it("POST / should validate minimum order amount", () => {
      const customer = testData.customers[1];
      const products = testData.products.slice(0, 1);

      const lowAmountDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: 1.0, // Below minimum
        notes: "Low amount test",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(lowAmountDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("minimum order amount");
        });
    });

    it("GET / should include order statistics", () => {
      return request(app.getHttpServer())
        .get("/api/orders?include_stats=true")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("orders");
          expect(res.body).toHaveProperty("statistics");
          expect(res.body.statistics).toHaveProperty("totalOrders");
          expect(res.body.statistics).toHaveProperty("totalRevenue");
        });
    });
  });
});
