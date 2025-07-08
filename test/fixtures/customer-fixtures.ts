import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../src/entities/customer.entity';

export interface CustomerTestScenario {
  customers: Customer[];
}

export class CustomerFixtures {
  private readonly app: INestApplication;
  private readonly customerRepository: Repository<Customer>;

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
  }

  async createTestScenario(): Promise<CustomerTestScenario> {
    // Create customers for customer CRUD testing
    const customers = await this.createCustomerTestData();

    return { customers };
  }

  async cleanup(): Promise<void> {
    // Simple cleanup for customer-only tests
    await this.customerRepository.query('TRUNCATE TABLE customers CASCADE');
  }

  private async createCustomerTestData(): Promise<Customer[]> {
    const customers = [
      this.customerRepository.create({
        name: 'Customer Test User 1',
        email: 'customer-test1@example.com',
        phone: '555-CUST-01',
        address: '123 Customer Test St',
      }),
      this.customerRepository.create({
        name: 'Customer Test User 2',
        email: 'customer-test2@example.com',
        phone: '555-CUST-02',
        address: '456 Customer Test Ave',
      }),
      this.customerRepository.create({
        name: 'Customer Test User 3',
        email: 'customer-test3@example.com',
        phone: '555-CUST-03',
        address: '789 Customer Test Blvd',
      }),
    ];
    
    return await this.customerRepository.save(customers);
  }
}
