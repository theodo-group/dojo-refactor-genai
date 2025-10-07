import { faker } from "@faker-js/faker";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";

export const createOrderDto = (
  customerId: string,
  productIds: string[],
  overrides?: Partial<CreateOrderDto>
): CreateOrderDto => ({
  customerId,
  productIds,
  totalAmount: parseFloat(faker.commerce.price({ min: 10, max: 200, dec: 2 })),
  notes: faker.lorem.sentence(),
  ...overrides,
});
