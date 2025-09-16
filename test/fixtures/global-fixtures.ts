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

  // Specific helper methods for different test scenarios
  getDeletableProducts(): Product[] {
    // Returns products 6, 7, 8 that are NOT in any orders
    return this.products.slice(6, 9);
  }

  getProductsInActiveOrders(): Product[] {
    // Returns products that are currently in PENDING, PREPARING, or READY orders
    return [this.products[1], this.products[2]]; // Pepperoni Pizza (PREPARING), Caesar Salad (PENDING)
  }

  getUpdateTestCustomers(): Customer[] {
    // Returns customers 5, 6, 7 specifically for update/delete tests
    return this.customers.slice(5, 8);
  }

  getPartialUpdateTestCustomer(): Customer {
    // Returns customer 6 specifically for partial update tests
    return this.customers[6];
  }

  getUpdateTestProducts(): Product[] {
    // Returns products 9, 10, 11 specifically for update tests
    return this.products.slice(9, 12);
  }

  getRecentOrderForModification(): Order {
    // Returns the order created within the last 5 minutes for modification testing
    return this.orders.find(
      (order) =>
        order.status === OrderStatus.PENDING &&
        order.customer.id === this.customers[4].id
    );
  }

  getCustomerWithManyOrders(): Customer {
    // Returns customer with multiple orders for loyalty testing
    return this.customers[0]; // John Doe with 4 orders
  }

  getHighTierLoyaltyCustomer(): Customer {
    // Returns VIP customer for high-tier loyalty testing
    return this.customers[3]; // Alice VIP
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

      // Customer 3: VIP customer for loyalty testing with many orders
      this.customerRepository.create({
        name: "Alice VIP",
        email: "alice.vip@example.com",
        phone: "111-111-1111",
        address: "999 Premium Ave",
      }),

      // Customer 4: Customer for progressive loyalty testing
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
      // Using products 0, 2, 3, 4 (leaving products 1 and 6-11 free for deletion/update tests)
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
        status: OrderStatus.DELIVERED, // Changed from READY to DELIVERED to avoid conflicts
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

      // Order with Pepperoni Pizza in PREPARING status for "products in active orders" test
      this.orderRepository.create({
        customerId: this.customers[1].id,
        customer: this.customers[1], // Jane Smith
        products: [this.products[1]], // Pepperoni Pizza - this will be in active order
        totalAmount: 14.99,
        status: OrderStatus.PREPARING, // Active status
        notes: "Order to test product deletion prevention",
        createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
        updatedAt: new Date(now.getTime() - 30 * 60 * 1000),
      }),
    ];

    return await this.orderRepository.save(orders);
  }
}
