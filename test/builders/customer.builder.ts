import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";

export class CustomerBuilder {
  private app: INestApplication;
  private customerRepository: Repository<Customer>;
  private customerData: Partial<Customer> = {};

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.setDefaults();
  }

  private setDefaults(): this {
    this.customerData = {
      name: "Test Customer",
      email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
      phone: "123-456-7890",
      address: "123 Test Street",
      isActive: true,
    };
    return this;
  }

  withName(name: string): this {
    this.customerData.name = name;
    return this;
  }

  withEmail(email: string): this {
    this.customerData.email = email;
    return this;
  }

  withPhone(phone: string): this {
    this.customerData.phone = phone;
    return this;
  }

  withAddress(address: string): this {
    this.customerData.address = address;
    return this;
  }

  inactive(): this {
    this.customerData.isActive = false;
    return this;
  }

  async build(): Promise<Customer> {
    const customer = this.customerRepository.create(this.customerData);
    return await this.customerRepository.save(customer);
  }

  async buildMany(count: number): Promise<Customer[]> {
    const customers: Customer[] = [];
    for (let i = 0; i < count; i++) {
      // Reset defaults and add unique identifier for each customer
      this.setDefaults();
      this.customerData.name = `${this.customerData.name} ${i + 1}`;
      customers.push(await this.build());
    }
    return customers;
  }

  // Predefined customer types for common scenarios
  static johnDoe(app: INestApplication): CustomerBuilder {
    return new CustomerBuilder(app)
      .withName("John Doe")
      .withEmail("john.doe@example.com")
      .withPhone("555-0001")
      .withAddress("123 Main St");
  }

  static janeSmith(app: INestApplication): CustomerBuilder {
    return new CustomerBuilder(app)
      .withName("Jane Smith")
      .withEmail("jane.smith@example.com")
      .withPhone("555-0002")
      .withAddress("456 Oak Ave");
  }

  static vipCustomer(app: INestApplication): CustomerBuilder {
    return new CustomerBuilder(app)
      .withName("VIP Customer")
      .withEmail("vip@example.com")
      .withPhone("555-VIP1")
      .withAddress("999 Premium Ave");
  }
}
