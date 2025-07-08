import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { Order, OrderStatus } from '../../src/entities/order.entity';

export interface OrderTestScenario {
  customers: Customer[];
  products: Product[];
  orders: Order[];
}

export class OrderFixtures {
  private readonly app: INestApplication;
  private readonly customerRepository: Repository<Customer>;
  private readonly productRepository: Repository<Product>;
  private readonly orderRepository: Repository<Order>;

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  async createTestScenario(): Promise<OrderTestScenario> {
    // Create test customers for order scenarios
    const customers = await this.createOrderTestCustomers();
    
    // Create test products for order scenarios
    const products = await this.createOrderTestProducts();
    
    // Create test orders with various statuses
    const orders = await this.createOrderTestOrders(customers, products);

    return { customers, products, orders };
  }

  async cleanup(): Promise<void> {
    // Delete in correct order to respect FK constraints
    await this.orderRepository.query('TRUNCATE TABLE order_products CASCADE');
    await this.orderRepository.query('TRUNCATE TABLE orders CASCADE');
    await this.productRepository.query('TRUNCATE TABLE products CASCADE');
    await this.customerRepository.query('TRUNCATE TABLE customers CASCADE');
  }

  private async createOrderTestCustomers(): Promise<Customer[]> {
    const customers = [
      this.customerRepository.create({
        name: 'Order Test Customer',
        email: 'order-test@example.com',
        phone: '123-456-7890',
        address: '123 Order Test St',
      }),
      this.customerRepository.create({
        name: 'Another Order Customer',
        email: 'order-test2@example.com',
        phone: '987-654-3210',
        address: '456 Order Test Ave',
      }),
    ];
    
    return await this.customerRepository.save(customers);
  }

  private async createOrderTestProducts(): Promise<Product[]> {
    const products = [
      this.productRepository.create({
        name: 'Test Pizza',
        description: 'Pizza for order testing',
        price: 12.99,
        category: 'pizza',
      }),
      this.productRepository.create({
        name: 'Test Salad',
        description: 'Salad for order testing',
        price: 8.99,
        category: 'salad',
      }),
      this.productRepository.create({
        name: 'Test Dessert',
        description: 'Dessert for order testing',
        price: 6.99,
        category: 'dessert',
      }),
    ];
    
    return await this.productRepository.save(products);
  }

  private async createOrderTestOrders(customers: Customer[], products: Product[]): Promise<Order[]> {
    const orders = [
      this.orderRepository.create({
        customer: customers[0],
        products: [products[0], products[2]],
        totalAmount: 19.98,
        status: OrderStatus.DELIVERED,
        notes: 'Test delivered order',
      }),
      this.orderRepository.create({
        customer: customers[0],
        products: [products[1]],
        totalAmount: 8.99,
        status: OrderStatus.PREPARING,
        notes: 'Test preparing order',
      }),
      this.orderRepository.create({
        customer: customers[1],
        products: [products[0], products[1]],
        totalAmount: 21.98,
        status: OrderStatus.READY,
        notes: 'Test ready order',
      }),
      this.orderRepository.create({
        customer: customers[1],
        products: [products[2]],
        totalAmount: 6.99,
        status: OrderStatus.PENDING,
        notes: 'Test pending order',
      }),
    ];
    
    return await this.orderRepository.save(orders);
  }
}
