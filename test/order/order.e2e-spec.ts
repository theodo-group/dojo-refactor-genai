import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { GlobalFixtures } from "../fixtures/global-fixtures";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
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
  });

  beforeEach(async () => {
    // Clear data before each test to ensure test isolation
    await fixtures.clear();
  });

  afterAll(async () => {
    await fixtures.clear();
    await app.close();
  });

  describe("/api/orders", () => {
    it("GET / should return all orders", async () => {
      // Create test data - 3 orders
      await fixtures.createOrderWithStatus(OrderStatus.PENDING);
      await fixtures.createOrderWithStatus(OrderStatus.DELIVERED);
      await fixtures.createOrderWithStatus(OrderStatus.PREPARING);

      return request(app.getHttpServer())
        .get("/api/orders")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(3);

          // Check if each order has customer and products
          res.body.forEach((order) => {
            expect(order.customer).toBeDefined();
            expect(order.products).toBeDefined();
            expect(Array.isArray(order.products)).toBe(true);
          });
        });
    });

    it("GET /?status=pending should filter orders by status", async () => {
      // Create test data - 2 pending orders and 1 delivered order
      await fixtures.createOrderWithStatus(OrderStatus.PENDING);
      await fixtures.createOrderWithStatus(OrderStatus.PENDING);
      await fixtures.createOrderWithStatus(OrderStatus.DELIVERED);

      return request(app.getHttpServer())
        .get("/api/orders?status=pending")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);
          res.body.forEach((order) => {
            expect(order.status).toBe("pending");
          });
        });
    });

    it("GET /:id should return order by id", async () => {
      // Create test data
      const order = await fixtures.createOrderWithStatus(OrderStatus.PENDING);

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
      // Create test data - one customer with 2 orders, another with 1 order
      const customer1 = await fixtures.createCustomer();
      const customer2 = await fixtures.createCustomer();

      await fixtures.createOrderWithStatus(OrderStatus.PENDING, { customerId: customer1.id });
      await fixtures.createOrderWithStatus(OrderStatus.DELIVERED, { customerId: customer1.id });
      await fixtures.createOrderWithStatus(OrderStatus.PENDING, { customerId: customer2.id });

      return request(app.getHttpServer())
        .get(`/api/orders/customer/${customer1.id}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);
          res.body.forEach((order) => {
            expect(order.customer.id).toBe(customer1.id);
          });
        });
    });

    it("POST / should create a new order", async () => {
      // Create test data
      const customer = await fixtures.createCustomer();
      const product1 = await fixtures.createProduct({ price: 15.0 });
      const product2 = await fixtures.createProduct({ price: 15.5 });
      const products = [product1, product2];

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: 30.5,
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
      // Create test data - order with READY status
      const order = await fixtures.createOrderWithStatus(OrderStatus.READY);
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

    it("PATCH /:id/status should prevent invalid status transitions", async () => {
      // Create test data - delivered order cannot go back to preparing
      const order = await fixtures.createOrderWithStatus(OrderStatus.DELIVERED);
      const newStatus = OrderStatus.PREPARING;

      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: newStatus })
        .expect(400);
    });

    it("DELETE /:id should cancel an order", async () => {
      // Create test data - order with PENDING status
      const order = await fixtures.createOrderWithStatus(OrderStatus.PENDING);

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
  });
});
