import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { TestDbUtils } from "../utils/test-db.utils";
import { createCustomer } from "../factories/customer.factory";
import { createProduct } from "../factories/product.factory";
import { createOrder } from "../factories/order.factory";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { OrderService } from "../../src/order/order.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order } from "../../src/entities/order.entity";

describe("LoyaltyService (e2e)", () => {
  let app: INestApplication;
  let testDbUtils: TestDbUtils;
  let loyaltyService: LoyaltyService;
  let orderService: OrderService;
  let testCustomer: Customer;
  let testProducts: Product[];

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

    // Initialize test utilities and services
    testDbUtils = new TestDbUtils(app);
    loyaltyService = app.get(LoyaltyService);
    orderService = app.get(OrderService);

    // Create test data
    // Create a customer
    const customerData = createCustomer({ 
      name: 'Loyal Customer', 
      email: 'loyal@example.com' 
    });
    testCustomer = await testDbUtils.createCustomer(customerData);
    
    // Create products
    const productsData = [
      createProduct({ name: 'Pizza', price: 12.99, category: 'pizza' }),
      createProduct({ name: 'Salad', price: 8.99, category: 'salad' }),
      createProduct({ name: 'Dessert', price: 6.99, category: 'dessert' })
    ];
    testProducts = await testDbUtils.createMultipleProducts(productsData);

    // Create multiple orders for the customer to make them eligible for loyalty discount
    // (Need more than 3 orders for 10% discount)
    const now = new Date();
    const ordersData = [
      createOrder({
        customer: testCustomer,
        products: [testProducts[0]],
        totalAmount: 12.99,
        status: OrderStatus.DELIVERED,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        updatedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }),
      createOrder({
        customer: testCustomer,
        products: [testProducts[1]],
        totalAmount: 8.99,
        status: OrderStatus.DELIVERED,
        createdAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
        updatedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000)
      }),
      createOrder({
        customer: testCustomer,
        products: [testProducts[2]],
        totalAmount: 6.99,
        status: OrderStatus.DELIVERED,
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        updatedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)
      }),
      createOrder({
        customer: testCustomer,
        products: [testProducts[0], testProducts[1]],
        totalAmount: 21.98,
        status: OrderStatus.DELIVERED,
        createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        updatedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
      })
    ];
    await testDbUtils.createMultipleOrders(ordersData);
  });

  afterAll(async () => {
    await testDbUtils.clear();
    await app.close();
  });

  describe("Loyalty discounts", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      // Use the customer with existing orders (more than 3)
      const products = testProducts.slice(0, 2);
      const originalTotal = 25.99;

      // Create an order using the orderService directly
      const createOrderDto: CreateOrderDto = {
        customerId: testCustomer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Test loyalty discount",
      };

      // Create the order - loyalty discount should be applied
      const order = await orderService.create(createOrderDto);

      // Verify the discount was applied (should be 10% less)
      const expectedTotal = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(order.totalAmount).toBe(expectedTotal);

      // Verify the order was created with correct details
      expect(order.customer.id).toBe(testCustomer.id);
      expect(order.products.length).toBe(products.length);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.notes).toBe(createOrderDto.notes);
    });
  });
});
