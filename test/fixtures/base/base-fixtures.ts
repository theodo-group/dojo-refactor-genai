import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../../src/entities/customer.entity';
import { Product } from '../../../src/entities/product.entity';
import { Order } from '../../../src/entities/order.entity';

export abstract class BaseFixtures<T> {
  protected app: INestApplication;
  protected customerRepository: Repository<Customer>;
  protected productRepository: Repository<Product>;
  protected orderRepository: Repository<Order>;
  protected data: T[] = [];

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  /**
   * Clean all database tables in proper order to respect foreign key constraints
   */
  async clearDatabase(): Promise<void> {
    await this.orderRepository.query('TRUNCATE TABLE order_products CASCADE');
    await this.orderRepository.query('TRUNCATE TABLE orders CASCADE');
    await this.productRepository.query('TRUNCATE TABLE products CASCADE');
    await this.customerRepository.query('TRUNCATE TABLE customers CASCADE');
  }

  /**
   * Abstract method to be implemented by concrete fixture classes
   */
  abstract build(): Promise<T[]>;

  /**
   * Get the created fixture data
   */
  getData(): T[] {
    return this.data;
  }

  /**
   * Clean up fixture data and reset internal state
   */
  async cleanup(): Promise<void> {
    await this.clearDatabase();
    this.data = [];
  }
}