import { faker } from "@faker-js/faker";
import { CreateProductDto } from "../../src/product/dto/create-product.dto";

export const createProductDto = (
  overrides?: Partial<CreateProductDto>
): CreateProductDto => ({
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: parseFloat(faker.commerce.price({ min: 5, max: 100, dec: 2 })),
  category: faker.commerce.department(),
  ...overrides,
});
