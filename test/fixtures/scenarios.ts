import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

export interface ScenarioData {
  customers: Customer[];
  products: Product[];
  orders: Order[];
}

export class GlobalFixtures {
  private app: INestApplication;
  private customerRepository: Repository<Customer>;
  private productRepository: Repository<Product>;
  private orderRepository: Repository<Order>;

  // Cache for loaded scenarios to avoid duplicate loading
  private loadedScenarios = new Set<string>();
  private scenarioData: Map<string, ScenarioData> = new Map();

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  async clear(): Promise<void> {
    // Delete in the correct order to respect foreign key constraints
    await this.orderRepository.query("TRUNCATE TABLE order_products CASCADE");
    await this.orderRepository.query("TRUNCATE TABLE orders CASCADE");
    await this.productRepository.query("TRUNCATE TABLE products CASCADE");
    await this.customerRepository.query("TRUNCATE TABLE customers CASCADE");

    // Reset loaded scenarios
    this.loadedScenarios.clear();
    this.scenarioData.clear();
  }

  // Scenario-based API methods
  async basicOrderScenario(): Promise<ScenarioData> {
    const scenarioKey = 'basicOrder';
    if (this.loadedScenarios.has(scenarioKey)) {
      return this.scenarioData.get(scenarioKey)!;
    }

    // Create basic customers
    const customers = await this.customerRepository.save([
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
    ]);

    // Create basic products
    const products = await this.productRepository.save([
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
    ]);

    // Create basic orders
    const orders = await this.orderRepository.save([
      this.orderRepository.create({
        customerId: customers[0].id,
        customer: customers[0],
        products: [products[0]],
        totalAmount: 12.99,
        status: OrderStatus.PENDING,
        notes: "Basic order",
      }),
    ]);

    const data = { customers, products, orders };
    this.scenarioData.set(scenarioKey, data);
    this.loadedScenarios.add(scenarioKey);
    return data;
  }

  async loyalCustomerScenario(): Promise<ScenarioData> {
    const scenarioKey = 'loyalCustomer';
    if (this.loadedScenarios.has(scenarioKey)) {
      return this.scenarioData.get(scenarioKey)!;
    }

    // Create loyal customer with order history
    const customers = await this.customerRepository.save([
      this.customerRepository.create({
        name: "John Loyal",
        email: "john.loyal@example.com",
        phone: "123-456-7890",
        address: "123 Loyalty St",
      }),
    ]);

    // Create products for loyal customer orders
    const products = await this.productRepository.save([
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
      this.productRepository.create({
        name: "Tiramisu",
        description: "Classic Italian dessert",
        price: 7.99,
        category: "dessert",
      }),
    ]);

    // Create multiple orders for loyalty testing
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

    const orders = await this.orderRepository.save([
      this.orderRepository.create({
        customerId: customers[0].id,
        customer: customers[0],
        products: [products[0]],
        totalAmount: 12.99,
        status: OrderStatus.DELIVERED,
        createdAt: twentyDaysAgo,
        updatedAt: twentyDaysAgo,
      }),
      this.orderRepository.create({
        customerId: customers[0].id,
        customer: customers[0],
        products: [products[1]],
        totalAmount: 8.99,
        status: OrderStatus.DELIVERED,
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
      }),
      this.orderRepository.create({
        customerId: customers[0].id,
        customer: customers[0],
        products: [products[2]],
        totalAmount: 7.99,
        status: OrderStatus.DELIVERED,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      }),
    ]);

    const data = { customers, products, orders };
    this.scenarioData.set(scenarioKey, data);
    this.loadedScenarios.add(scenarioKey);
    return data;
  }

  async orderStatusScenario(): Promise<ScenarioData> {
    const scenarioKey = 'orderStatus';
    if (this.loadedScenarios.has(scenarioKey)) {
      return this.scenarioData.get(scenarioKey)!;
    }

    // Create customers for status testing
    const customers = await this.customerRepository.save([
      this.customerRepository.create({
        name: "Status Test Customer",
        email: "status@example.com",
        phone: "555-0001",
        address: "123 Status St",
      }),
    ]);

    // Create products for status testing
    const products = await this.productRepository.save([
      this.productRepository.create({
        name: "Status Test Pizza",
        description: "Pizza for status testing",
        price: 15.99,
        category: "pizza",
      }),
    ]);

    // Create orders with different statuses
    const orders = await this.orderRepository.save([
      this.orderRepository.create({
        customerId: customers[0].id,
        customer: customers[0],
        products: [products[0]],
        totalAmount: 15.99,
        status: OrderStatus.PENDING,
        notes: "Pending order for status testing",
      }),
      this.orderRepository.create({
        customerId: customers[0].id,
        customer: customers[0],
        products: [products[0]],
        totalAmount: 15.99,
        status: OrderStatus.PREPARING,
        notes: "Preparing order for status testing",
      }),
      this.orderRepository.create({
        customerId: customers[0].id,
        customer: customers[0],
        products: [products[0]],
        totalAmount: 15.99,
        status: OrderStatus.DELIVERED,
        notes: "Delivered order for status testing",
      }),
    ]);

    const data = { customers, products, orders };
    this.scenarioData.set(scenarioKey, data);
    this.loadedScenarios.add(scenarioKey);
    return data;
  }

  async productAvailabilityScenario(): Promise<ScenarioData> {
    const scenarioKey = 'productAvailability';
    if (this.loadedScenarios.has(scenarioKey)) {
      return this.scenarioData.get(scenarioKey)!;
    }

    // Create customer for availability testing
    const customers = await this.customerRepository.save([
      this.customerRepository.create({
        name: "Availability Test Customer",
        email: "availability@example.com",
        phone: "555-0002",
        address: "123 Availability St",
      }),
    ]);

    // Create products with different availability
    const products = await this.productRepository.save([
      this.productRepository.create({
        name: "Available Product",
        description: "This product is available",
        price: 10.99,
        category: "test",
        isAvailable: true,
      }),
      this.productRepository.create({
        name: "Unavailable Product",
        description: "This product is not available",
        price: 12.99,
        category: "test",
        isAvailable: false,
      }),
    ]);

    const data = { customers, products, orders: [] };
    this.scenarioData.set(scenarioKey, data);
    this.loadedScenarios.add(scenarioKey);
    return data;
  }

  async recentOrderScenario(): Promise<ScenarioData> {
    const scenarioKey = 'recentOrder';
    if (this.loadedScenarios.has(scenarioKey)) {
      return this.scenarioData.get(scenarioKey)!;
    }

    // Create customer for recent order testing
    const customers = await this.customerRepository.save([
      this.customerRepository.create({
        name: "Recent Order Customer",
        email: "recent@example.com",
        phone: "555-0003",
        address: "123 Recent St",
      }),
    ]);

    // Create product for recent order
    const products = await this.productRepository.save([
      this.productRepository.create({
        name: "Recent Order Pizza",
        description: "Pizza for recent order testing",
        price: 13.99,
        category: "pizza",
      }),
    ]);

    // Create recent order (within modification window)
    const now = new Date();
    const orders = await this.orderRepository.save([
      this.orderRepository.create({
        customerId: customers[0].id,
        customer: customers[0],
        products: [products[0]],
        totalAmount: 13.99,
        status: OrderStatus.PENDING,
        notes: "Recent order for modification testing",
        createdAt: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago
        updatedAt: new Date(now.getTime() - 2 * 60 * 1000),
      }),
    ]);

    const data = { customers, products, orders };
    this.scenarioData.set(scenarioKey, data);
    this.loadedScenarios.add(scenarioKey);
    return data;
  }

  async multipleCustomersScenario(): Promise<ScenarioData> {
    const scenarioKey = 'multipleCustomers';
    if (this.loadedScenarios.has(scenarioKey)) {
      return this.scenarioData.get(scenarioKey)!;
    }

    // Create multiple customers for testing
    const customers = await this.customerRepository.save([
      this.customerRepository.create({
        name: "Customer One",
        email: "customer1@example.com",
        phone: "555-0101",
        address: "123 First St",
      }),
      this.customerRepository.create({
        name: "Customer Two",
        email: "customer2@example.com",
        phone: "555-0102",
        address: "456 Second St",
      }),
      this.customerRepository.create({
        name: "Customer Three",
        email: "customer3@example.com",
        phone: "555-0103",
        address: "789 Third St",
      }),
    ]);

    // Create products for multiple customer testing
    const products = await this.productRepository.save([
      this.productRepository.create({
        name: "Multi Customer Pizza",
        description: "Pizza for multiple customer testing",
        price: 16.99,
        category: "pizza",
      }),
      this.productRepository.create({
        name: "Multi Customer Salad",
        description: "Salad for multiple customer testing",
        price: 9.99,
        category: "salad",
      }),
    ]);

    // Create orders for different customers
    const orders = await this.orderRepository.save([
      this.orderRepository.create({
        customerId: customers[0].id,
        customer: customers[0],
        products: [products[0]],
        totalAmount: 16.99,
        status: OrderStatus.PENDING,
        notes: "Order for customer one",
      }),
      this.orderRepository.create({
        customerId: customers[1].id,
        customer: customers[1],
        products: [products[1]],
        totalAmount: 9.99,
        status: OrderStatus.PREPARING,
        notes: "Order for customer two",
      }),
    ]);

    const data = { customers, products, orders };
    this.scenarioData.set(scenarioKey, data);
    this.loadedScenarios.add(scenarioKey);
    return data;
  }

  async largeOrderScenario(): Promise<ScenarioData> {
    const scenarioKey = 'largeOrder';
    if (this.loadedScenarios.has(scenarioKey)) {
      return this.scenarioData.get(scenarioKey)!;
    }

    // Create customer for large order testing
    const customers = await this.customerRepository.save([
      this.customerRepository.create({
        name: "Large Order Customer",
        email: "large@example.com",
        phone: "555-0004",
        address: "123 Large St",
      }),
    ]);

    // Create many products for large order
    const products = await this.productRepository.save([
      this.productRepository.create({
        name: "Large Order Pizza 1",
        description: "Pizza 1 for large order",
        price: 12.99,
        category: "pizza",
      }),
      this.productRepository.create({
        name: "Large Order Pizza 2",
        description: "Pizza 2 for large order",
        price: 14.99,
        category: "pizza",
      }),
      this.productRepository.create({
        name: "Large Order Salad",
        description: "Salad for large order",
        price: 8.99,
        category: "salad",
      }),
      this.productRepository.create({
        name: "Large Order Appetizer",
        description: "Appetizer for large order",
        price: 6.99,
        category: "appetizer",
      }),
      this.productRepository.create({
        name: "Large Order Dessert",
        description: "Dessert for large order",
        price: 7.99,
        category: "dessert",
      }),
    ]);

    const data = { customers, products, orders: [] };
    this.scenarioData.set(scenarioKey, data);
    this.loadedScenarios.add(scenarioKey);
    return data;
  }

  // Helper methods to get data from loaded scenarios
  getScenarioData(scenarioKey: string): ScenarioData | undefined {
    return this.scenarioData.get(scenarioKey);
  }

  getAllLoadedCustomers(): Customer[] {
    const allCustomers: Customer[] = [];
    for (const data of this.scenarioData.values()) {
      allCustomers.push(...data.customers);
    }
    return allCustomers;
  }

  getAllLoadedProducts(): Product[] {
    const allProducts: Product[] = [];
    for (const data of this.scenarioData.values()) {
      allProducts.push(...data.products);
    }
    return allProducts;
  }

  getAllLoadedOrders(): Order[] {
    const allOrders: Order[] = [];
    for (const data of this.scenarioData.values()) {
      allOrders.push(...data.orders);
    }
    return allOrders;
  }
}
