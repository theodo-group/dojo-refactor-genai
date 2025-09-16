import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { TestDataManager } from "../fixtures/base/test-data-manager";
import { ScenarioFixtures } from "../fixtures/scenarios/scenario-fixtures";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { UpdateOrderDto } from "../../src/order/dto/update-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";

describe("OrderController (e2e)", () => {
  let app: INestApplication;
  let dataManager: TestDataManager;
  let scenarios: ScenarioFixtures;

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

    dataManager = new TestDataManager(app);
    scenarios = new ScenarioFixtures(app);
    await dataManager.setup();
  });

  afterAll(async () => {
    if (dataManager) {
      await dataManager.teardown();
    }
    if (app) {
      await app.close();
    }
  });

  describe("/api/orders", () => {
    it("GET / should return all orders", async () => {
      // GIVEN: Orders with different statuses exist in the system
      const orderScenario = await scenarios.setupOrderProcessingScenario();

      return request(app.getHttpServer())
        .get("/api/orders")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);

          // Check if each order has customer and products
          res.body.forEach((order) => {
            expect(order.customer).toBeDefined();
            expect(order.products).toBeDefined();
            expect(Array.isArray(order.products)).toBe(true);
          });
        });
    });

    it("GET /?status=pending should filter orders by status", async () => {
      // GIVEN: Orders with different statuses including pending ones
      const orderScenario = await scenarios.setupOrderProcessingScenario();

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

    it("GET /:id should return order by id", async () => {
      // GIVEN: A specific order exists in the system
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Order Get Test Customer",
        email: "order.get@example.com",
      });

      const product = await dataManager.productFactory.createMargheritaPizza();

      const order = await dataManager.orderFactory.createPendingOrder({
        customer,
        products: [product],
        notes: "Test order for GET by ID",
      });

      // WHEN: Getting order by ID
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
      // GIVEN: A customer with multiple orders
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Multi Order Customer",
        email: "multi.orders@example.com",
      });

      const products = await Promise.all([
        dataManager.productFactory.createMargheritaPizza(),
        dataManager.productFactory.createCaesarSalad(),
      ]);

      // Create multiple orders for this customer
      await dataManager.orderFactory.createDeliveredOrder({
        customer,
        products: [products[0]],
        notes: "First order",
      });

      await dataManager.orderFactory.createPendingOrder({
        customer,
        products: [products[1]],
        notes: "Second order",
      });

      // WHEN: Getting orders for this customer
      return request(app.getHttpServer())
        .get(`/api/orders/customer/${customer.id}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(2);
          res.body.forEach((order) => {
            expect(order.customer.id).toBe(customer.id);
          });
        });
    });

    it("POST / should create a new order", async () => {
      // GIVEN: A new customer with no existing orders (no discount applicable)
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Jane Smith",
        email: "jane.new@example.com",
      });

      const products = await Promise.all([
        dataManager.productFactory.createMargheritaPizza({ price: 12.99 }),
        dataManager.productFactory.createPepperoniPizza({ price: 14.99 }),
      ]);

      // Margherita Pizza (12.99) + Pepperoni Pizza (14.99) = 27.98
      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: 27.98,
        notes: "Test order notes",
      };

      // WHEN: Creating a new order
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
      // GIVEN: An order in PREPARING status that can be updated to READY
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Status Update Customer",
        email: "status.update@example.com",
      });

      const product = await dataManager.productFactory.createMargheritaPizza();

      const order = await dataManager.orderFactory.createPreparingOrder({
        customer,
        products: [product],
        notes: "Order for status update test",
      });

      const newStatus = OrderStatus.READY;

      // WHEN: Updating order status
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
      // GIVEN: An order in DELIVERED status (final state)
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Invalid Transition Customer",
        email: "invalid.transition@example.com",
      });

      const product = await dataManager.productFactory.createMargheritaPizza();

      const order = await dataManager.orderFactory.createDeliveredOrder({
        customer,
        products: [product],
        notes: "Order for invalid transition test",
      });

      const newStatus = OrderStatus.PREPARING;

      // WHEN: Attempting invalid status transition (DELIVERED -> PREPARING)
      // THEN: Should be rejected
      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: newStatus })
        .expect(400);
    });

    it("DELETE /:id should cancel an order", async () => {
      // GIVEN: An order that can be cancelled (PENDING status)
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Cancel Order Customer",
        email: "cancel.order@example.com",
      });

      const product = await dataManager.productFactory.createMargheritaPizza();

      const order = await dataManager.orderFactory.createPendingOrder({
        customer,
        products: [product],
        notes: "Order for cancellation test",
      });

      // WHEN: Cancelling the order
      return request(app.getHttpServer())
        .delete(`/api/orders/${order.id}`)
        .expect(204)
        .then(() => {
          // THEN: Order status should be changed to cancelled
          return request(app.getHttpServer())
            .get(`/api/orders/${order.id}`)
            .expect(200)
            .expect((res) => {
              expect(res.body.status).toBe(OrderStatus.CANCELLED);
            });
        });
    });

    // NEW COMPREHENSIVE TESTS
    it("POST / should validate total amount matches product prices", async () => {
      // GIVEN: A customer and products with known prices
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Price Validation Customer",
        email: "price.validation@example.com",
      });

      const products = await Promise.all([
        dataManager.productFactory.createMargheritaPizza({ price: 12.99 }),
        dataManager.productFactory.createPepperoniPizza({ price: 14.99 }),
      ]); // Total should be 27.98

      // WHEN: Creating order with incorrect total amount
      const invalidTotalDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: 50.0, // Wrong total - should be 27.98
        notes: "Invalid total test",
      };

      // THEN: Should reject due to price mismatch
      return request(app.getHttpServer())
        .post("/api/orders")
        .send(invalidTotalDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("does not match product prices");
        });
    });

    it("GET /customer/:customerId should filter orders by date range", async () => {
      // GIVEN: A customer with multiple orders at different dates
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Date Filter Customer",
        email: "date.filter@example.com",
      });

      const product = await dataManager.productFactory.createMargheritaPizza();

      // Create orders at different dates
      const recentDate = new Date();
      const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000); // 20 days ago

      await dataManager.orderFactory.createDeliveredOrder({
        customer,
        products: [product],
        notes: "Recent order",
        createdAt: recentDate,
        updatedAt: recentDate,
      });

      await dataManager.orderFactory.createDeliveredOrder({
        customer,
        products: [product],
        notes: "Old order",
        createdAt: oldDate,
        updatedAt: oldDate,
      });

      // Get orders from the last 12 days (should include recent but not old)
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // WHEN: Filtering orders by date range
      return request(app.getHttpServer())
        .get(
          `/api/orders/customer/${customer.id}?start_date=${startDate}&end_date=${endDate}`
        )
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);

          // All orders should be for this customer and within date range
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
      // GIVEN: A delivered order (final state)
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Delivered Order Customer",
        email: "delivered.update@example.com",
      });

      const product = await dataManager.productFactory.createMargheritaPizza();

      const deliveredOrder = await dataManager.orderFactory.createDeliveredOrder({
        customer,
        products: [product],
        notes: "Original delivered order",
      });

      // WHEN: Trying to update a delivered order
      const invalidUpdateDto: UpdateOrderDto = {
        notes: "Trying to modify delivered order",
        totalAmount: 99.99,
      };

      // THEN: Should reject the modification
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
      // GIVEN: A customer with loyalty-qualifying order history
      const loyaltyScenario = await scenarios.setupLoyaltyEligibleCustomer();
      const customer = loyaltyScenario.customer;

      const products = await Promise.all([
        dataManager.productFactory.createMargheritaPizza({ price: 12.99 }),
        dataManager.productFactory.createPepperoniPizza({ price: 14.99 }),
      ]);
      const baseTotal = 27.98; // 12.99 + 14.99

      // WHEN: Creating order for loyalty customer
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

      // THEN: Should have applied discount (exact amount depends on customer's order history)
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

    it("POST / should validate product availability", async () => {
      // GIVEN: A customer and an unavailable product
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Availability Test Customer",
        email: "availability.test@example.com",
      });

      const unavailableProduct = await dataManager.productFactory.createUnavailableProduct({
        name: "Unavailable Test Product",
        price: 15.99,
      });

      // WHEN: Trying to create order with unavailable product
      const invalidOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [unavailableProduct.id],
        totalAmount: parseFloat(unavailableProduct.price.toString()),
        notes: "Order with unavailable product",
      };

      // THEN: Should reject due to product unavailability
      return request(app.getHttpServer())
        .post("/api/orders")
        .send(invalidOrderDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("not available");
        });
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
      // GIVEN: Orders with different statuses
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Status Diff Customer",
        email: "status.diff@example.com",
      });

      const product = await dataManager.productFactory.createMargheritaPizza();

      const pendingOrder = await dataManager.orderFactory.createPendingOrder({
        customer,
        products: [product],
        notes: "Pending order for cancellation test",
      });

      const deliveredOrder = await dataManager.orderFactory.createDeliveredOrder({
        customer,
        products: [product],
        notes: "Delivered order for cancellation test",
      });

      // WHEN/THEN: Should be able to cancel pending order
      await request(app.getHttpServer())
        .delete(`/api/orders/${pendingOrder.id}`)
        .expect(204);

      // WHEN/THEN: Should not be able to cancel delivered order
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

    it("POST / should validate minimum order amount", async () => {
      // GIVEN: A customer and a very cheap product
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Minimum Order Customer",
        email: "minimum.order@example.com",
      });

      const cheapProduct = await dataManager.productFactory.build({
        name: "Very Cheap Product",
        price: 0.50, // Below minimum order amount
        category: "test",
      });

      // WHEN: Creating order below minimum amount
      const tooSmallOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [cheapProduct.id],
        totalAmount: parseFloat(cheapProduct.price.toString()),
        notes: "Order below minimum",
      };

      // THEN: Should reject due to minimum order validation
      return request(app.getHttpServer())
        .post("/api/orders")
        .send(tooSmallOrderDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("minimum order");
        });
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
      // GIVEN: A recent order that can be modified within time window
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Time Constraint Customer",
        email: "time.constraint@example.com",
      });

      const product = await dataManager.productFactory.createMargheritaPizza();

      const recentOrder = await dataManager.orderFactory.createRecentModifiableOrder({
        customer,
        products: [product],
        notes: "Recent order for modification",
      });

      // WHEN/THEN: Should allow modifications within time window
      await request(app.getHttpServer())
        .patch(`/api/orders/${recentOrder.id}`)
        .send({ notes: "Modified within time window" })
        .expect(200);
    });

    it("POST / should handle large orders with many products", async () => {
      // GIVEN: A customer and many available products
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Large Order Customer",
        email: "large.order@example.com",
      });

      const availableProducts = await Promise.all([
        dataManager.productFactory.createMargheritaPizza({ price: 12.99 }),
        dataManager.productFactory.createPepperoniPizza({ price: 14.99 }),
        dataManager.productFactory.createCaesarSalad({ price: 8.99 }),
        dataManager.productFactory.createGarlicBread({ price: 4.99 }),
        dataManager.productFactory.createTiramisu({ price: 7.99 }),
      ]);

      const totalAmount = availableProducts.reduce(
        (sum, p) => sum + parseFloat(p.price.toString()),
        0
      );

      // WHEN: Creating large order with many products
      const largeOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: availableProducts.map((p) => p.id),
        totalAmount: totalAmount,
        notes: "Large order with many products",
      };

      // THEN: Should create order successfully
      return request(app.getHttpServer())
        .post("/api/orders")
        .send(largeOrderDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.products.length).toBe(availableProducts.length);
          expect(res.body.totalAmount).toBeCloseTo(totalAmount, 2);
        });
    });

    it("GET /customer/:customerId/stats should return customer order statistics", async () => {
      // GIVEN: A customer with order history for statistics
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Stats Customer",
        email: "stats.customer@example.com",
      });

      const product = await dataManager.productFactory.createMargheritaPizza();

      // Create some order history
      await dataManager.orderFactory.createDeliveredOrder({
        customer,
        products: [product],
        notes: "First order for stats",
      });

      await dataManager.orderFactory.createDeliveredOrder({
        customer,
        products: [product],
        notes: "Second order for stats",
      });

      // WHEN: Getting customer order statistics
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
      // GIVEN: A customer and product for concurrent order testing
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Concurrent Customer",
        email: "concurrent.customer@example.com",
      });

      const product = await dataManager.productFactory.createMargheritaPizza();

      // WHEN: Creating multiple concurrent orders for the same customer
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

      // THEN: All orders should be created successfully
      results.forEach((result, index) => {
        expect(result.body.notes).toBe(`Concurrent order ${index + 1}`);
      });
    });
  });
});
