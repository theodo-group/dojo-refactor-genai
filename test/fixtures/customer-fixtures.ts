import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

export class CustomerFixtures {
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

    // Create products first (needed for orders)
    this.products = await this.createProducts();

    // Create customers
    this.customers = await this.createCustomers();

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

  // Specific helper methods for different test scenarios
  getUpdateTestCustomers(): Customer[] {
    // Returns customers 5, 6, 7 specifically for update/delete tests
    return this.customers.slice(5, 8);
  }

  getPartialUpdateTestCustomer(): Customer {
    // Returns customer 6 specifically for partial update tests
    return this.customers[6];
  }

  // Customer creation
  private async createCustomers(): Promise<Customer[]> {
    const customers = [
      // Customers 0-2: Core customers for basic functionality
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

      // Customer 3: VIP customer for basic testing
      this.customerRepository.create({
        name: "Alice VIP",
        email: "alice.vip@example.com",
        phone: "111-111-1111",
        address: "999 Premium Ave",
      }),

      // Customer 4: Customer for testing
      this.customerRepository.create({
        name: "Charlie Test",
        email: "charlie.test@example.com",
        phone: "222-222-2222",
        address: "123 Test Avenue",
      }),

      // Customers 5-7: Customers specifically for update/delete tests (isolated)
      this.customerRepository.create({
        name: "Update Test Customer",
        email: "update.test@example.com",
        phone: "333-333-3333",
        address: "456 Update St",
      }),
      this.customerRepository.create({
        name: "Partial Update Customer",
        email: "partial.update@example.com",
        phone: "444-444-4444",
        address: "789 Partial Ave",
      }),
      this.customerRepository.create({
        name: "Delete Test Customer",
        email: "delete.test@example.com",
        phone: "555-555-5556",
        address: "321 Delete Rd",
      }),

      // Customer 8: Customer for concurrent operation testing
      this.customerRepository.create({
        name: "Concurrent Test Customer",
        email: "concurrent.test@example.com",
        phone: "666-666-6666",
        address: "987 Concurrent Blvd",
      }),
    ];

    return await this.customerRepository.save(customers);
  }

  // Product creation - minimal products needed for customer tests
  private async createProducts(): Promise<Product[]> {
    const products = [
      this.productRepository.create({
        name: "Margherita Pizza",
        description: "Classic pizza with tomato sauce and mozzarella",
        price: 12.99,
        category: "pizza",
      }),
      this.productRepository.create({
        name: "Caesar Salad",
        description: "Fresh salad with romaine lettuce, croutons, and Caesar dressing",
        price: 8.99,
        category: "salad",
      }),
    ];

    return await this.productRepository.save(products);
  }

  // Order creation - minimal orders needed for customer tests with order history
  private async createOrders(): Promise<Order[]> {
    const orders = [
      // Create an order for John Doe so the order history test passes
      this.orderRepository.create({
        customerId: this.customers[0].id,
        customer: this.customers[0],
        products: [this.products[0]], // Margherita Pizza
        totalAmount: 12.99,
        status: OrderStatus.DELIVERED,
        notes: "Test order for customer history",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      }),
    ];

    return await this.orderRepository.save(orders);
  }
}
