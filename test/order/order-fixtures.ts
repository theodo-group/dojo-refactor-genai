import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../src/entities/order.entity';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { CustomerFixtures } from '../customer/customer-fixtures';
import { ProductFixtures } from '../product/product-fixtures';

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

    const orders = [
      this.orderRepository.create({
        customer: customers[0],
        products: [products[0], products[3]],
        totalAmount: 17.98,
        status: OrderStatus.DELIVERED,
        notes: 'Extra cheese please',
      }),
      this.orderRepository.create({
        customer: customers[1],
        products: [products[1], products[2], products[4]],
        totalAmount: 31.97,
        status: OrderStatus.PREPARING,
      }),
      this.orderRepository.create({
        customer: customers[2],
        products: [products[0]],
        totalAmount: 12.99,
        status: OrderStatus.READY,
      }),
    ];
    
    return await this.orderRepository.save(orders);
  }
}
