import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { Order, OrderStatus } from '../../src/entities/order.entity';

export class OrderFixtures {
  private app: INestApplication;
  private customerRepository: Repository<Customer>;
  private productRepository: Repository<Product>;
  private orderRepository: Repository<Order>;

  // Cached fixtures for reuse across tests
  private customers: Customer[] = [];
  private products: Product[] = [];
  private orders: Order[] = [];

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  async load(): Promise<void> {
    // Clear existing data first
    await this.clear();

    // Create customers
    this.customers = await this.createCustomers();
    
    // Create products
    this.products = await this.createProducts();
    
    // Create orders
    this.orders = await this.createOrders();
  }

  async clear(): Promise<void> {
    // Delete in the correct order to respect foreign key constraints
    await this.orderRepository.query('TRUNCATE TABLE "order_products" CASCADE');
    await this.orderRepository.query('TRUNCATE TABLE "orders" CASCADE');
    await this.productRepository.query('TRUNCATE TABLE "products" CASCADE');
    await this.customerRepository.query('TRUNCATE TABLE "customers" CASCADE');
    
    // Reset cached data
    this.customers = [];
    this.products = [];
    this.orders = [];
  }

  // Helper methods to access fixture data
  getCustomers(): Customer[] {
    return this.customers;
  }

  getProducts(): Product[] {
    return this.products;
  }

  getOrders(): Order[] {
    return this.orders;
  }

  // Customer creation
  private async createCustomers(): Promise<Customer[]> {
    const customers = [
      this.customerRepository.create({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        address: '123 Main St',
      }),
      this.customerRepository.create({
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '987-654-3210',
        address: '456 Oak Ave',
      }),
    ];
    
    return await this.customerRepository.save(customers);
  }

  // Product creation
  private async createProducts(): Promise<Product[]> {
    const products = [
      this.productRepository.create({
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato sauce and mozzarella',
        price: 12.99,
        category: 'pizza',
      }),
      this.productRepository.create({
        name: 'Pepperoni Pizza',
        description: 'Pizza with tomato sauce, mozzarella, and pepperoni',
        price: 14.99,
        category: 'pizza',
      }),
    ];
    
    return await this.productRepository.save(products);
  }

  // Order creation
  private async createOrders(): Promise<Order[]> {
    const orders = [
      this.orderRepository.create({
        customer: this.customers[0],
        products: [this.products[0]],
        totalAmount: 12.99,
        status: OrderStatus.DELIVERED,
        notes: 'Extra cheese please',
      }),
      this.orderRepository.create({
        customer: this.customers[1],
        products: [this.products[1]],
        totalAmount: 14.99,
        status: OrderStatus.PREPARING,
      }),
      this.orderRepository.create({
        customer: this.customers[0],
        products: [this.products[0], this.products[1]],
        totalAmount: 27.98,
        status: OrderStatus.READY,
      }),
    ];
    
    return await this.orderRepository.save(orders);
  }
}
