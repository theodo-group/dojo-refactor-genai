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
      // Use Bob Johnson who has only 1 order initially (the pending one we added)
      const customer = fixtures.getCustomers()[2]; // Bob Johnson
      const products = fixtures.getProducts().slice(0, 2);
      const originalTotal = 27.98; // Margherita (12.99) + Pepperoni (14.99)

      // Create 5 more orders to make customer eligible for 10% discount (total 6 orders)
      for (let i = 0; i < 5; i++) {
        const createOrderDto: CreateOrderDto = {
          customerId: customer.id,
          productIds: [products[0].id], // Just Margherita
          totalAmount: 12.99,
          notes: `Loyalty test order ${i + 1}`,
        };
        await orderService.create(createOrderDto);
      }

      // Now create the 7th order (should get 10% discount)
      const finalOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Final order with discount",
      };

      const order = await orderService.create(finalOrderDto);

      // Verify the discount was applied (should be 10% less)
      const expectedTotal = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(order.totalAmount).toBe(expectedTotal);
    });

    it("should apply progressive discounts based on order count", async () => {
      // Use Charlie Test who has no orders
      const customer = fixtures.getCustomers()[4]; // Charlie Test
      const products = fixtures.getProducts().slice(0, 2);
      const originalTotal = 27.98; // 12.99 + 14.99

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Testing progressive discounts",
      };

      // Create first 3 orders (no discount - count is 0, 1, 2 when creating each)
      for (let i = 0; i < 3; i++) {
        const order = await orderService.create(createOrderDto);
        expect(order.totalAmount).toBe(originalTotal); // No discount
      }

      // 4th order should get 5% discount (customer now has 3 existing orders when creating 4th)
      const fourthOrder = await orderService.create(createOrderDto);
      const expected5Percent = parseFloat((originalTotal * 0.95).toFixed(2));
      expect(fourthOrder.totalAmount).toBe(expected5Percent);

      // Create 2 more orders to reach 6 orders total
      for (let i = 0; i < 2; i++) {
        await orderService.create(createOrderDto);
      }

      // 7th order should get 10% discount (customer now has 6 existing orders when creating 7th)
      const seventhOrder = await orderService.create(createOrderDto);
      const expected10Percent = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(seventhOrder.totalAmount).toBe(expected10Percent);
    });
  });
});
