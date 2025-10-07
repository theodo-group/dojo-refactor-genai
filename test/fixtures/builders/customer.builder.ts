import { Repository } from 'typeorm';
import { Customer } from '../../../src/entities/customer.entity';

export class CustomerBuilder {
  private customerData: Partial<Customer> = {
    name: 'Test Customer',
    email: `test${Date.now()}@example.com`,
    phone: '555-0000',
    address: '123 Test St',
  };

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

  build(): Customer {
    const customer = new Customer();
    Object.assign(customer, this.customerData);
    return customer;
  }

  async create(repository: Repository<Customer>): Promise<Customer> {
    const customer = repository.create(this.customerData);
    return await repository.save(customer);
  }
}
