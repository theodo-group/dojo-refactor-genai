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
  private async createCustomers(): Promise<Customer[]> {
    const customers = [
      this.customerRepository.create({
        name: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        address: "123 Main St",
      }),
      this.customerRepository.create({
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "987-654-3210",
        address: "456 Oak Ave",
      }),
      this.customerRepository.create({
        name: "Bob Johnson",
        email: "bob@example.com",
        phone: "555-555-5555",
        address: "789 Pine Rd",
      }),
      // Add a customer for loyalty testing with many orders
      this.customerRepository.create({
        name: "Alice VIP",
        email: "alice.vip@example.com",
        phone: "111-111-1111",
        address: "999 Premium Ave",
      }),
      // Add another customer for progressive loyalty testing
      this.customerRepository.create({
        name: "Charlie Test",
        email: "charlie.test@example.com",
        phone: "222-222-2222",
        address: "123 Test Avenue",
      }),
    ];

    return await this.customerRepository.save(customers);
  }

  // Product creation
  private async createProducts(): Promise<Product[]> {
    const products = [
      this.productRepository.create({
        name: "Margherita Pizza",
        description: "Classic pizza with tomato sauce and mozzarella",
        price: 12.99,
        category: "pizza",
      }),
      this.productRepository.create({
        name: "Pepperoni Pizza",
        description: "Pizza with tomato sauce, mozzarella, and pepperoni",
        price: 14.99,
        category: "pizza",
      }),
      this.productRepository.create({
        name: "Caesar Salad",
        description:
          "Fresh salad with romaine lettuce, croutons, and Caesar dressing",
        price: 8.99,
        category: "salad",
      }),
      this.productRepository.create({
        name: "Garlic Bread",
        description: "Toasted bread with garlic butter",
        price: 4.99,
        category: "appetizer",
      }),
      this.productRepository.create({
        name: "Tiramisu",
        description: "Classic Italian dessert with coffee and mascarpone",
        price: 7.99,
        category: "dessert",
      }),
      // Add an unavailable product for testing
      this.productRepository.create({
        name: "Seasonal Special",
        description: "Limited time offer - currently unavailable",
        price: 15.99,
        category: "special",
        isAvailable: false,
      }),
    ];

    return await this.productRepository.save(products);
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
      // John Doe's orders (first customer - has 4 orders for loyalty testing)
      this.orderRepository.create({
        customer: this.customers[0],
        products: [this.products[0], this.products[3]],
        totalAmount: 17.98,
        status: OrderStatus.DELIVERED,
        notes: "Extra cheese please",
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
      }),
      this.orderRepository.create({
        customer: this.customers[0],
        products: [this.products[1], this.products[2], this.products[4]],
        totalAmount: 31.97,
        status: OrderStatus.PREPARING,
        createdAt: fifteenDaysAgo,
        updatedAt: fifteenDaysAgo,
      }),
      this.orderRepository.create({
        customer: this.customers[0],
        products: [this.products[0], this.products[2]],
        totalAmount: 21.98,
        status: OrderStatus.DELIVERED,
        createdAt: twentyDaysAgo,
        updatedAt: twentyDaysAgo,
      }),
      this.orderRepository.create({
        customer: this.customers[0],
        products: [this.products[4]],
        totalAmount: 7.99,
        status: OrderStatus.READY,
        createdAt: twentyFiveDaysAgo,
        updatedAt: twentyFiveDaysAgo,
      }),
      // Bob Johnson's order (pending status for testing)
      this.orderRepository.create({
        customer: this.customers[2], // Bob Johnson
        products: [this.products[2]], // Caesar Salad
        totalAmount: 8.99,
        status: OrderStatus.PENDING,
        notes: "Please deliver quickly",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      // Alice VIP's orders (many orders for high-tier loyalty testing)
      this.orderRepository.create({
        customer: this.customers[3], // Alice VIP
        products: [this.products[0]],
        totalAmount: 12.99,
        status: OrderStatus.DELIVERED,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      }),
      this.orderRepository.create({
        customer: this.customers[3],
        products: [this.products[1]],
        totalAmount: 14.99,
        status: OrderStatus.DELIVERED,
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        updatedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      }),
    ];

    return await this.orderRepository.save(orders);
  }
}
