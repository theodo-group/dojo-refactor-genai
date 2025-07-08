import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

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

  async load(
    customers: Customer[],
    products: Product[],
    orders: Order[] = []
  ): Promise<void> {
    this.customers = customers;

    // Create products
    this.products = products;

    // Create orders
    this.orders = orders;
  }

  async clear(): Promise<void> {
    // Delete in the correct order to respect foreign key constraints
    await this.orderRepository.query("TRUNCATE TABLE order_products CASCADE");
    await this.orderRepository.query("TRUNCATE TABLE orders CASCADE");
    await this.productRepository.query("TRUNCATE TABLE products CASCADE");
    await this.customerRepository.query("TRUNCATE TABLE customers CASCADE");
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
  async createCustomers(customers: Partial<Customer>[]): Promise<Customer[]> {
    const createdCustomers = customers.map((customer) =>
      this.customerRepository.create(customer)
    );

    return await this.customerRepository.save(createdCustomers);
  }

  // Product creation
  async createProducts(products: Partial<Product>[]): Promise<Product[]> {
    const createdProducts = products.map((product) =>
      this.productRepository.create(product)
    );

    return await this.productRepository.save(createdProducts);
  }

  async createOrders(orders: Partial<Order>[]): Promise<Order[]> {
    const createdOrders = orders.map((order) =>
      this.orderRepository.create(order)
    );

    return await this.orderRepository.save(createdOrders);
  }
}
