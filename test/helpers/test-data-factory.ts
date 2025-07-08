import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

export class TestDataFactory {
  private app: INestApplication;
  private customerRepository: Repository<Customer>;
  private productRepository: Repository<Product>;
  private orderRepository: Repository<Order>;

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  // Customer factory methods
  async createCustomer(overrides: Partial<Customer> = {}): Promise<Customer> {
    const defaultCustomer = {
      name: "Test Customer",
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      phone: "123-456-7890",
      address: "123 Test St",
      isActive: true,
      ...overrides,
    };

    const customer = this.customerRepository.create(defaultCustomer);
    return await this.customerRepository.save(customer);
  }

  async createCustomers(
    count: number,
    overrides: Partial<Customer> = {}
  ): Promise<Customer[]> {
    const customers: Customer[] = [];
    for (let i = 0; i < count; i++) {
      const customer = await this.createCustomer({
        name: `Test Customer ${i + 1}`,
        email: `test-${Date.now()}-${i}@example.com`,
        ...overrides,
      });
      customers.push(customer);
    }
    return customers;
  }

  // Product factory methods
  async createProduct(overrides: Partial<Product> = {}): Promise<Product> {
    const defaultProduct = {
      name: "Test Product",
      description: "Test product description",
      price: 10.99,
      category: "test",
      isAvailable: true,
      ...overrides,
    };

    const product = this.productRepository.create(defaultProduct);
    return await this.productRepository.save(product);
  }

  async createProducts(
    count: number,
    overrides: Partial<Product> = {}
  ): Promise<Product[]> {
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
      const product = await this.createProduct({
        name: `Test Product ${i + 1}`,
        price: 10.99 + i,
        ...overrides,
      });
      products.push(product);
    }
    return products;
  }

  // Order factory methods
  async createOrder(
    customer: Customer,
    products: Product[],
    overrides: Partial<Order> = {}
  ): Promise<Order> {
    const totalAmount = products.reduce(
      (sum, product) => sum + Number(product.price),
      0
    );

    const defaultOrder = {
      customerId: customer.id,
      customer,
      products,
      totalAmount,
      status: OrderStatus.PENDING,
      notes: "Test order",
      ...overrides,
    };

    const order = this.orderRepository.create(defaultOrder);
    return await this.orderRepository.save(order);
  }

  async createOrderWithHistory(
    customer: Customer,
    orderCount: number,
    status: OrderStatus = OrderStatus.DELIVERED
  ): Promise<Order[]> {
    const orders: Order[] = [];

    for (let i = 0; i < orderCount; i++) {
      const product = await this.createProduct({
        name: `History Product ${i + 1}`,
        price: 15.99,
      });

      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - (orderCount - i)); // Spread orders over time

      const order = await this.createOrder(customer, [product], {
        status,
        createdAt: orderDate,
        updatedAt: orderDate,
      });

      orders.push(order);
    }

    return orders;
  }

  // Specialized factory methods for common test scenarios
  async createCustomerWithOrders(
    orderCount: number
  ): Promise<{ customer: Customer; orders: Order[] }> {
    const customer = await this.createCustomer({
      name: "Customer with Orders",
    });

    const orders = await this.createOrderWithHistory(customer, orderCount);

    return { customer, orders };
  }

  async createProductsForDeletion(count: number = 3): Promise<Product[]> {
    return await this.createProducts(count, {
      category: "deletable",
      name: "Deletable Product",
    });
  }

  async createUnavailableProduct(): Promise<Product> {
    return await this.createProduct({
      name: "Unavailable Product",
      isAvailable: false,
      category: "unavailable",
    });
  }

  async createPizzaProducts(): Promise<Product[]> {
    return await Promise.all([
      this.createProduct({
        name: "Margherita Pizza",
        description: "Classic pizza with tomato sauce and mozzarella",
        price: 12.99,
        category: "pizza",
      }),
      this.createProduct({
        name: "Pepperoni Pizza",
        description: "Pizza with tomato sauce, mozzarella, and pepperoni",
        price: 14.99,
        category: "pizza",
      }),
    ]);
  }

  // Cleanup methods
  async clearAllData(): Promise<void> {
    // Delete in the correct order to respect foreign key constraints
    await this.orderRepository.query("TRUNCATE TABLE order_products CASCADE");
    await this.orderRepository.query("TRUNCATE TABLE orders CASCADE");
    await this.productRepository.query("TRUNCATE TABLE products CASCADE");
    await this.customerRepository.query("TRUNCATE TABLE customers CASCADE");
  }

  async clearCustomers(): Promise<void> {
    await this.customerRepository.query(
      "DELETE FROM customers WHERE email LIKE 'test-%'"
    );
  }

  async clearProducts(): Promise<void> {
    await this.productRepository.query(
      "DELETE FROM products WHERE category = 'test' OR category = 'deletable' OR category = 'unavailable'"
    );
  }

  async clearOrders(): Promise<void> {
    await this.orderRepository.query(
      "DELETE FROM order_products WHERE order_id IN (SELECT id FROM orders WHERE notes = 'Test order')"
    );
    await this.orderRepository.query(
      "DELETE FROM orders WHERE notes = 'Test order'"
    );
  }
}
