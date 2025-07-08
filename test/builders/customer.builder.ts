import { Customer } from '../../src/entities/customer.entity';

export class CustomerBuilder {
  private customer: Partial<Customer>;

  constructor() {
    this.customer = {
      id: 'customer-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      address: '123 Main St',
      isActive: true,
      orders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  withId(id: string): CustomerBuilder {
    this.customer.id = id;
    return this;
  }

  withName(name: string): CustomerBuilder {
    this.customer.name = name;
    return this;
  }

  withEmail(email: string): CustomerBuilder {
    this.customer.email = email;
    return this;
  }

  withPhone(phone: string): CustomerBuilder {
    this.customer.phone = phone;
    return this;
  }

  withAddress(address: string): CustomerBuilder {
    this.customer.address = address;
    return this;
  }

  withIsActive(isActive: boolean): CustomerBuilder {
    this.customer.isActive = isActive;
    return this;
  }

  withOrders(orders: any[]): CustomerBuilder {
    this.customer.orders = orders;
    return this;
  }

  build(): Customer {
    return this.customer as Customer;
  }
}
