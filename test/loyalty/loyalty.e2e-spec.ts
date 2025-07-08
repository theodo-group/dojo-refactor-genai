import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { OrderService } from "../../src/order/order.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { ApiTestHelpers } from "../helpers/api-test-helpers";
import { TestDataFactory } from "../helpers/test-data-factory";
import { CleanupHelpers, TestDataTracker, createDataTracker } from "../helpers/cleanup-helpers";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";

describe("LoyaltyService (e2e)", () => {
  let app: INestApplication;
  let loyaltyService: LoyaltyService;
  let orderService: OrderService;
  let apiHelpers: ApiTestHelpers;
  let cleanupHelpers: CleanupHelpers;
  let testData: TestDataTracker;

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

    // Initialize API helpers
    apiHelpers = new ApiTestHelpers(app);
    cleanupHelpers = new CleanupHelpers(apiHelpers);

    loyaltyService = app.get(LoyaltyService);
    orderService = app.get(OrderService);
  });

  beforeEach(async () => {
    testData = createDataTracker();
  });

  afterEach(async () => {
    await cleanupHelpers.cleanupAll(testData);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Loyalty discounts", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      // Create a customer for this test
      const customerData = TestDataFactory.createCustomerData({
        name: "Loyalty Test Customer",
        email: "loyalty@test.com",
      });
      const customer = await apiHelpers.createCustomer(customerData);
      testData.customers.push(customer);

      // Create products for orders
      const productData = TestDataFactory.getStandardProducts().slice(0, 2);
      const products: Product[] = [];
      for (const data of productData) {
        const product = await apiHelpers.createProduct(data);
        products.push(product);
        testData.products.push(product);
      }

      // Create 4 orders to make the customer eligible for loyalty discount
      const orderPromises = [];
      for (let i = 0; i < 4; i++) {
        const orderData = TestDataFactory.createOrderData(
          customer.id,
          products.map((p) => p.id),
          {
            totalAmount: 15.99,
            notes: `Pre-loyalty order ${i + 1}`,
          }
        );
        orderPromises.push(apiHelpers.createOrder(orderData));
      }

      const existingOrders = await Promise.all(orderPromises);
      testData.orders.push(...existingOrders);

      // Wait a bit to ensure order timestamps are properly recorded
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now create a new order - loyalty discount should be applied
      const originalTotal = 25.99;
      const newOrderData: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Test loyalty discount order",
      };

      // Create the order via API - loyalty discount should be applied
      const discountedOrder = await apiHelpers.createOrder(newOrderData);
      testData.orders.push(discountedOrder);

      // Verify the discount was applied (should be 10% less)
      const expectedTotal = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(discountedOrder.totalAmount).toBe(expectedTotal);

      // Verify the customer has 5 orders total (4 + 1 new)
      const customerOrders = await apiHelpers.getCustomerOrders(customer.id);
      expect(customerOrders.length).toBe(5);
    });

    it("should not apply discount for customers with 3 or fewer orders", async () => {
      // Create a customer for this test
      const customerData = TestDataFactory.createCustomerData({
        name: "No Discount Customer",
        email: "nodiscount@test.com",
      });
      const customer = await apiHelpers.createCustomer(customerData);
      testData.customers.push(customer);

      // Create products for orders
      const productData = TestDataFactory.getStandardProducts().slice(0, 2);
      const products: Product[] = [];
      for (const data of productData) {
        const product = await apiHelpers.createProduct(data);
        products.push(product);
        testData.products.push(product);
      }

      // Create only 2 orders (not enough for loyalty discount)
      const orderPromises = [];
      for (let i = 0; i < 2; i++) {
        const orderData = TestDataFactory.createOrderData(
          customer.id,
          products.map((p) => p.id),
          {
            totalAmount: 15.99,
            notes: `Regular order ${i + 1}`,
          }
        );
        orderPromises.push(apiHelpers.createOrder(orderData));
      }

      const existingOrders = await Promise.all(orderPromises);
      testData.orders.push(...existingOrders);

      // Wait a bit to ensure order timestamps are properly recorded
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create a new order - no discount should be applied
      const originalTotal = 25.99;
      const newOrderData: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "No discount order",
      };

      // Create the order via API - no discount should be applied
      const regularOrder = await apiHelpers.createOrder(newOrderData);
      testData.orders.push(regularOrder);

      // Verify no discount was applied (should be same as original)
      expect(regularOrder.totalAmount).toBe(originalTotal);

      // Verify the customer has 3 orders total (2 + 1 new)
      const customerOrders = await apiHelpers.getCustomerOrders(customer.id);
      expect(customerOrders.length).toBe(3);
    });
  });
});
