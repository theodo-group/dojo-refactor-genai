import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";
import {
  createCustomer,
  createProduct,
  createProducts,
  createOrder,
  createOrdersWithHistory,
} from "../factories";
import { cleanDatabase } from "../utils/database-cleaner";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";

describe("OrderController (e2e)", () => {
  let app: INestApplication;
  let customer: Customer;
  let products: Product[];

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
  });

  beforeEach(async () => {
    // Clean database before each test for isolation
    await cleanDatabase(app);

    // Create base test data
    customer = await createCustomer(app, {
      name: "John Doe",
      email: "john@example.com",
    });
    products = await createProducts(app, 3);
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  describe("/api/orders", () => {
    it("GET / should return all orders", async () => {
      // Create some test orders
      await createOrder(app, {
        customer,
        products: [products[0]],
        totalAmount: 10.0,
      });
      await createOrder(app, {
        customer,
        products: [products[1]],
        totalAmount: 20.0,
      });

      return request(app.getHttpServer())
        .get("/api/orders")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);

          // Check if each order has customer and products
          res.body.forEach((order) => {
            expect(order.customer).toBeDefined();
            expect(order.products).toBeDefined();
            expect(Array.isArray(order.products)).toBe(true);
          });
        });
    });

    it("GET /?status=pending should filter orders by status", async () => {
      // Create orders with different statuses
      await createOrder(app, {
        customer,
        products: [products[0]],
        totalAmount: 10.0,
        status: OrderStatus.PENDING,
      });
      await createOrder(app, {
        customer,
        products: [products[1]],
        totalAmount: 20.0,
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
      const order = await createOrder(app, {
        customer,
        products: [products[0]],
        totalAmount: 15.0,
        status: OrderStatus.PENDING,
      });

      return request(app.getHttpServer())
        .get(`/api/orders/${order.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(order.id);
          expect(res.body.status).toBe(order.status);
          expect(res.body.customer.id).toBe(customer.id);
          expect(Array.isArray(res.body.products)).toBe(true);
        });
    });

    it("GET /customer/:customerId should return orders for a customer", async () => {
      // Create orders for this customer
      await createOrder(app, {
        customer,
        products: [products[0]],
        totalAmount: 10.0,
      });
      await createOrder(app, {
        customer,
        products: [products[1]],
        totalAmount: 20.0,
      });

      // Create order for different customer
      const otherCustomer = await createCustomer(app, {
        name: "Jane Doe",
        email: "jane@example.com",
      });
      await createOrder(app, {
        customer: otherCustomer,
        products: [products[2]],
        totalAmount: 30.0,
      });

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

    it("POST / should create a new order", () => {
      // Use customer with NO order history to avoid loyalty discount
      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.slice(0, 2).map((p) => p.id),
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
          expect(res.body.products.length).toBe(2);
        });
    });

    it("PATCH /:id/status should update order status", async () => {
      const order = await createOrder(app, {
        customer,
        products: [products[0]],
        totalAmount: 15.0,
        status: OrderStatus.READY,
      });
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
      const order = await createOrder(app, {
        customer,
        products: [products[0]],
        totalAmount: 15.0,
        status: OrderStatus.DELIVERED,
      });
      const newStatus = OrderStatus.PREPARING;

      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: newStatus })
        .expect(400);
    });

    it("DELETE /:id should cancel an order", async () => {
      const order = await createOrder(app, {
        customer,
        products: [products[0]],
        totalAmount: 15.0,
        status: OrderStatus.PENDING,
      });

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
