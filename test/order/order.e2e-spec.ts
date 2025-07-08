import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { TestDbUtils } from "../utils/test-db.utils";
import { createCustomer } from "../factories/customer.factory";
import { createProduct } from "../factories/product.factory";
import { createOrder } from "../factories/order.factory";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order } from "../../src/entities/order.entity";

describe("OrderController (e2e)", () => {
  let app: INestApplication;
  let testDbUtils: TestDbUtils;
  let testCustomers: Customer[];
  let testProducts: Product[];
  let testOrders: Order[];

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

    // Initialize test utilities
    testDbUtils = new TestDbUtils(app);
    
    // Create test data
    // Create customers
    const customersData = [
      createCustomer({ name: 'John Doe', email: 'john@example.com' }),
      createCustomer({ name: 'Jane Smith', email: 'jane@example.com' }),
      createCustomer({ name: 'Bob Johnson', email: 'bob@example.com' })
    ];
    testCustomers = await testDbUtils.createMultipleCustomers(customersData);
    
    // Create products
    const productsData = [
      createProduct({ name: 'Margherita Pizza', description: 'Classic pizza with tomato sauce and mozzarella', price: 12.99, category: 'pizza' }),
      createProduct({ name: 'Pepperoni Pizza', description: 'Pizza with tomato sauce, mozzarella, and pepperoni', price: 14.99, category: 'pizza' }),
      createProduct({ name: 'Caesar Salad', description: 'Fresh salad with romaine lettuce, croutons, and Caesar dressing', price: 8.99, category: 'salad' }),
      createProduct({ name: 'Garlic Bread', description: 'Toasted bread with garlic butter', price: 4.99, category: 'appetizer' }),
      createProduct({ name: 'Tiramisu', description: 'Classic Italian dessert with coffee and mascarpone', price: 7.99, category: 'dessert' })
    ];
    testProducts = await testDbUtils.createMultipleProducts(productsData);
    
    // Create orders with different dates and statuses
    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(now.getDate() - 10);
    
    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(now.getDate() - 15);
    
    const twentyDaysAgo = new Date(now);
    twentyDaysAgo.setDate(now.getDate() - 20);
    
    const twentyFiveDaysAgo = new Date(now);
    twentyFiveDaysAgo.setDate(now.getDate() - 25);

    const ordersData = [
      createOrder({
        customer: testCustomers[0],
        products: [testProducts[0], testProducts[3]],
        totalAmount: 17.98,
        status: OrderStatus.DELIVERED,
        notes: 'Extra cheese please',
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo
      }),
      createOrder({
        customer: testCustomers[0],
        products: [testProducts[1], testProducts[2], testProducts[4]],
        totalAmount: 31.97,
        status: OrderStatus.PREPARING,
        createdAt: fifteenDaysAgo,
        updatedAt: fifteenDaysAgo
      }),
      createOrder({
        customer: testCustomers[0],
        products: [testProducts[0], testProducts[2]],
        totalAmount: 21.98,
        status: OrderStatus.DELIVERED,
        createdAt: twentyDaysAgo,
        updatedAt: twentyDaysAgo
      }),
      createOrder({
        customer: testCustomers[0],
        products: [testProducts[4]],
        totalAmount: 7.99,
        status: OrderStatus.READY,
        createdAt: twentyFiveDaysAgo,
        updatedAt: twentyFiveDaysAgo
      }),
    ];
    testOrders = await testDbUtils.createMultipleOrders(ordersData);
  });

  afterAll(async () => {
    await testDbUtils.clear();
    await app.close();
  });

  describe("/api/orders", () => {
    it("GET / should return all orders", () => {
      return request(app.getHttpServer())
        .get("/api/orders")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(testOrders.length);

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
      const order = testOrders[0];

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
      const customer = testCustomers[0];

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
      const customer = testCustomers[0];
      const products = testProducts.slice(0, 2);

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

    it("PATCH /:id/status should update order status", () => {
      const order = testOrders.find((o) => o.status === OrderStatus.READY);
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
      const order = testOrders.find((o) => o.status === OrderStatus.DELIVERED);
      const newStatus = OrderStatus.PREPARING;

      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: newStatus })
        .expect(400);
    });

    it("DELETE /:id should cancel an order", () => {
      const order = testOrders.find(
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
  });
});
