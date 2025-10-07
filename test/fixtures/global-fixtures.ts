import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { Order, OrderStatus } from '../../src/entities/order.entity';
import { CustomerBuilder } from './builders/customer.builder';
import { ProductBuilder } from './builders/product.builder';
import { OrderBuilder } from './builders/order.builder';

export class GlobalFixtures {
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
    await this.orderRepository.query('TRUNCATE TABLE order_products CASCADE');
    await this.orderRepository.query('TRUNCATE TABLE orders CASCADE');
    await this.productRepository.query('TRUNCATE TABLE products CASCADE');
    await this.customerRepository.query('TRUNCATE TABLE customers CASCADE');
    
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

  // Builder accessors
  get builders() {
    return {
      customer: () => new CustomerBuilder(),
      product: () => new ProductBuilder(),
      order: () => new OrderBuilder(),
    };
  }

  // Repository accessors for builders
  get repositories() {
    return {
      customer: this.customerRepository,
      product: this.productRepository,
      order: this.orderRepository,
    };
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
      this.customerRepository.create({
        name: 'Bob Johnson',
        email: 'bob@example.com',
        phone: '555-555-5555',
        address: '789 Pine Rd',
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
      this.productRepository.create({
        name: 'Caesar Salad',
        description: 'Fresh salad with romaine lettuce, croutons, and Caesar dressing',
        price: 8.99,
        category: 'salad',
      }),
      this.productRepository.create({
        name: 'Garlic Bread',
        description: 'Toasted bread with garlic butter',
        price: 4.99,
        category: 'appetizer',
      }),
      this.productRepository.create({
        name: 'Tiramisu',
        description: 'Classic Italian dessert with coffee and mascarpone',
        price: 7.99,
        category: 'dessert',
      }),
    ];
    
    return await this.productRepository.save(products);
  }

  // Factory methods for creating individual entities
  async createCustomer(data?: Partial<Customer>): Promise<Customer> {
    const customer = this.customerRepository.create({
      name: data?.name ?? 'Test Customer',
      email: data?.email ?? `test${Date.now()}@example.com`,
      phone: data?.phone ?? '555-0000',
      address: data?.address ?? '123 Test St',
      ...data,
    });
    return await this.customerRepository.save(customer);
  }

  async createProduct(data?: Partial<Product>): Promise<Product> {
    const product = this.productRepository.create({
      name: data?.name ?? 'Test Product',
      description: data?.description ?? 'Test product description',
      price: data?.price ?? 9.99,
      category: data?.category ?? 'test',
      ...data,
    });
    return await this.productRepository.save(product);
  }

  async createOrder(
    customerId: string,
    productIds: string[],
    data?: Partial<Order>
  ): Promise<Order> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    const products = await this.productRepository.findByIds(productIds);

    const order = this.orderRepository.create({
      customer,
      products,
      totalAmount: data?.totalAmount ?? products.reduce((sum, p) => sum + p.price, 0),
      status: data?.status ?? OrderStatus.PENDING,
      notes: data?.notes,
      createdAt: data?.createdAt,
      updatedAt: data?.updatedAt,
      ...data,
    });

    return await this.orderRepository.save(order);
  }

  // Convenience methods for common test scenarios
  async createOrderWithStatus(
    status: OrderStatus,
    overrides?: { customerId?: string; productIds?: string[]; data?: Partial<Order> }
  ): Promise<Order> {
    let customerId = overrides?.customerId;
    let productIds = overrides?.productIds;

    // Create customer if not provided
    if (!customerId) {
      const customer = await this.createCustomer();
      customerId = customer.id;
    }

    // Create products if not provided
    if (!productIds || productIds.length === 0) {
      const product = await this.createProduct();
      productIds = [product.id];
    }

    return await this.createOrder(customerId, productIds, {
      ...overrides?.data,
      status,
    });
  }

  async createPendingOrder(customerId?: string, productIds?: string[]): Promise<Order> {
    return this.createOrderWithStatus(OrderStatus.PENDING, { customerId, productIds });
  }

  async createDeliveredOrder(customerId?: string, productIds?: string[]): Promise<Order> {
    return this.createOrderWithStatus(OrderStatus.DELIVERED, { customerId, productIds });
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
        customer: this.customers[0],
        products: [this.products[0], this.products[3]],
        totalAmount: 17.98,
        status: OrderStatus.DELIVERED,
        notes: 'Extra cheese please',
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo
      }),
      this.orderRepository.create({
        customer: this.customers[0],
        products: [this.products[1], this.products[2], this.products[4]],
        totalAmount: 31.97,
        status: OrderStatus.PREPARING,
        createdAt: fifteenDaysAgo,
        updatedAt: fifteenDaysAgo
      }),
      this.orderRepository.create({
        customer: this.customers[0],
        products: [this.products[0], this.products[2]],
        totalAmount: 21.98,
        status: OrderStatus.DELIVERED,
        createdAt: twentyDaysAgo,
        updatedAt: twentyDaysAgo
      }),
      this.orderRepository.create({
        customer: this.customers[0],
        products: [this.products[4]],
        totalAmount: 7.99,
        status: OrderStatus.READY,
        createdAt: twentyFiveDaysAgo,
        updatedAt: twentyFiveDaysAgo
      }),
    ];
    
    return await this.orderRepository.save(orders);
  }
}