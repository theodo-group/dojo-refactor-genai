import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";
import { Product } from "../../src/entities/product.entity";

export class OrderFixtures {
  private app: INestApplication;
  private customerRepository: Repository<Customer>;
  private productRepository: Repository<Product>;
  private orderRepository: Repository<Order>;
  private customers: Customer[] = [];
  private products: Product[] = [];
  private orders: Order[] = [];

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  async createTestScenario() {
    // Clear existing data
    await this.cleanup();

    // Create customers and products first (needed for orders)
    this.customers = await this.createCustomers();
    this.products = await this.createProducts();
    this.orders = await this.createOrders();

    return {
      customers: this.customers,
      products: this.products,
      orders: this.orders,
      pendingOrders: this.orders.filter(o => o.status === OrderStatus.PENDING),
      preparingOrders: this.orders.filter(o => o.status === OrderStatus.PREPARING),
      deliveredOrders: this.orders.filter(o => o.status === OrderStatus.DELIVERED),
      recentOrderForModification: this.orders.find(o =>
        o.status === OrderStatus.PENDING && o.notes?.includes('Recent order')
      ),
      productsInActiveOrders: [this.products[1]], // Pepperoni Pizza in PREPARING
    };
  }

  async cleanup(): Promise<void> {
    // Delete in correct order to respect foreign key constraints
    await this.orderRepository.query("TRUNCATE TABLE order_products CASCADE");
    await this.orderRepository.query("TRUNCATE TABLE orders CASCADE");
    await this.productRepository.query("TRUNCATE TABLE products CASCADE");
    await this.customerRepository.query("TRUNCATE TABLE customers CASCADE");

    this.orders = [];
    this.products = [];
    this.customers = [];
  }

  private async createCustomers(): Promise<Customer[]> {
    const customers = [
      this.customerRepository.create({
        name: "Order Test Customer",
        email: "order.test@example.com",
        phone: "123-456-7890",
        address: "123 Order St",
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
      this.customerRepository.create({
        name: "Charlie Test",
        email: "charlie.test@example.com",
        phone: "222-222-2222",
        address: "123 Test Avenue",
      }),
    ];

    return await this.customerRepository.save(customers);
  }

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
        description: "Fresh salad with romaine lettuce, croutons, and Caesar dressing",
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
    ];

    return await this.productRepository.save(products);
  }

  private async createOrders(): Promise<Order[]> {
    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(now.getDate() - 10);

    const orders = [
      // Order for testing order retrieval
      this.orderRepository.create({
        customerId: this.customers[0].id,
        customer: this.customers[0],
        products: [this.products[0], this.products[3]], // Margherita Pizza + Garlic Bread
        totalAmount: 17.98,
        status: OrderStatus.DELIVERED,
        notes: "Order Test Customer order",
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
      }),

      // Order in PREPARING status with Pepperoni Pizza
      this.orderRepository.create({
        customerId: this.customers[1].id,
        customer: this.customers[1],
        products: [this.products[1]], // Pepperoni Pizza
        totalAmount: 14.99,
        status: OrderStatus.PREPARING,
        notes: "Order to test product deletion prevention",
        createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
        updatedAt: new Date(now.getTime() - 30 * 60 * 1000),
      }),

      // Pending order for testing
      this.orderRepository.create({
        customerId: this.customers[2].id,
        customer: this.customers[2],
        products: [this.products[2]], // Caesar Salad
        totalAmount: 8.99,
        status: OrderStatus.PENDING,
        notes: "Please deliver quickly",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),

      // Recent order for modification testing
      this.orderRepository.create({
        customerId: this.customers[3].id,
        customer: this.customers[3],
        products: [this.products[0]], // Margherita Pizza
        totalAmount: 12.99,
        status: OrderStatus.PENDING,
        notes: "Recent order for modification testing",
        createdAt: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago
        updatedAt: new Date(now.getTime() - 2 * 60 * 1000),
      }),
    ];

    return await this.orderRepository.save(orders);
  }
} 