import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { GlobalFixtures } from "../fixtures/global-fixtures";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { OrderService } from "../../src/order/order.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";

describe("LoyaltyService (e2e)", () => {
  let app: INestApplication;
  let fixtures: GlobalFixtures;
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

    fixtures = new GlobalFixtures(app);
    loyaltyService = app.get(LoyaltyService);
    orderService = app.get(OrderService);
  });

  afterAll(async () => {
    await fixtures.clear();
    await app.close();
  });

  describe("Loyalty discounts", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      // Given
      const loyalCustomerScenario = await fixtures.loyalCustomerScenario();
      const customer = loyalCustomerScenario.customers[0];
      const products = loyalCustomerScenario.products.slice(0, 2);
      const originalTotal = 25.99;

      // When
      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Test loyalty discount",
      };

      const order = await orderService.create(createOrderDto);

      // Then
      const expectedTotal = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(order.totalAmount).toBe(expectedTotal);
    });
  });
});
