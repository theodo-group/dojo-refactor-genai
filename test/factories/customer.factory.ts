import { faker } from "@faker-js/faker";
import { CreateCustomerDto } from "../../src/customer/dto/create-customer.dto";

export const createCustomerDto = (
  overrides?: Partial<CreateCustomerDto>
): CreateCustomerDto => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  address: faker.location.streetAddress({ useFullAddress: true }),
  ...overrides,
});
