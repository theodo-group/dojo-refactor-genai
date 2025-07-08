import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../src/entities/customer.entity';

export class CustomerFixture {
  private app: INestApplication;
  private customerRepository: Repository<Customer>;
  private customers: Customer[] = [];

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
  }

  async load(): Promise<void> {
    await this.clear();
    this.customers = await this.createCustomers();
  }

  async clear(): Promise<void> {
    await this.customerRepository.query('TRUNCATE TABLE customers CASCADE');
    this.customers = [];
  }

  getCustomers(): Customer[] {
    return this.customers;
  }

  private async createCustomers(): Promise<Customer[]> {
    const customers = [
      this.customerRepository.create({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        address: '123 Main St',
      }),
      this.customerRepository.create({
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '987-654-3210',
        address: '456 Oak Ave',
      }),
      this.customerRepository.create({
        name: 'Bob Johnson',
        email: 'bob@example.com',
        phone: '555-555-5555',
        address: '789 Pine Rd',
      }),
    ];
    
    return await this.customerRepository.save(customers);
  }
}