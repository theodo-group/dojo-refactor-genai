import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../src/entities/order.entity';
import { Product } from '../../src/entities/product.entity';
import { Customer } from '../../src/entities/customer.entity';

/**
 * Clears all test data from the database
 * Respects foreign key constraints by deleting in the correct order
 */
export async function cleanDatabase(app: INestApplication): Promise<void> {
  const orderRepository: Repository<Order> = app.get(
    getRepositoryToken(Order)
  );
  const productRepository: Repository<Product> = app.get(
    getRepositoryToken(Product)
  );
  const customerRepository: Repository<Customer> = app.get(
    getRepositoryToken(Customer)
  );

  // Delete in the correct order to respect foreign key constraints
  await orderRepository.query('TRUNCATE TABLE order_products CASCADE');
  await orderRepository.query('TRUNCATE TABLE orders CASCADE');
  await productRepository.query('TRUNCATE TABLE products CASCADE');
  await customerRepository.query('TRUNCATE TABLE customers CASCADE');
}
