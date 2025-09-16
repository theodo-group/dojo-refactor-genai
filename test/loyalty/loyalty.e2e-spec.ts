import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { createFixtures, FixtureFactory } from "../fixtures";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { OrderService } from "../../src/order/order.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";

describe("LoyaltyService (e2e)", () => {
  let app: INestApplication;
  let fixtures: FixtureFactory;
  let loyaltyService: LoyaltyService;
  let orderService: OrderService;

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
    fixtures = createFixtures(app);

    loyaltyService = app.get(LoyaltyService);
    orderService = app.get(OrderService);
  });

  beforeEach(async () => {
    // Clean up before each test to ensure isolation
    await fixtures.cleanup();
  });

  afterAll(async () => {
    await fixtures.cleanup();
    await app.close();
  });

  describe("Loyalty discounts", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      // Create a loyal customer with order history using the builder
      const { customer, orders } = await fixtures
        .scenario()
        .loyalCustomer()
        .withName("John Doe")
        .withEmail("john@example.com")
        .withOrderHistory([
          { daysAgo: 25, products: ["pizza"], status: OrderStatus.DELIVERED },
          {
            daysAgo: 20,
            products: ["pizza", "salad"],
            status: OrderStatus.DELIVERED,
          },
          { daysAgo: 15, products: ["pizza"], status: OrderStatus.DELIVERED },
          { daysAgo: 10, products: ["dessert"], status: OrderStatus.DELIVERED },
        ])
        .build();

      // Create products for the new order
      const margherita = await fixtures
        .product()
        .asPizza("Margherita Pizza")
        .build();
      const caesarSalad = await fixtures
        .product()
        .asSalad("Caesar Salad")
        .build();

      const originalTotal = 25.99;

      // Create an order using the orderService directly
      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [margherita.id, caesarSalad.id],
        totalAmount: originalTotal,
        notes: "Test loyalty discount",
      };

      // Create the order - loyalty discount should be applied
      const order = await orderService.create(createOrderDto);

      // Verify the discount was applied (should be 10% less)
      const expectedTotal = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(order.totalAmount).toBe(expectedTotal);

      // No more shared fixture pollution! Each test gets its own data.
    });

    it("should not apply discount for new customers", async () => {
      // Create a new customer with no order history
      const customer = await fixtures
        .scenario()
        .newCustomer()
        .withName("Jane Smith")
        .withEmail("jane@example.com")
        .build();

      const pizza = await fixtures.product().asPizza().build();
      const originalTotal = 12.99;

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [pizza.id],
        totalAmount: originalTotal,
        notes: "First order",
      };

      const order = await orderService.create(createOrderDto);

      // No discount should be applied
      expect(order.totalAmount).toBe(originalTotal);
    });
  });
});
