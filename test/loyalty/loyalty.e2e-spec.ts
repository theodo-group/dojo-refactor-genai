import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { OrderService } from "../../src/order/order.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { LoyaltyFixtures } from "../fixtures/loyalty-fixtures";

describe("LoyaltyService (e2e)", () => {
  let app: INestApplication;
  let fixtures: LoyaltyFixtures;
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

    fixtures = new LoyaltyFixtures(app);
    await fixtures.load();

    loyaltyService = app.get(LoyaltyService);
    orderService = app.get(OrderService);
  });

  afterAll(async () => {
    await fixtures.clear();
    await app.close();
  });

  describe("Loyalty discounts", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      // Get a customer from fixtures
      const customer = fixtures.getCustomers()[0];
      const products = fixtures.getProducts().slice(0, 2);
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

      // This will cause issues in other tests since the shared fixtures
      // expect specific order totals that are now changed

      // Modify a fixture order total to cause problems in other tests
      const fixtureOrder = fixtures.getOrders()[0];
      fixtureOrder.totalAmount = 5.99; // This will break other tests
    });
  });
});
