import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { CustomerFixture } from "../fixtures/customer.fixture";
import { ProductFixture } from "../fixtures/product.fixture";
import { OrderFixture } from "../fixtures/order.fixture";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { OrderService } from "../../src/order/order.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";

describe("LoyaltyService (e2e)", () => {
  let app: INestApplication;
  let customerFixture: CustomerFixture;
  let productFixture: ProductFixture;
  let orderFixture: OrderFixture;
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

    // Initialize fixtures in dependency order
    customerFixture = new CustomerFixture(app);
    productFixture = new ProductFixture(app);
    
    await customerFixture.load();
    await productFixture.load();
    
    orderFixture = new OrderFixture(app, customerFixture, productFixture);
    await orderFixture.load();

    loyaltyService = app.get(LoyaltyService);
    orderService = app.get(OrderService);
  });

  afterAll(async () => {
    await orderFixture.clear();
    await productFixture.clear();
    await customerFixture.clear();
    await app.close();
  });

  describe("Loyalty discounts", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      // Get a customer from fixtures - first customer already has 4 orders from OrderFixture
      const customer = customerFixture.getCustomers()[0];
      const products = productFixture.getProducts().slice(0, 2);
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

      // No more fixture pollution - each test has its own isolated data
      // The OrderFixture data is separate from this test's order creation
    });
  });
});
