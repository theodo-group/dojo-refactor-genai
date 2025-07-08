import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "../../src/entities/product.entity";
import { Customer } from "../../src/entities/customer.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

export class ProductFixtures {
  private app: INestApplication;
  private productRepository: Repository<Product>;
  private customerRepository: Repository<Customer>;
  private orderRepository: Repository<Order>;

  // Cached fixtures for reuse across tests
  private products: Product[] = [];
  private customers: Customer[] = [];
  private orders: Order[] = [];

  constructor(app: INestApplication) {
    this.app = app;
    this.productRepository = app.get(getRepositoryToken(Product));
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  async load(): Promise<void> {
    // Clear existing data first
    await this.clear();

    // Create customers first (needed for orders)
    this.customers = await this.createCustomers();

    // Create products
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
    this.products = [];
    this.customers = [];
    this.orders = [];
  }

  // Helper methods to access fixture data
  getProducts(): Product[] {
    return this.products;
  }

  // Specific helper methods for different test scenarios
  getDeletableProducts(): Product[] {
    // Returns products 6, 7, 8 that are NOT in any orders
    return this.products.slice(6, 9);
  }

  getProductsInActiveOrders(): Product[] {
    // Returns products that are currently in PENDING, PREPARING, or READY orders
    return [this.products[1], this.products[2]]; // Pepperoni Pizza (PREPARING), Caesar Salad (PENDING)
  }

  getUpdateTestProducts(): Product[] {
    // Returns products 9, 10, 11 specifically for update tests
    return this.products.slice(9, 12);
  }

  // Customer creation - minimal customers needed for product tests
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
    ];

    return await this.customerRepository.save(customers);
  }

  // Product creation
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

      // Products 6-8: Products specifically for deletion tests (NOT in any orders)
      this.productRepository.create({
        name: "Deletable Product 1",
        description: "Product that can be safely deleted - not in any orders",
        price: 9.99,
        category: "test",
      }),
      this.productRepository.create({
        name: "Deletable Product 2",
        description: "Another product that can be safely deleted",
        price: 11.99,
        category: "test",
      }),
      this.productRepository.create({
        name: "Soft Delete Test Product",
        description: "Product used for soft delete testing",
        price: 6.99,
        category: "test",
      }),

      // Products 9-11: Products for partial update tests
      this.productRepository.create({
        name: "Update Test Pizza",
        description: "Pizza used for testing partial updates",
        price: 13.99,
        category: "pizza",
      }),
      this.productRepository.create({
        name: "Category Change Test",
        description: "Product used for testing category changes",
        price: 10.99,
        category: "original-category",
      }),
      this.productRepository.create({
        name: "Price Validation Test",
        description: "Product used for price validation testing",
        price: 5.99,
        category: "validation",
      }),
    ];

    return await this.productRepository.save(products);
  }

  // Order creation - minimal orders needed to test product deletion prevention
  private async createOrders(): Promise<Order[]> {
    const orders = [
      // Order with Pepperoni Pizza in PREPARING status for "products in active orders" test
      this.orderRepository.create({
        customerId: this.customers[1].id,
        customer: this.customers[1], // Jane Smith
        products: [this.products[1]], // Pepperoni Pizza - this will be in active order
        totalAmount: 14.99,
        status: OrderStatus.PREPARING, // Active status
        notes: "Order to test product deletion prevention",
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        updatedAt: new Date(Date.now() - 30 * 60 * 1000),
      }),

      // Order with Caesar Salad in PENDING status
      this.orderRepository.create({
        customerId: this.customers[0].id,
        customer: this.customers[0], // John Doe
        products: [this.products[2]], // Caesar Salad
        totalAmount: 8.99,
        status: OrderStatus.PENDING, // Active status
        notes: "Another order to test product deletion prevention",
        createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        updatedAt: new Date(Date.now() - 15 * 60 * 1000),
      }),
    ];

    return await this.orderRepository.save(orders);
  }
}
