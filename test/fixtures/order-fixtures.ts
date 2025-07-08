import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../src/entities/order.entity';
import { CustomerFixtures } from './customer-fixtures';
import { ProductFixtures } from './product-fixtures';

export class OrderFixtures {
  private app: INestApplication;
  private orderRepository: Repository<Order>;
  private customerFixtures: CustomerFixtures;
  private productFixtures: ProductFixtures;

  // Cached fixtures for reuse across tests
  private orders: Order[] = [];

  constructor(app: INestApplication) {
    this.app = app;
    this.orderRepository = app.get(getRepositoryToken(Order));
    this.customerFixtures = new CustomerFixtures(app);
    this.productFixtures = new ProductFixtures(app);
  }

  async load(): Promise<void> {
    // Clear existing data first
    await this.clear();
    // Create orders
    this.orders = await this.createOrders();
  }

  async clear(): Promise<void> {
    // Delete in the correct order to respect foreign key constraints
    await this.orderRepository.query('TRUNCATE TABLE order_products CASCADE');
    await this.orderRepository.query('TRUNCATE TABLE orders CASCADE');

    this.orders = [];
  }

  getOrders(): Order[] {
    return this.orders;
  }

  // Order creation
  private async createOrders(): Promise<Order[]> {
    // Create dates for the orders - to make first customer eligible for loyalty program
    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(now.getDate() - 10);

    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(now.getDate() - 15);

    const twentyDaysAgo = new Date(now);
    twentyDaysAgo.setDate(now.getDate() - 20);

    const twentyFiveDaysAgo = new Date(now);
    twentyFiveDaysAgo.setDate(now.getDate() - 25);

    const orders = [
      this.orderRepository.create({
        customer: this.customerFixtures.getCustomers()[0],
        products: [this.productFixtures.getProducts()[0], this.productFixtures.getProducts()[3]],
        totalAmount: 17.98,
        status: OrderStatus.DELIVERED,
        notes: 'Extra cheese please',
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo
      }),
      this.orderRepository.create({
        customer: this.customerFixtures.getCustomers()[0],
        products: [this.productFixtures.getProducts()[1], this.productFixtures.getProducts()[2], this.productFixtures.getProducts()[4]],
        totalAmount: 31.97,
        status: OrderStatus.PREPARING,
        createdAt: fifteenDaysAgo,
        updatedAt: fifteenDaysAgo
      }),
      this.orderRepository.create({
        customer: this.customerFixtures.getCustomers()[0],
        products: [this.productFixtures.getProducts()[0], this.productFixtures.getProducts()[2]],
        totalAmount: 21.98,
        status: OrderStatus.DELIVERED,
        createdAt: twentyDaysAgo,
        updatedAt: twentyDaysAgo
      }),
      this.orderRepository.create({
        customer: this.customerFixtures.getCustomers()[0],
        products: [this.productFixtures.getProducts()[4]],
        totalAmount: 7.99,
        status: OrderStatus.READY,
        createdAt: twentyFiveDaysAgo,
        updatedAt: twentyFiveDaysAgo
      }),
    ];

    return await this.orderRepository.save(orders);
  }
}