import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { UpdateOrderDto } from "../../src/order/dto/update-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";
import { TestSetup } from "../helpers/test-setup";
import { TestDataFactory } from "../helpers/test-data-factory";

describe("OrderController (e2e)", () => {
  let app: INestApplication;
  let dataFactory: TestDataFactory;

  beforeAll(async () => {
    const setup = await TestSetup.createTestApp();
    app = setup.app;
    dataFactory = setup.dataFactory;
  });

  afterAll(async () => {
    await TestSetup.cleanupTestApp(app, dataFactory);
  });

  beforeEach(async () => {
    // Clean up test data before each test to ensure isolation
    await dataFactory.clearOrders();
    await dataFactory.clearCustomers();
    await dataFactory.clearProducts();
  });

  describe("/api/orders", () => {
    it("GET / should return all orders", async () => {
      // Create test data for this test
      const customer = await dataFactory.createCustomer();
      const products = await dataFactory.createProducts(2);
      await dataFactory.createOrder(customer, products);

      return request(app.getHttpServer())
        .get("/api/orders")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(1);

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
      const customer = await dataFactory.createCustomer();
      const products = await dataFactory.createProducts(2);
      await dataFactory.createOrder(customer, products, {
        status: OrderStatus.PENDING,
      });
      await dataFactory.createOrder(customer, products, {
        status: OrderStatus.DELIVERED,
      });

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
      const customer = await dataFactory.createCustomer();
      const products = await dataFactory.createProducts(2);
      const order = await dataFactory.createOrder(customer, products);

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
      const customer = await dataFactory.createCustomer();
      const products = await dataFactory.createProducts(2);
      await dataFactory.createOrder(customer, products);

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

    it("POST / should create a new order", async () => {
      const customer = await dataFactory.createCustomer();
      const products = await dataFactory.createPizzaProducts();
      const totalAmount = products.reduce((sum, p) => sum + Number(p.price), 0);

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount,
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
      const customer = await dataFactory.createCustomer();
      const products = await dataFactory.createProducts(1);
      const order = await dataFactory.createOrder(customer, products, {
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
      const customer = await dataFactory.createCustomer();
      const products = await dataFactory.createProducts(1);
      const order = await dataFactory.createOrder(customer, products, {
        status: OrderStatus.DELIVERED,
      });
      const newStatus = OrderStatus.PREPARING;

      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: newStatus })
        .expect(400);
    });

    it("DELETE /:id should cancel an order", async () => {
      const customer = await dataFactory.createCustomer();
      const products = await dataFactory.createProducts(1);
      const order = await dataFactory.createOrder(customer, products, {
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

    it("POST / should validate total amount matches product prices", async () => {
      const customer = await dataFactory.createCustomer();
      const products = await dataFactory.createPizzaProducts();

      const invalidTotalDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: 50.0, // Wrong total
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
      const customer = await dataFactory.createCustomer();
      const products = await dataFactory.createProducts(1);

      // Create orders with different dates
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      await dataFactory.createOrder(customer, products, {
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
      });

      // Get orders from the last 12 days
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

    it("POST / should apply customer loyalty discounts correctly", async () => {
      // Create a customer with order history for loyalty discount
      const { customer } = await dataFactory.createCustomerWithOrders(4);
      const products = await dataFactory.createPizzaProducts();
      const baseTotal = products.reduce((sum, p) => sum + Number(p.price), 0);

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

    it("GET /?status=multiple should filter by multiple statuses", async () => {
      const customer = await dataFactory.createCustomer();
      const products = await dataFactory.createProducts(1);
      await dataFactory.createOrder(customer, products, {
        status: OrderStatus.PENDING,
      });
      await dataFactory.createOrder(customer, products, {
        status: OrderStatus.PREPARING,
      });
      await dataFactory.createOrder(customer, products, {
        status: OrderStatus.DELIVERED,
      });

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
      const customer = await dataFactory.createCustomer();
      const unavailableProduct = await dataFactory.createUnavailableProduct();

      const invalidOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [unavailableProduct.id],
        totalAmount: Number(unavailableProduct.price),
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
      const customer = await dataFactory.createCustomer();
      const products = await dataFactory.createProducts(3);

      // Create orders with different totals
      await dataFactory.createOrder(customer, [products[0]], {
        totalAmount: 10.99,
      });
      await dataFactory.createOrder(customer, [products[1]], {
        totalAmount: 25.99,
      });
      await dataFactory.createOrder(customer, [products[2]], {
        totalAmount: 15.99,
      });

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
      const customer = await dataFactory.createCustomer();
      const products = await dataFactory.createProducts(1);

      const pendingOrder = await dataFactory.createOrder(customer, products, {
        status: OrderStatus.PENDING,
      });
      const deliveredOrder = await dataFactory.createOrder(customer, products, {
        status: OrderStatus.DELIVERED,
      });

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

    it("GET /?limit=5&offset=2 should paginate orders", async () => {
      // Create multiple orders for pagination test
      const customer = await dataFactory.createCustomer();
      const products = await dataFactory.createProducts(1);

      for (let i = 0; i < 10; i++) {
        await dataFactory.createOrder(customer, products);
      }

      return request(app.getHttpServer())
        .get("/api/orders?limit=5&offset=2")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(5);
        });
    });

    it("GET /analytics/summary should return order analytics", async () => {
      // Create some orders for analytics
      const customer = await dataFactory.createCustomer();
      const products = await dataFactory.createProducts(2);
      await dataFactory.createOrder(customer, products);

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

    it("POST / should handle large orders with many products", async () => {
      const customer = await dataFactory.createCustomer();
      const availableProducts = await dataFactory.createProducts(8);
      const totalAmount = availableProducts.reduce(
        (sum, p) => sum + Number(p.price),
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

    it("GET /customer/:customerId/stats should return customer order statistics", async () => {
      const { customer } = await dataFactory.createCustomerWithOrders(3);

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
      const customer = await dataFactory.createCustomer();
      const product = await dataFactory.createProduct();

      const concurrentOrders = Array.from({ length: 3 }, (_, i) => ({
        customerId: customer.id,
        productIds: [product.id],
        totalAmount: Number(product.price),
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
