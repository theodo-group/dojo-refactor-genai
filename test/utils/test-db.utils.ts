import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../src/entities/customer.entity';

export class TestDbUtils {
  private customerRepository: Repository<Customer>;

  constructor(private app: INestApplication) {
    this.customerRepository = app.get(getRepositoryToken(Customer));
  }

  async createCustomer(customerData: Partial<Customer>): Promise<Customer> {
    const customer = this.customerRepository.create(customerData);
    return await this.customerRepository.save(customer);
  }

  async createMultipleCustomers(customersData: Partial<Customer>[]): Promise<Customer[]> {
    const customers = this.customerRepository.create(customersData);
    return await this.customerRepository.save(customers);
  }

  async clear(): Promise<void> {
    await this.customerRepository.query('TRUNCATE TABLE customers CASCADE');
  }
}
