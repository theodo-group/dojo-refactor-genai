import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { OrderStatus } from "../../src/entities/order.entity";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { OrderFixtures, OrderTestScenario } from "../fixtures/order-fixtures";

describe("OrderController (e2e)", () => {
  let app: INestApplication;
  let fixtures: OrderFixtures;
  let scenario: OrderTestScenario;

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

  describe("/api/orders", () => {
    it("GET / should return all orders", () => {
      return request(app.getHttpServer())
        .get("/api/orders")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(scenario.orders.length);

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
      const order = scenario.pendingOrder;

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
      const customer = scenario.testCustomer;

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
      const customer = scenario.testCustomer;
      const products = scenario.products.slice(0, 2);
      const totalAmount = products.reduce((sum, p) => sum + p.price, 0);

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

    it("PATCH /:id/status should update order status", () => {
      const order = scenario.pendingOrder;
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
      const order = scenario.deliveredOrder;
      const newStatus = OrderStatus.PREPARING;

      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: newStatus })
        .expect(400);
    });

    it("DELETE /:id should cancel an order", () => {
      const order = scenario.pendingOrder;

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

    it("POST / should validate total amount matches product prices", () => {
      const customer = scenario.testCustomer;
      const products = scenario.products.slice(0, 2);

      const invalidTotalDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: 999.99, // Wrong total
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

    it("POST / should validate required fields", () => {
      const incompleteDto = {
        customerId: scenario.testCustomer.id,
        // Missing productIds and totalAmount
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(incompleteDto)
        .expect(400);
    });

    it("GET /:id should return 404 for non-existent order", () => {
      return request(app.getHttpServer())
        .get("/api/orders/00000000-0000-0000-0000-000000000000")
        .expect(404);
    });

    it("PATCH /:id/status should return 404 for non-existent order", () => {
      return request(app.getHttpServer())
        .patch("/api/orders/00000000-0000-0000-0000-000000000000/status")
        .send({ status: OrderStatus.READY })
        .expect(404);
    });

    it("DELETE /:id should return 404 for non-existent order", () => {
      return request(app.getHttpServer())
        .delete("/api/orders/00000000-0000-0000-0000-000000000000")
        .expect(404);
    });

    it("POST / should handle empty product list", () => {
      const customer = scenario.testCustomer;

      const emptyProductsDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [],
        totalAmount: 0,
        notes: "Empty order",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(emptyProductsDto)
        .expect(400);
    });

    it("POST / should handle non-existent customer", () => {
      const products = scenario.products.slice(0, 1);

      const invalidCustomerDto: CreateOrderDto = {
        customerId: "00000000-0000-0000-0000-000000000000",
        productIds: products.map((p) => p.id),
        totalAmount: products[0].price,
        notes: "Invalid customer test",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(invalidCustomerDto)
        .expect(400);
    });

    it("POST / should handle non-existent product", () => {
      const customer = scenario.testCustomer;

      const invalidProductDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: ["00000000-0000-0000-0000-000000000000"],
        totalAmount: 10.99,
        notes: "Invalid product test",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(invalidProductDto)
        .expect(400);
    });
  });
});
