import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { GlobalFixtures } from "./scenarios";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";

describe("Example Usage of New Fixtures API (e2e)", () => {
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

  afterAll(async () => {
    if (fixtures) {
      await fixtures.clear();
    }
    if (app) {
      await app.close();
    }
  });

  describe("New Scenario-Based API Examples", () => {
    it("should demonstrate basic order scenario usage", async () => {
      // Load only the fixtures needed for this test
      const data = await fixtures.basicOrderScenario();
      
      // Access the specific data you need
      const customer = data.customers[0];
      const products = data.products;
      const existingOrders = data.orders;

      // Use the data in your test
      expect(customer.name).toBe("John Doe");
      expect(products).toHaveLength(3);
      expect(existingOrders).toHaveLength(1);
      expect(existingOrders[0].status).toBe(OrderStatus.PENDING);
    });

    it("should demonstrate loyal customer scenario usage", async () => {
      // Load fixtures for loyalty testing
      const data = await fixtures.loyalCustomerScenario();
      
      const loyalCustomer = data.customers[0];
      const customerOrders = data.orders;

      // Verify the loyal customer has multiple orders
      expect(loyalCustomer.name).toBe("John Loyal");
      expect(customerOrders).toHaveLength(3);
      expect(customerOrders.every(order => order.status === OrderStatus.DELIVERED)).toBe(true);

      // Test creating a new order for the loyal customer (should get discount)
      const products = data.products.slice(0, 2);
      const baseTotal = products.reduce((sum, p) => sum + parseFloat(p.price.toString()), 0);

      const createOrderDto: CreateOrderDto = {
        customerId: loyalCustomer.id,
        productIds: products.map((p) => p.id),
        totalAmount: baseTotal,
        notes: "Order for loyal customer",
      };

      const response = await request(app.getHttpServer())
        .post("/api/orders")
        .send(createOrderDto)
        .expect(201);

      // Should apply loyalty discount
      expect(response.body.totalAmount).toBeLessThanOrEqual(baseTotal);
    });

    it("should demonstrate order status scenario usage", async () => {
      // Load fixtures with orders in different statuses
      const data = await fixtures.orderStatusScenario();
      
      const pendingOrder = data.orders.find(o => o.status === OrderStatus.PENDING);
      const preparingOrder = data.orders.find(o => o.status === OrderStatus.PREPARING);
      const deliveredOrder = data.orders.find(o => o.status === OrderStatus.DELIVERED);

      expect(pendingOrder).toBeDefined();
      expect(preparingOrder).toBeDefined();
      expect(deliveredOrder).toBeDefined();

      // Test status transitions
      await request(app.getHttpServer())
        .patch(`/api/orders/${preparingOrder!.id}/status`)
        .send({ status: OrderStatus.READY })
        .expect(200);

      // Test invalid status transition
      await request(app.getHttpServer())
        .patch(`/api/orders/${deliveredOrder!.id}/status`)
        .send({ status: OrderStatus.PREPARING })
        .expect(400);
    });

    it("should demonstrate product availability scenario usage", async () => {
      // Load fixtures with available and unavailable products
      const data = await fixtures.productAvailabilityScenario();
      
      const customer = data.customers[0];
      const availableProduct = data.products.find(p => p.isAvailable === true);
      const unavailableProduct = data.products.find(p => p.isAvailable === false);

      expect(availableProduct).toBeDefined();
      expect(unavailableProduct).toBeDefined();

      // Test ordering available product (should succeed)
      const validOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [availableProduct!.id],
        totalAmount: parseFloat(availableProduct!.price.toString()),
        notes: "Order with available product",
      };

      await request(app.getHttpServer())
        .post("/api/orders")
        .send(validOrderDto)
        .expect(201);

      // Test ordering unavailable product (should fail)
      const invalidOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [unavailableProduct!.id],
        totalAmount: parseFloat(unavailableProduct!.price.toString()),
        notes: "Order with unavailable product",
      };

      await request(app.getHttpServer())
        .post("/api/orders")
        .send(invalidOrderDto)
        .expect(400);
    });

    it("should demonstrate recent order scenario usage", async () => {
      // Load fixtures with a recent order for modification testing
      const data = await fixtures.recentOrderScenario();
      
      const recentOrder = data.orders[0];
      expect(recentOrder.status).toBe(OrderStatus.PENDING);

      // Should allow modifications within time window
      await request(app.getHttpServer())
        .patch(`/api/orders/${recentOrder.id}`)
        .send({ notes: "Modified within time window" })
        .expect(200);
    });

    it("should demonstrate multiple customers scenario usage", async () => {
      // Load fixtures with multiple customers
      const data = await fixtures.multipleCustomersScenario();
      
      expect(data.customers).toHaveLength(3);
      expect(data.products).toHaveLength(2);
      expect(data.orders).toHaveLength(2);

      // Test filtering orders by customer
      const customer1 = data.customers[0];
      const customer2 = data.customers[1];

      const customer1Orders = await request(app.getHttpServer())
        .get(`/api/orders/customer/${customer1.id}`)
        .expect(200);

      const customer2Orders = await request(app.getHttpServer())
        .get(`/api/orders/customer/${customer2.id}`)
        .expect(200);

      expect(customer1Orders.body).toHaveLength(1);
      expect(customer2Orders.body).toHaveLength(1);
    });

    it("should demonstrate large order scenario usage", async () => {
      // Load fixtures for large order testing
      const data = await fixtures.largeOrderScenario();
      
      const customer = data.customers[0];
      const allProducts = data.products;
      
      expect(allProducts).toHaveLength(5);

      // Create a large order with all products
      const totalAmount = allProducts.reduce(
        (sum, p) => sum + parseFloat(p.price.toString()),
        0
      );

      const largeOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: allProducts.map((p) => p.id),
        totalAmount: totalAmount,
        notes: "Large order with many products",
      };

      const response = await request(app.getHttpServer())
        .post("/api/orders")
        .send(largeOrderDto)
        .expect(201);

      expect(response.body.products).toHaveLength(5);
      expect(response.body.totalAmount).toBeCloseTo(totalAmount, 2);
    });

    it("should demonstrate combining multiple scenarios", async () => {
      // You can load multiple scenarios in the same test if needed
      const basicData = await fixtures.basicOrderScenario();
      const loyalData = await fixtures.loyalCustomerScenario();
      
      // Access data from both scenarios
      const basicCustomer = basicData.customers[0];
      const loyalCustomer = loyalData.customers[0];
      
      expect(basicCustomer.name).toBe("John Doe");
      expect(loyalCustomer.name).toBe("John Loyal");
      
      // Get all loaded data across scenarios
      const allCustomers = fixtures.getAllLoadedCustomers();
      const allProducts = fixtures.getAllLoadedProducts();
      const allOrders = fixtures.getAllLoadedOrders();
      
      expect(allCustomers.length).toBeGreaterThanOrEqual(3); // At least 2 from basic + 1 from loyal
      expect(allProducts.length).toBeGreaterThanOrEqual(6); // At least 3 from basic + 3 from loyal
      expect(allOrders.length).toBeGreaterThanOrEqual(4); // At least 1 from basic + 3 from loyal
    });
  });
});
