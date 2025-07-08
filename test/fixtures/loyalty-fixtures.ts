import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

export class LoyaltyFixtures {
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

    // Create customers first (needed for orders)
    this.customers = await this.createCustomers();

    // Create products (needed for orders)
    this.products = await this.createProducts();

    // Create orders (needs both customers and products)
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

  // Specific helper methods for different test scenarios
  getCustomerWithManyOrders(): Customer {
    // Returns customer with multiple orders for loyalty testing
    return this.customers[0]; // John Doe with 4 orders
  }

  getHighTierLoyaltyCustomer(): Customer {
    // Returns VIP customer for high-tier loyalty testing
    return this.customers[3]; // Alice VIP
  }

  // Customer creation - customers needed for loyalty tests
  private async createCustomers(): Promise<Customer[]> {
    const customers = [
      // Customer 0: John Doe with multiple orders for loyalty testing
      this.customerRepository.create({
        name: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        address: "123 Main St",
      }),
      // Customer 1: Jane Smith
      this.customerRepository.create({
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "987-654-3210",
        address: "456 Oak Ave",
      }),
      // Customer 2: Bob Johnson for progressive loyalty testing (starts with 0 orders)
      this.customerRepository.create({
        name: "Bob Johnson",
        email: "bob@example.com",
        phone: "555-555-5555",
        address: "789 Pine Rd",
      }),
      // Customer 3: Alice VIP for high-tier loyalty testing
      this.customerRepository.create({
        name: "Alice VIP",
        email: "alice.vip@example.com",
        phone: "111-111-1111",
        address: "999 Premium Ave",
      }),
      // Customer 4: Charlie Test for progressive loyalty testing
      this.customerRepository.create({
        name: "Charlie Test",
        email: "charlie.test@example.com",
        phone: "222-222-2222",
        address: "123 Test Avenue",
      }),
    ];

    return await this.customerRepository.save(customers);
  }

  // Product creation - products needed for loyalty tests
  private async createProducts(): Promise<Product[]> {
    const products = [
      // Products 0-4: Core products for basic functionality
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
    ];

    return await this.productRepository.save(products);
  }

  // Order creation - orders needed for loyalty testing
  private async createOrders(): Promise<Order[]> {
    // Create dates for the orders - all within the last month for loyalty discount calculation
    const now = new Date();
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(now.getDate() - 5);

    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(now.getDate() - 10);

    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(now.getDate() - 15);

    const twentyDaysAgo = new Date(now);
    twentyDaysAgo.setDate(now.getDate() - 20);

    const orders = [
      // John Doe's orders (first customer - has 4 orders for loyalty testing)
      // Using products 0, 2, 3, 4 (leaving products 1 free for other tests)
      this.orderRepository.create({
        customerId: this.customers[0].id,
        customer: this.customers[0],
        products: [this.products[0], this.products[3]], // Margherita Pizza + Garlic Bread
        totalAmount: 17.98,
        status: OrderStatus.DELIVERED,
        notes: "Extra cheese please",
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
      }),
      this.orderRepository.create({
        customerId: this.customers[0].id,
        customer: this.customers[0],
        products: [this.products[2], this.products[4]], // Caesar Salad + Tiramisu
        totalAmount: 16.98,
        status: OrderStatus.DELIVERED,
        createdAt: fifteenDaysAgo,
        updatedAt: fifteenDaysAgo,
      }),
      this.orderRepository.create({
        customerId: this.customers[0].id,
        customer: this.customers[0],
        products: [this.products[0], this.products[2]], // Margherita Pizza + Caesar Salad
        totalAmount: 21.98,
        status: OrderStatus.DELIVERED,
        createdAt: twentyDaysAgo,
        updatedAt: twentyDaysAgo,
      }),
      this.orderRepository.create({
        customerId: this.customers[0].id,
        customer: this.customers[0],
        products: [this.products[4]], // Tiramisu only
        totalAmount: 7.99,
        status: OrderStatus.DELIVERED,
        createdAt: fiveDaysAgo,
        updatedAt: fiveDaysAgo,
      }),

      // Bob Johnson's order (customer[2]) - give him 1 existing order so when test adds 5 more, he'll have 6 total for 10% discount
      this.orderRepository.create({
        customerId: this.customers[2].id,
        customer: this.customers[2], // Bob Johnson
        products: [this.products[0]], // Margherita Pizza
        totalAmount: 12.99,
        status: OrderStatus.DELIVERED,
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
      }),

      // Charlie Test's order (customer[4]) - give him 1 existing order so when test creates 3 more, the 4th will get 5% discount
      this.orderRepository.create({
        customerId: this.customers[4].id,
        customer: this.customers[4], // Charlie Test
        products: [this.products[0]], // Margherita Pizza
        totalAmount: 12.99,
        status: OrderStatus.DELIVERED,
        createdAt: fiveDaysAgo,
        updatedAt: fiveDaysAgo,
      }),

      // Alice VIP's orders (many orders for high-tier loyalty testing)
      // Using products 0, 3 only to keep others free
      this.orderRepository.create({
        customerId: this.customers[3].id,
        customer: this.customers[3], // Alice VIP
        products: [this.products[0]], // Margherita Pizza
        totalAmount: 12.99,
        status: OrderStatus.DELIVERED,
        createdAt: fiveDaysAgo,
        updatedAt: fiveDaysAgo,
      }),
      this.orderRepository.create({
        customerId: this.customers[3].id,
        customer: this.customers[3],
        products: [this.products[3]], // Garlic Bread
        totalAmount: 4.99,
        status: OrderStatus.DELIVERED,
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
      }),
    ];

    return await this.orderRepository.save(orders);
  }
}
