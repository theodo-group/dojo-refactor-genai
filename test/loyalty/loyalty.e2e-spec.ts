import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { GlobalFixtures } from "../fixtures/global-fixtures";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { OrderService } from "../../src/order/order.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { customerMocks } from "../fixtures/mocks/customer.mocks";
import { productMocks } from "../fixtures/mocks/product.mocks";
import { OrderStatus } from "../../src/entities/order.entity";

// Create dates for the orders - to make first customer eligible for loyalty program
const now = new Date();
const tenDaysAgo = new Date(now);
tenDaysAgo.setDate(now.getDate() - 10);

const fifteenDaysAgo = new Date(now);
fifteenDaysAgo.setDate(now.getDate() - 15);

const twentyDaysAgo = new Date(now);
twentyDaysAgo.setDate(now.getDate() - 20);

const twentyFiveDaysAgo = new Date(now);
twentyFiveDaysAgo.setDate(now.getDate() - 25);

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
    await fixtures.clear();
    const customers = await fixtures.createCustomers(customerMocks);
    const products = await fixtures.createProducts(productMocks);

    const orderMocks = [
      {
        customer: customers[0],
        products: [products[0], products[3]],
        totalAmount: 17.98,
        status: OrderStatus.DELIVERED,
        notes: "Extra cheese please",
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
      },
      {
        customer: customers[0],
        products: [products[1], products[2], products[4]],
        totalAmount: 31.97,
        status: OrderStatus.PREPARING,
        createdAt: fifteenDaysAgo,
        updatedAt: fifteenDaysAgo,
      },
      {
        customer: customers[0],
        products: [products[0], products[2]],
        totalAmount: 21.98,
        status: OrderStatus.DELIVERED,
        createdAt: twentyDaysAgo,
        updatedAt: twentyDaysAgo,
      },
      {
        customer: customers[0],
        products: [products[4]],
        totalAmount: 7.99,
        status: OrderStatus.READY,
        createdAt: twentyFiveDaysAgo,
        updatedAt: twentyFiveDaysAgo,
      },
    ];
    const orders = await fixtures.createOrders(orderMocks);
    await fixtures.load(customers, products, orders);

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
