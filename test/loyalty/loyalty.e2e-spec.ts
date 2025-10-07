import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { clearDatabase, createCustomerWith4Orders } from "../fixtures/global-fixtures";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { OrderService } from "../../src/order/order.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";

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
    await clearDatabase(app);
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  describe("Loyalty discounts", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      // Create isolated test data - customer with 4 orders
      const { customer, products } = await createCustomerWith4Orders(app);

      const originalTotal = 25.99;

      // Create an order using the orderService directly
      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.slice(0, 2).map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Test loyalty discount",
      };

      // Create the order - loyalty discount should be applied
      const order = await orderService.create(createOrderDto);

      // Verify the discount was applied (should be 10% less)
      const expectedTotal = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(order.totalAmount).toBe(expectedTotal);
    });
  });
});
