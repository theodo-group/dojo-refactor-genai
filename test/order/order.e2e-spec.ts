import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { ApiTestHelpers } from "../helpers/api-test-helpers";
import { TestDataFactory } from "../helpers/test-data-factory";
import { CleanupHelpers, createDataTracker, TestDataTracker } from "../helpers/cleanup-helpers";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order } from "../../src/entities/order.entity";

describe("OrderController (e2e)", () => {
  let app: INestApplication;
  let apiHelpers: ApiTestHelpers;
  let cleanupHelpers: CleanupHelpers;

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

    apiHelpers = new ApiTestHelpers(app);
    cleanupHelpers = new CleanupHelpers(apiHelpers);
  });

  afterAll(async () => {
    await app.close();
  });

  // Tests that need existing orders
  describe("/api/orders - with existing orders", () => {
    let testData: TestDataTracker;
    let customers: Customer[];
    let products: Product[];
    let orders: Order[];

    beforeEach(async () => {
      testData = createDataTracker();
      
      // Create customers
      const customerData = TestDataFactory.getStandardCustomers();
      customers = [];
      for (const data of customerData) {
        const customer = await apiHelpers.createCustomer(data);
        customers.push(customer);
        testData.customers.push(customer);
      }
      
      // Create products
      const productData = TestDataFactory.getStandardProducts();
      products = [];
      for (const data of productData) {
        const product = await apiHelpers.createProduct(data);
        products.push(product);
        testData.products.push(product);
      }
      
      // Create orders with different statuses
      orders = [];
      
      // Order 1: PENDING
      const order1 = await apiHelpers.createOrder({
        customerId: customers[0].id,
        productIds: [products[0].id, products[1].id],
        totalAmount: 27.98,
        notes: "Test order 1",
      });
      orders.push(order1);
      testData.orders.push(order1);
      
      // Order 2: READY (we'll update status via API)
      const order2 = await apiHelpers.createOrder({
        customerId: customers[1].id,
        productIds: [products[2].id],
        totalAmount: 8.99,
        notes: "Test order 2",
      });
      // Update to READY status
      await request(app.getHttpServer())
        .patch(`/api/orders/${order2.id}/status`)
        .send({ status: OrderStatus.READY })
        .expect(200);
      const updatedOrder2 = await apiHelpers.getOrder(order2.id);
      orders.push(updatedOrder2);
      testData.orders.push(updatedOrder2);
      
      // Order 3: DELIVERED
      const order3 = await apiHelpers.createOrder({
        customerId: customers[2].id,
        productIds: [products[3].id, products[4].id],
        totalAmount: 12.98,
        notes: "Test order 3",
      });
      // Update to DELIVERED status (PENDING -> PREPARING -> READY -> DELIVERED)
      await request(app.getHttpServer())
        .patch(`/api/orders/${order3.id}/status`)
        .send({ status: OrderStatus.PREPARING })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/orders/${order3.id}/status`)
        .send({ status: OrderStatus.READY })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/orders/${order3.id}/status`)
        .send({ status: OrderStatus.DELIVERED })
        .expect(200);
      const updatedOrder3 = await apiHelpers.getOrder(order3.id);
      orders.push(updatedOrder3);
      testData.orders.push(updatedOrder3);
    });

    afterEach(async () => {
      await cleanupHelpers.cleanupAll(testData);
    });

    it("GET / should return all orders", () => {
      return request(app.getHttpServer())
        .get("/api/orders")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(orders.length);

          // Check if each order has customer and products
          res.body.forEach((order) => {
            expect(order.customer).toBeDefined();
            expect(order.products).toBeDefined();
            expect(Array.isArray(order.products)).toBe(true);
          });

          // Verify our test orders are included
          const orderIds = res.body.map(order => order.id);
          orders.forEach(order => {
            expect(orderIds).toContain(order.id);
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
      const order = orders[0];

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
      const customer = customers[0];

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

    it("PATCH /:id/status should update order status", () => {
      const order = orders.find((o) => o.status === OrderStatus.READY);
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
      const order = orders.find((o) => o.status === OrderStatus.DELIVERED);
      const newStatus = OrderStatus.PREPARING;

      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: newStatus })
        .expect(400);
    });

    it("DELETE /:id should cancel an order", () => {
      const order = orders.find(
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

  // Tests that only need customers and products
  describe("/api/orders - order creation", () => {
    let testData: TestDataTracker;
    let customers: Customer[];
    let products: Product[];

    beforeEach(async () => {
      testData = createDataTracker();
      
      // Create customers
      const customerData = TestDataFactory.getStandardCustomers();
      customers = [];
      for (const data of customerData) {
        const customer = await apiHelpers.createCustomer(data);
        customers.push(customer);
        testData.customers.push(customer);
      }
      
      // Create products
      const productData = TestDataFactory.getStandardProducts();
      products = [];
      for (const data of productData) {
        const product = await apiHelpers.createProduct(data);
        products.push(product);
        testData.products.push(product);
      }
    });

    afterEach(async () => {
      await cleanupHelpers.cleanupAll(testData);
    });

    it("POST / should create a new order", async () => {
      const customer = customers[0];
      const selectedProducts = products.slice(0, 2);

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: selectedProducts.map((p) => p.id),
        totalAmount: 30.5,
        notes: "Test order notes",
      };

      const response = await request(app.getHttpServer())
        .post("/api/orders")
        .send(createOrderDto)
        .expect(201);

      expect(response.body.status).toBe(OrderStatus.PENDING);
      expect(response.body.totalAmount).toBe(createOrderDto.totalAmount);
      expect(response.body.notes).toBe(createOrderDto.notes);
      expect(response.body.customer.id).toBe(customer.id);
      expect(response.body.products.length).toBe(selectedProducts.length);

      // Track the created order for cleanup
      testData.orders.push(response.body);
    });
  });
});
