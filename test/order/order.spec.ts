import { Test } from "@nestjs/testing";
import { Order } from "../../src/entities/order.entity";
import { OrderService } from "../../src/order/order.service";
import { CustomerService } from "../../src/customer/customer.service";
import { ProductService } from "../../src/product/product.service";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BadRequestException } from "@nestjs/common";

export type MockType<T> = {
  [P in keyof T]?: jest.Mock<{}>;
};

// @ts-ignore
const repositoryMockFactory: () => MockType<Repository<any>> = jest.fn(() => ({
  findOne: jest.fn((entity) => entity),
  create: jest.fn((entity) => entity),
  save: jest.fn((entity) => entity),
}));

describe("OrderService", () => {
  let orderRepository: MockType<Repository<Order>>;
  let orderService: OrderService;
  let customerService: CustomerService;
  let productService: ProductService;
  let loyaltyService: LoyaltyService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrderService,
        CustomerService,
        ProductService,
        LoyaltyService,
        {
          provide: getRepositoryToken(Order),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(Customer),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(Product),
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    orderRepository = moduleRef.get(getRepositoryToken(Order));
    orderService = moduleRef.get(OrderService);
    orderService = moduleRef.get(OrderService);
    customerService = moduleRef.get(CustomerService);
    productService = moduleRef.get(ProductService);
    loyaltyService = moduleRef.get(LoyaltyService);
  });

  afterAll(async () => {});

  describe("order.service create", () => {
    const orderTestSet = [
      // [customerId, productIds, totalAmount, notes]
      ["1", ["product1", "product2"], 500, "First order"],
    ] as [string, string[], number, string][];

    it.each(orderTestSet)(
      "should create orders with correct total amount",
      async (customerId, productIds, totalAmount, notes) => {
        const foundCustomer = new Customer();
        const product1 = new Product();
        product1.isAvailable = true;
        const product2 = new Product();
        product2.isAvailable = true;

        jest.spyOn(customerService, "findOne").mockResolvedValue(foundCustomer);
        jest
          .spyOn(productService, "findOne")
          .mockReturnValue(Promise.resolve(product1));
        jest
          .spyOn(productService, "findOne")
          .mockReturnValue(Promise.resolve(product2));
        jest
          .spyOn(loyaltyService, "calculateNextOrderAmount")
          .mockReturnValue(Promise.resolve(124.99));

        const result = await orderService.create({ customerId, productIds, totalAmount, notes });
        expect(customerService.findOne).toHaveBeenCalledWith(customerId);
        expect(result).toStrictEqual({
            customer: foundCustomer,
            "notes": "First order",
            products: [product1, product2],
            totalAmount: 124.99,
        })
      }
    );

    it.each(orderTestSet)(
      "should throw if a product is not available",
      async () => {
        const foundCustomer = new Customer();
        const product1 = new Product();
        product1.isAvailable = false;
        product1.name = "Carotte";

        jest.spyOn(customerService, "findOne").mockResolvedValue(foundCustomer);
        jest
          .spyOn(productService, "findOne")
          .mockReturnValue(Promise.resolve(product1));

        await expect(orderService.create({ customerId: "1", productIds: ["product1"], totalAmount: 2 }))
        .rejects
        .toBeInstanceOf(BadRequestException);
      }
    );
  });
});
