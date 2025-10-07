import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { OrderService } from "../../src/order/order.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import {
  createCustomer,
  createProducts,
  createOrdersWithHistory,
} from "../factories";
import { cleanDatabase } from "../utils/database-cleaner";

describe("LoyaltyService (e2e)", () => {
  let app: INestApplication;
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

    loyaltyService = app.get(LoyaltyService);
    orderService = app.get(OrderService);
  });

  beforeEach(async () => {
    await cleanDatabase(app);
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  describe("Loyalty discounts", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      // Create a customer with order history to be eligible for loyalty discount
      const customer = await createCustomer(app, {
        name: "Loyal Customer",
        email: "loyal@example.com",
      });
      const products = await createProducts(app, 2);

      // Create 4 orders in the past month to make customer eligible
      await createOrdersWithHistory(app, customer, products, 4);

      const originalTotal = 25.99;

      // Create an order using the orderService directly
      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Test loyalty discount",
      };

      // Create the order - loyalty discount should be applied
      const order = await orderService.create(createOrderDto);

      // Verify the discount was applied (should be 10% less)
      const expectedTotal = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(order.totalAmount).toBe(expectedTotal);
    });

    it("should NOT apply discount for customers with 3 or fewer orders", async () => {
      // Create a customer with only 2 orders (not eligible)
      const customer = await createCustomer(app, {
        name: "New Customer",
        email: "new@example.com",
      });
      const products = await createProducts(app, 2);

      // Create only 2 orders (threshold is >3)
      await createOrdersWithHistory(app, customer, products, 2);

      const originalTotal = 25.99;

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Test no discount",
      };

      const order = await orderService.create(createOrderDto);

      // No discount should be applied
      expect(order.totalAmount).toBe(originalTotal);
    });
  });
});
