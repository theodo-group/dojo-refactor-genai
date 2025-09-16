import { INestApplication } from '@nestjs/common';
import { Customer } from '../../../src/entities/customer.entity';
import { BaseFixtures } from '../base/base-fixtures';
import { FixtureBuilder } from '../base/fixture-builder.interface';

export interface CustomerProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export class CustomerFixtureFactory extends BaseFixtures<Customer> implements FixtureBuilder<Customer> {
  private profiles: CustomerProfile[] = [];

  async init(_app: INestApplication): Promise<void> {
    // Base constructor already handles app initialization
  }

  /**
   * Add a basic customer profile
   */
  addBasicCustomer(overrides: Partial<CustomerProfile> = {}): CustomerFixtureFactory {
    this.profiles.push({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      address: '123 Main St',
      ...overrides,
    });
    return this;
  }

  /**
   * Add a loyal customer profile (for customers who will have multiple orders)
   */
  addLoyalCustomer(overrides: Partial<CustomerProfile> = {}): CustomerFixtureFactory {
    this.profiles.push({
      name: 'Loyal Customer',
      email: 'loyal@example.com',
      phone: '555-LOYAL-1',
      address: '456 Loyalty Lane',
      ...overrides,
    });
    return this;
  }

  /**
   * Add a new customer profile
   */
  addNewCustomer(overrides: Partial<CustomerProfile> = {}): CustomerFixtureFactory {
    this.profiles.push({
      name: 'New Customer',
      email: 'new@example.com',
      phone: '555-NEW-123',
      address: '789 Fresh Start Ave',
      ...overrides,
    });
    return this;
  }

  /**
   * Add a custom customer profile
   */
  addCustomer(profile: CustomerProfile): CustomerFixtureFactory {
    this.profiles.push(profile);
    return this;
  }

  /**
   * Add multiple customers at once
   */
  addCustomers(profiles: CustomerProfile[]): CustomerFixtureFactory {
    this.profiles.push(...profiles);
    return this;
  }

  /**
   * Build all configured customer fixtures
   */
  async build(): Promise<Customer[]> {
    if (this.profiles.length === 0) {
      // Default to a basic customer if none specified
      this.addBasicCustomer();
    }

    const customers = this.profiles.map(profile =>
      this.customerRepository.create(profile)
    );

    this.data = await this.customerRepository.save(customers);
    return this.data;
  }

  /**
   * Get a customer by index
   */
  getCustomer(index: number): Customer | undefined {
    return this.data[index];
  }

  /**
   * Get a customer by email
   */
  getCustomerByEmail(email: string): Customer | undefined {
    return this.data.find(customer => customer.email === email);
  }

  /**
   * Clean up and reset profiles
   */
  async cleanup(): Promise<void> {
    await super.cleanup();
    this.profiles = [];
  }
}