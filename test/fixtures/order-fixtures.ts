import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order, OrderStatus } from "../../src/entities/order.entity";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";

export class OrderFixtures {
  private app: INestApplication;
  private orderRepository: Repository<Order>;
  private customerRepository: Repository<Customer>;
  private productRepository: Repository<Product>;

  // Cached fixtures for reuse across tests
  private orders: Order[] = [];
  private customers: Customer[] = [];
  private products: Product[] = [];

  constructor(app: INestApplication) {
    this.app = app;
    this.orderRepository = app.get(getRepositoryToken(Order));
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
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
    this.orders = [];
    this.customers = [];
    this.products = [];
  }

  // Helper methods to access fixture data
  getOrders(): Order[] {
    return this.orders;
  }

  getCustomers(): Customer[] {
    return this.customers;
  }

  getProducts(): Product[] {
    return this.products;
  }

  // Specific helper methods for different test scenarios
  getRecentOrderForModification(): Order {
    // Returns the order created within the last 5 minutes for modification testing
    return this.orders.find(
      (order) =>
        order.status === OrderStatus.PENDING &&
        order.customer.id === this.customers[4].id
    );
  }

  // Customer creation - customers needed for order tests
  private async createCustomers(): Promise<Customer[]> {
    const customers = [
      // Customer 0: John Doe with multiple orders for analytics
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
      // Customer 2: Bob Johnson
      this.customerRepository.create({
        name: "Bob Johnson",
        email: "bob@example.com",
        phone: "555-555-5555",
        address: "789 Pine Rd",
      }),
      // Customer 3: Alice VIP
      this.customerRepository.create({
        name: "Alice VIP",
        email: "alice.vip@example.com",
        phone: "111-111-1111",
        address: "999 Premium Ave",
      }),
      // Customer 4: Charlie Test for modification testing
      this.customerRepository.create({
        name: "Charlie Test",
        email: "charlie.test@example.com",
        phone: "222-222-2222",
        address: "123 Test Avenue",
      }),
      // Customer 5: Update Test Customer - has no prior orders for loyalty discount testing
      this.customerRepository.create({
        name: "Update Test Customer",
        email: "update.test@example.com",
        phone: "333-333-3333",
        address: "456 Update St",
      }),
    ];

    return await this.customerRepository.save(customers);
  }

  // Product creation - products needed for order tests
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

      // Product 5: Unavailable product for testing
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
      // Using products 0, 2, 3, 4 (leaving products 1 and 5 free for other tests)
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
        createdAt: twentyFiveDaysAgo,
        updatedAt: twentyFiveDaysAgo,
      }),

      // Bob Johnson's order (pending status for testing) - using product 2 only
      this.orderRepository.create({
        customerId: this.customers[2].id,
        customer: this.customers[2], // Bob Johnson
        products: [this.products[2]], // Caesar Salad
        totalAmount: 8.99,
        status: OrderStatus.PENDING,
        notes: "Please deliver quickly",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),

      // Alice VIP's orders (many orders for high-tier loyalty testing)
      // Using products 0, 3 only to keep others free
      this.orderRepository.create({
        customerId: this.customers[3].id,
        customer: this.customers[3], // Alice VIP
        products: [this.products[0]], // Margherita Pizza
        totalAmount: 12.99,
        status: OrderStatus.DELIVERED,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      }),
      this.orderRepository.create({
        customerId: this.customers[3].id,
        customer: this.customers[3],
        products: [this.products[3]], // Garlic Bread
        totalAmount: 4.99,
        status: OrderStatus.DELIVERED,
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        updatedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      }),

      // Charlie Test's order for testing order modifications within time window
      this.orderRepository.create({
        customerId: this.customers[4].id,
        customer: this.customers[4], // Charlie Test
        products: [this.products[0]], // Margherita Pizza
        totalAmount: 12.99,
        status: OrderStatus.PENDING,
        notes: "Recent order for modification testing",
        createdAt: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago (within 5 minute window)
        updatedAt: new Date(now.getTime() - 2 * 60 * 1000),
      }),

      // Order with Pepperoni Pizza in PREPARING status for status transition tests
      this.orderRepository.create({
        customerId: this.customers[1].id,
        customer: this.customers[1], // Jane Smith
        products: [this.products[1]], // Pepperoni Pizza
        totalAmount: 14.99,
        status: OrderStatus.PREPARING, // Active status
        notes: "Order to test status transitions",
        createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
        updatedAt: new Date(now.getTime() - 30 * 60 * 1000),
      }),
    ];

    return await this.orderRepository.save(orders);
  }
}
