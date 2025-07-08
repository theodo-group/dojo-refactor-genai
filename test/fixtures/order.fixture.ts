import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../src/entities/order.entity';
import { CustomerFixture } from './customer.fixture';
import { ProductFixture } from './product.fixture';

export class OrderFixture {
  private app: INestApplication;
  private orderRepository: Repository<Order>;
  private orders: Order[] = [];
  private customerFixture: CustomerFixture;
  private productFixture: ProductFixture;

  constructor(app: INestApplication, customerFixture: CustomerFixture, productFixture: ProductFixture) {
    this.app = app;
    this.orderRepository = app.get(getRepositoryToken(Order));
    this.customerFixture = customerFixture;
    this.productFixture = productFixture;
  }

  async load(): Promise<void> {
    await this.clear();
    this.orders = await this.createOrders();
  }

  async clear(): Promise<void> {
    await this.orderRepository.query('TRUNCATE TABLE order_products CASCADE');
    await this.orderRepository.query('TRUNCATE TABLE orders CASCADE');
    this.orders = [];
  }

  getOrders(): Order[] {
    return this.orders;
  }

  private async createOrders(): Promise<Order[]> {
    const customers = this.customerFixture.getCustomers();
    const products = this.productFixture.getProducts();

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
        products: [products[0], products[3]], // Margherita Pizza + Garlic Bread
        totalAmount: 17.98,
        status: OrderStatus.DELIVERED,
        notes: 'Extra cheese please',
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo
      }),
      this.orderRepository.create({
        customer: customers[0],
        products: [products[1], products[2], products[4]], // Pepperoni Pizza + Caesar Salad + Tiramisu
        totalAmount: 31.97,
        status: OrderStatus.PREPARING,
        createdAt: fifteenDaysAgo,
        updatedAt: fifteenDaysAgo
      }),
      this.orderRepository.create({
        customer: customers[0],
        products: [products[0], products[2]], // Margherita Pizza + Caesar Salad
        totalAmount: 21.98,
        status: OrderStatus.DELIVERED,
        createdAt: twentyDaysAgo,
        updatedAt: twentyDaysAgo
      }),
      this.orderRepository.create({
        customer: customers[0],
        products: [products[4]], // Tiramisu
        totalAmount: 7.99,
        status: OrderStatus.READY,
        createdAt: twentyFiveDaysAgo,
        updatedAt: twentyFiveDaysAgo
      }),
    ];
    
    return await this.orderRepository.save(orders);
  }
}