import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { LoyaltyFixtures, LoyaltyTestScenario } from "../fixtures/loyalty-fixtures";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { OrderService } from "../../src/order/order.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";

describe("LoyaltyService (e2e)", () => {
  let app: INestApplication;
  let fixtures: LoyaltyFixtures;
  let testData: LoyaltyTestScenario;
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

    // Initialize loyalty-specific fixtures
    fixtures = new LoyaltyFixtures(app);

    loyaltyService = app.get(LoyaltyService);
    orderService = app.get(OrderService);
  });

  beforeEach(async () => {
    // Clean up and create fresh test data for each test
    await fixtures.cleanup();
    testData = await fixtures.createTestScenario();
  });

  afterAll(async () => {
    await fixtures.cleanup();
    await app.close();
  });

  describe("Loyalty discounts", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      // Use the loyal customer who already has 4 orders from fixtures
      const customer = testData.loyalCustomer;
      const products = testData.products.slice(0, 2);
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

    it("should not apply discount for new customers", async () => {
      // Use the new customer who has no previous orders
      const customer = testData.newCustomer;
      const products = testData.products.slice(0, 1);
      const originalTotal = 15.99;

      // Create an order using the orderService directly
      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Test no discount for new customer",
      };

      // Create the order - no loyalty discount should be applied
      const order = await orderService.create(createOrderDto);

      // Verify no discount was applied
      expect(order.totalAmount).toBe(originalTotal);
    });
  });
});
