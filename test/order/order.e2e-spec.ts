import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { GlobalFixtures } from "../fixtures/global-fixtures";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { UpdateOrderDto } from "../../src/order/dto/update-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";

describe("OrderController (e2e)", () => {
  let app: INestApplication;
  let fixtures: GlobalFixtures;

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
    fixtures = new GlobalFixtures(app);
    await fixtures.load();
  });

  afterAll(async () => {
    await fixtures.clear();
    await app.close();
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
        .find((o) => o.status === OrderStatus.READY);
      const newStatus = OrderStatus.DELIVERED;

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

    // NEW TESTS
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
  });
});
