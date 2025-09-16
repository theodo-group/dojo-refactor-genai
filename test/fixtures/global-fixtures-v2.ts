import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DeepPartial, Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order } from "../../src/entities/order.entity";

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
    customersData: DeepPartial<Customer>[],
    productsData: DeepPartial<Product>[],
    ordersData: DeepPartial<Order>[]
  ): Promise<void> {
    // Clear existing data first
    await this.clear();

    // Create customers
    this.customers = await this.createCustomers(customersData);

    // Create products
    this.products = await this.createProducts(productsData);

    // Create orders
    this.orders = await this.createOrders(ordersData);
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
    customersData: DeepPartial<Customer>[]
  ): Promise<Customer[]> {
    const customers = customersData.map((customerData) =>
      this.customerRepository.create(customerData)
    );

    return await this.customerRepository.save(customers);
  }

  // Product creation
  private async createProducts(
    productsData: DeepPartial<Product>[]
  ): Promise<Product[]> {
    const products = productsData.map((productData) =>
      this.productRepository.create(productData)
    );
    return await this.productRepository.save(products);
  }

  // Order creation
  private async createOrders(
    ordersData: DeepPartial<Order>[]
  ): Promise<Order[]> {
    const orders = ordersData.map((orderData) =>
      this.orderRepository.create(orderData)
    );
    return await this.orderRepository.save(orders);
  }
}
