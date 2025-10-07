import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../src/entities/customer.entity';

export interface CreateCustomerOptions {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}

export async function createCustomer(
  app: INestApplication,
  options: CreateCustomerOptions = {}
): Promise<Customer> {
  const customerRepository: Repository<Customer> = app.get(
    getRepositoryToken(Customer)
  );

  const customer = customerRepository.create({
    name: options.name ?? `Customer ${Date.now()}`,
    email: options.email ?? `customer-${Date.now()}@example.com`,
    phone: options.phone ?? '123-456-7890',
    address: options.address ?? '123 Test St',
    isActive: options.isActive ?? true,
  });

  return await customerRepository.save(customer);
}

export async function createCustomers(
  app: INestApplication,
  count: number,
  baseOptions: CreateCustomerOptions = {}
): Promise<Customer[]> {
  const customers: Customer[] = [];

  for (let i = 0; i < count; i++) {
    const customer = await createCustomer(app, {
      ...baseOptions,
      name: baseOptions.name ?? `Customer ${i + 1}`,
      email: baseOptions.email ?? `customer${i + 1}@example.com`,
    });
    customers.push(customer);
  }

  return customers;
}
