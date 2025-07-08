import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DeepPartial, Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";
import {
  customer_0,
  customer_1,
  customer_2,
  order_0,
  order_1,
  order_2,
  order_3,
  product_0,
  product_1,
  product_2,
  product_3,
  product_4,
} from "test/fixtures/fixtures";

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
    await this.orderRepository.query("TRUNCATE TABLE order_products CASCADE");
    await this.orderRepository.query("TRUNCATE TABLE orders CASCADE");
    await this.productRepository.query("TRUNCATE TABLE products CASCADE");
    await this.customerRepository.query("TRUNCATE TABLE customers CASCADE");

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
  private async createCustomers(
    partialCustomers: DeepPartial<Customer>[]
  ): Promise<Customer[]> {
    const customers = partialCustomers.map((customer) => {
      return this.customerRepository.create(customer);
    });

    return await this.customerRepository.save(customers);
  }

  // Product creation
  private async createProducts(
    partialProducts: DeepPartial<Product>[]
  ): Promise<Product[]> {
    const products = partialProducts.map((product) => {
      return this.productRepository.create(product);
    });

    return await this.productRepository.save(products);
  }

  // Order creation
  private async createOrders(
    partialOrders: DeepPartial<Order>[]
  ): Promise<Order[]> {
    const orders = partialOrders.map((order) => {
      return this.orderRepository.create(order);
    });

    return await this.orderRepository.save(orders);
  }
}
