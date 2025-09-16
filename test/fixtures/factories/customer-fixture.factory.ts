import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../../src/entities/customer.entity";
import { FixtureBuilder } from "../base/fixture-builder.interface";

export interface CustomerProfileOptions {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}

export class CustomerFixtureFactory implements FixtureBuilder<Customer> {
  private repository: Repository<Customer>;
  private createdCustomers: Customer[] = [];

  constructor(app: INestApplication) {
    this.repository = app.get(getRepositoryToken(Customer));
  }

  async build(overrides: CustomerProfileOptions = {}): Promise<Customer> {
    const customerData = {
      name: overrides.name || `Test Customer ${Date.now()}`,
      email: overrides.email || `test${Date.now()}@example.com`,
      phone: overrides.phone || "555-555-5555",
      address: overrides.address || "123 Test St",
      isActive: overrides.isActive ?? true,
    };

    const customer = this.repository.create(customerData);
    const savedCustomer = await this.repository.save(customer);
    this.createdCustomers.push(savedCustomer);
    return savedCustomer;
  }

  async buildMany(count: number, overrides: CustomerProfileOptions = {}): Promise<Customer[]> {
    const customers: Customer[] = [];
    for (let i = 0; i < count; i++) {
      const customer = await this.build({
        ...overrides,
        name: overrides.name ? `${overrides.name} ${i + 1}` : undefined,
        email: overrides.email?.includes('@')
          ? overrides.email.replace('@', `${i + 1}@`)
          : undefined,
      });
      customers.push(customer);
    }
    return customers;
  }

  async createBasicCustomer(overrides: CustomerProfileOptions = {}): Promise<Customer> {
    return this.build({
      name: "Basic Customer",
      email: `basic${Date.now()}@example.com`,
      ...overrides,
    });
  }

  async createLoyalCustomer(overrides: CustomerProfileOptions = {}): Promise<Customer> {
    return this.build({
      name: "Loyal Customer",
      email: `loyal${Date.now()}@example.com`,
      ...overrides,
    });
  }

  async createVipCustomer(overrides: CustomerProfileOptions = {}): Promise<Customer> {
    return this.build({
      name: "VIP Customer",
      email: `vip${Date.now()}@example.com`,
      ...overrides,
    });
  }

  async createTestCustomerForUpdates(overrides: CustomerProfileOptions = {}): Promise<Customer> {
    return this.build({
      name: "Update Test Customer",
      email: `update.test${Date.now()}@example.com`,
      phone: "333-333-3333",
      address: "456 Update St",
      ...overrides,
    });
  }

  async createTestCustomerForDeletion(overrides: CustomerProfileOptions = {}): Promise<Customer> {
    return this.build({
      name: "Delete Test Customer",
      email: `delete.test${Date.now()}@example.com`,
      phone: "444-444-4444",
      address: "321 Delete Rd",
      ...overrides,
    });
  }

  async reset(): Promise<void> {
    this.createdCustomers = [];
  }

  getCreatedCustomers(): Customer[] {
    return [...this.createdCustomers];
  }
}