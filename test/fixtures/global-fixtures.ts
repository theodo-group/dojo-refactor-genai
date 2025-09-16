import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { Order, OrderStatus } from '../../src/entities/order.entity';

export interface ScenarioData {
  customers: Customer[];
  products: Product[];
  orders: Order[];
}

export class GlobalFixtures {
  private app: INestApplication;
  private customerRepository: Repository<Customer>;
  private productRepository: Repository<Product>;
  private orderRepository: Repository<Order>;

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  async clear(): Promise<void> {
    // Delete in the correct order to respect foreign key constraints
    await this.orderRepository.query('TRUNCATE TABLE order_products CASCADE');
    await this.orderRepository.query('TRUNCATE TABLE orders CASCADE');
    await this.productRepository.query('TRUNCATE TABLE products CASCADE');
    await this.customerRepository.query('TRUNCATE TABLE customers CASCADE');
  }

  // Scenario-based fixture loading
  async basicCustomersScenario(): Promise<ScenarioData> {
    await this.clear();
    const customers = await this.createBasicCustomers();
    return { customers, products: [], orders: [] };
  }

  async basicProductsScenario(): Promise<ScenarioData> {
    await this.clear();
    const products = await this.createBasicProducts();
    return { customers: [], products, orders: [] };
  }

  async loyalCustomerScenario(): Promise<ScenarioData> {
    await this.clear();
    const customers = await this.createBasicCustomers();
    const products = await this.createBasicProducts();
    const orders = await this.createLoyalCustomerOrders(customers, products);
    return { customers, products, orders };
  }

  async newCustomerScenario(): Promise<ScenarioData> {
    await this.clear();
    const customers = await this.createNewCustomers();
    const products = await this.createBasicProducts();
    return { customers, products, orders: [] };
  }

  async productCatalogScenario(): Promise<ScenarioData> {
    await this.clear();
    const products = await this.createExtendedProducts();
    return { customers: [], products, orders: [] };
  }

  async orderManagementScenario(): Promise<ScenarioData> {
    await this.clear();
    const customers = await this.createBasicCustomers();
    const products = await this.createBasicProducts();
    const orders = await this.createVariousOrders(customers, products);
    return { customers, products, orders };
  }

  // Customer creation methods
  private async createBasicCustomers(): Promise<Customer[]> {
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

  private async createNewCustomers(): Promise<Customer[]> {
    const customers = [
      this.customerRepository.create({
        name: 'Alice Brown',
        email: 'alice@example.com',
        phone: '111-222-3333',
        address: '789 Pine St',
      }),
    ];
    return await this.customerRepository.save(customers);
  }

  // Product creation methods
  private async createBasicProducts(): Promise<Product[]> {
    const products = [
      this.productRepository.create({
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato sauce and mozzarella',
        price: 12.99,
        category: 'pizza',
      }),
      this.productRepository.create({
        name: 'Caesar Salad',
        description: 'Fresh salad with romaine lettuce and Caesar dressing',
        price: 8.99,
        category: 'salad',
      }),
    ];
    return await this.productRepository.save(products);
  }

  private async createExtendedProducts(): Promise<Product[]> {
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
      this.productRepository.create({
        name: 'Caesar Salad',
        description: 'Fresh salad with romaine lettuce and Caesar dressing',
        price: 8.99,
        category: 'salad',
      }),
      this.productRepository.create({
        name: 'Garlic Bread',
        description: 'Toasted bread with garlic butter',
        price: 4.99,
        category: 'appetizer',
      }),
    ];
    return await this.productRepository.save(products);
  }

  // Order creation methods
  private async createLoyalCustomerOrders(customers: Customer[], products: Product[]): Promise<Order[]> {
    const now = new Date();
    const dates = [10, 15, 20, 25].map(days => {
      const date = new Date(now);
      date.setDate(now.getDate() - days);
      return date;
    });

    const orders = [
      this.orderRepository.create({
        customer: customers[0],
        products: [products[0]],
        totalAmount: 12.99,
        status: OrderStatus.DELIVERED,
        createdAt: dates[0],
        updatedAt: dates[0]
      }),
      this.orderRepository.create({
        customer: customers[0],
        products: [products[1]],
        totalAmount: 8.99,
        status: OrderStatus.DELIVERED,
        createdAt: dates[1],
        updatedAt: dates[1]
      }),
      this.orderRepository.create({
        customer: customers[0],
        products: [products[0]],
        totalAmount: 12.99,
        status: OrderStatus.DELIVERED,
        createdAt: dates[2],
        updatedAt: dates[2]
      }),
      this.orderRepository.create({
        customer: customers[0],
        products: [products[1]],
        totalAmount: 8.99,
        status: OrderStatus.DELIVERED,
        createdAt: dates[3],
        updatedAt: dates[3]
      }),
    ];
    return await this.orderRepository.save(orders);
  }

  private async createVariousOrders(customers: Customer[], products: Product[]): Promise<Order[]> {
    const orders = [
      this.orderRepository.create({
        customer: customers[0],
        products: [products[0]],
        totalAmount: 12.99,
        status: OrderStatus.PREPARING,
      }),
      this.orderRepository.create({
        customer: customers[1],
        products: [products[1]],
        totalAmount: 8.99,
        status: OrderStatus.READY,
      }),
    ];
    return await this.orderRepository.save(orders);
  }
}
