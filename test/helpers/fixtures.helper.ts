import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

export interface CustomerOverrides {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}

export interface ProductOverrides {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  isAvailable?: boolean;
}

export interface OrderOverrides {
  totalAmount?: number;
  status?: OrderStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class FixturesHelper {
  private customerRepository: Repository<Customer>;
  private productRepository: Repository<Product>;
  private orderRepository: Repository<Order>;

  constructor(private app: INestApplication) {
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  // Customer factories
  async createCustomer(overrides: CustomerOverrides = {}): Promise<Customer> {
    const timestamp = Date.now();
    const customer = this.customerRepository.create({
      name: overrides.name || `Test Customer ${timestamp}`,
      email: overrides.email || `test${timestamp}@example.com`,
      phone:
        overrides.phone ||
        `555-${Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0")}`,
      address:
        overrides.address || `${Math.floor(Math.random() * 1000)} Test St`,
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    });
    return await this.customerRepository.save(customer);
  }

  async createCustomers(
    count: number,
    overrides: CustomerOverrides = {}
  ): Promise<Customer[]> {
    const customers: Customer[] = [];
    for (let i = 0; i < count; i++) {
      const customer = await this.createCustomer({
        ...overrides,
        name: overrides.name ? `${overrides.name} ${i + 1}` : undefined,
        email: overrides.email ? `${i + 1}.${overrides.email}` : undefined,
      });
      customers.push(customer);
    }
    return customers;
  }

  // Product factories
  async createProduct(overrides: ProductOverrides = {}): Promise<Product> {
    const timestamp = Date.now();
    const product = this.productRepository.create({
      name: overrides.name || `Test Product ${timestamp}`,
      description:
        overrides.description || `Description for test product ${timestamp}`,
      price: overrides.price !== undefined ? overrides.price : 10.99,
      category: overrides.category || "test",
      isAvailable:
        overrides.isAvailable !== undefined ? overrides.isAvailable : true,
    });
    return await this.productRepository.save(product);
  }

  async createProducts(
    count: number,
    overrides: ProductOverrides = {}
  ): Promise<Product[]> {
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
      const product = await this.createProduct({
        ...overrides,
        name: overrides.name ? `${overrides.name} ${i + 1}` : undefined,
        price: overrides.price !== undefined ? overrides.price + i : undefined,
      });
      products.push(product);
    }
    return products;
  }

  // Order factories
  async createOrder(
    customer: Customer,
    products: Product[],
    overrides: OrderOverrides = {}
  ): Promise<Order> {
    const totalAmount =
      overrides.totalAmount !== undefined
        ? overrides.totalAmount
        : products.reduce((sum, p) => sum + parseFloat(p.price.toString()), 0);

    const order = this.orderRepository.create({
      customerId: customer.id,
      customer: customer,
      products: products,
      totalAmount: totalAmount,
      status: overrides.status || OrderStatus.PENDING,
      notes: overrides.notes || "",
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    });
    return await this.orderRepository.save(order);
  }

  async createOrders(
    customer: Customer,
    products: Product[],
    count: number,
    overrides: OrderOverrides = {}
  ): Promise<Order[]> {
    const orders: Order[] = [];
    for (let i = 0; i < count; i++) {
      const order = await this.createOrder(customer, products, {
        ...overrides,
        notes: overrides.notes
          ? `${overrides.notes} ${i + 1}`
          : `Order ${i + 1}`,
      });
      orders.push(order);
    }
    return orders;
  }

  // Convenience methods for common test scenarios
  async createCustomerWithOrders(
    orderCount: number,
    customerOverrides: CustomerOverrides = {},
    productOverrides: ProductOverrides = {},
    orderOverrides: OrderOverrides = {}
  ): Promise<{ customer: Customer; products: Product[]; orders: Order[] }> {
    const customer = await this.createCustomer(customerOverrides);
    const products = await this.createProducts(2, productOverrides);
    const orders = await this.createOrders(
      customer,
      products,
      orderCount,
      orderOverrides
    );
    return { customer, products, orders };
  }

  async createOrderWithHistory(
    customer: Customer,
    daysAgo: number
  ): Promise<Order> {
    const product = await this.createProduct();
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return await this.createOrder(customer, [product], {
      status: OrderStatus.DELIVERED,
      createdAt: date,
      updatedAt: date,
    });
  }
}
