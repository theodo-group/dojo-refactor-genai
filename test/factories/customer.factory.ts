import { Customer } from '../../src/entities/customer.entity';

export const createCustomer = (partialCustomer: Partial<Customer> = {}): Partial<Customer> => ({
  name: 'Test Customer',
  email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
  phone: '123-456-7890',
  address: '123 Test St',
  ...partialCustomer
});
