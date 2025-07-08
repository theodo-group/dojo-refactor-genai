import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../src/entities/order.entity';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { CustomerFixtures } from '../customer/customer-fixtures';
import { ProductFixtures } from '../product/product-fixtures';

export class LoyaltyFixtures {
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

    // Create dependencies
    await this.customerFixtures.load();
    await this.productFixtures.load();

    // Create orders
    this.orders = await this.createOrders();
  }

  async clear(): Promise<void> {
    await this.orderRepository.query('TRUNCATE TABLE order_products CASCADE');
    await this.orderRepository.query('TRUNCATE TABLE orders CASCADE');
    await this.productFixtures.clear();
    await this.customerFixtures.clear();
    
    // Reset cached data
    this.orders = [];
  }

  // Helper methods to access fixture data
  getOrders(): Order[] {
    return this.orders;
  }

  getCustomers(): Customer[] {
    return this.customerFixtures.getCustomers();
  }

  getProducts(): Product[] {
    return this.productFixtures.getProducts();
  }

  // Order creation
  private async createOrders(): Promise<Order[]> {
    const customers = this.getCustomers();
    const products = this.getProducts();

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
        customer: customers[0],
        products: [products[0], products[3]],
        totalAmount: 17.98,
        status: OrderStatus.DELIVERED,
        notes: 'Extra cheese please',
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo
      }),
      this.orderRepository.create({
        customer: customers[0],
        products: [products[1], products[2], products[4]],
        totalAmount: 31.97,
        status: OrderStatus.PREPARING,
        createdAt: fifteenDaysAgo,
        updatedAt: fifteenDaysAgo
      }),
      this.orderRepository.create({
        customer: customers[0],
        products: [products[0], products[2]],
        totalAmount: 21.98,
        status: OrderStatus.DELIVERED,
        createdAt: twentyDaysAgo,
        updatedAt: twentyDaysAgo
      }),
      this.orderRepository.create({
        customer: customers[0],
        products: [products[4]],
        totalAmount: 7.99,
        status: OrderStatus.READY,
        createdAt: twentyFiveDaysAgo,
        updatedAt: twentyFiveDaysAgo
      }),
    ];
    
    return await this.orderRepository.save(orders);
  }
}
