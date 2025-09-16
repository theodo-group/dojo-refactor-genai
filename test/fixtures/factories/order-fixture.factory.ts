import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order, OrderStatus } from "../../../src/entities/order.entity";
import { Customer } from "../../../src/entities/customer.entity";
import { Product } from "../../../src/entities/product.entity";
import { FixtureBuilder } from "../base/fixture-builder.interface";

export interface OrderOptions {
  customer?: Customer;
  customerId?: string;
  products?: Product[];
  productIds?: string[];
  totalAmount?: number;
  status?: OrderStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CompletedOrdersOptions {
  customerId: string;
  count: number;
  totalAmounts?: number[];
  products?: Product[];
  daysAgoRange?: { min: number; max: number };
}

export class OrderFixtureFactory implements FixtureBuilder<Order> {
  private repository: Repository<Order>;
  private customerRepository: Repository<Customer>;
  private productRepository: Repository<Product>;
  private createdOrders: Order[] = [];

  constructor(app: INestApplication) {
    this.repository = app.get(getRepositoryToken(Order));
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
  }

  async build(overrides: OrderOptions = {}): Promise<Order> {
    let customer = overrides.customer;
    if (!customer && overrides.customerId) {
      customer = await this.customerRepository.findOne({ where: { id: overrides.customerId } });
    }
    if (!customer) {
      throw new Error("Customer is required to create an order");
    }

    let products = overrides.products;
    if (!products && overrides.productIds?.length) {
      products = await this.productRepository.findByIds(overrides.productIds);
    }
    if (!products || products.length === 0) {
      throw new Error("At least one product is required to create an order");
    }

    const totalAmount = overrides.totalAmount ?? products.reduce((sum, p) => sum + p.price, 0);

    const orderData = {
      customer,
      customerId: customer.id,
      products,
      totalAmount,
      status: overrides.status || OrderStatus.PENDING,
      notes: overrides.notes || "",
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    };

    const order = this.repository.create(orderData);
    const savedOrder = await this.repository.save(order);
    this.createdOrders.push(savedOrder);
    return savedOrder;
  }

  async buildMany(count: number, overrides: OrderOptions = {}): Promise<Order[]> {
    const orders: Order[] = [];
    for (let i = 0; i < count; i++) {
      orders.push(await this.build(overrides));
    }
    return orders;
  }

  async createPendingOrder(options: OrderOptions): Promise<Order> {
    return this.build({
      ...options,
      status: OrderStatus.PENDING,
    });
  }

  async createPreparingOrder(options: OrderOptions): Promise<Order> {
    return this.build({
      ...options,
      status: OrderStatus.PREPARING,
    });
  }

  async createReadyOrder(options: OrderOptions): Promise<Order> {
    return this.build({
      ...options,
      status: OrderStatus.READY,
    });
  }

  async createDeliveredOrder(options: OrderOptions): Promise<Order> {
    return this.build({
      ...options,
      status: OrderStatus.DELIVERED,
    });
  }

  async createCompletedOrders(options: CompletedOrdersOptions): Promise<Order[]> {
    const { customerId, count, totalAmounts, products, daysAgoRange = { min: 5, max: 30 } } = options;

    const customer = await this.customerRepository.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new Error(`Customer with id ${customerId} not found`);
    }

    const orders: Order[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(Math.random() * (daysAgoRange.max - daysAgoRange.min + 1)) + daysAgoRange.min;
      const orderDate = new Date(now);
      orderDate.setDate(now.getDate() - daysAgo);

      const orderAmount = totalAmounts?.[i] ?? 15.99 + (Math.random() * 20); // Random amount between 15.99 and 35.99
      const orderProducts = products?.slice(i % (products.length || 1), (i % (products.length || 1)) + 1);

      if (!orderProducts || orderProducts.length === 0) {
        throw new Error("Products are required to create completed orders");
      }

      const order = await this.build({
        customer,
        products: orderProducts,
        totalAmount: parseFloat(orderAmount.toFixed(2)),
        status: OrderStatus.DELIVERED,
        notes: `Historical order ${i + 1}`,
        createdAt: orderDate,
        updatedAt: orderDate,
      });

      orders.push(order);
    }

    return orders;
  }

  async createRecentModifiableOrder(options: OrderOptions): Promise<Order> {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago

    return this.build({
      ...options,
      status: OrderStatus.PENDING,
      notes: "Recent order for modification testing",
      createdAt: twoMinutesAgo,
      updatedAt: twoMinutesAgo,
    });
  }

  async createOrdersForLoyaltyQualification(customer: Customer, products: Product[]): Promise<Order[]> {
    const now = new Date();
    const orderDates = [
      new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
    ];

    const orders: Order[] = [];

    for (let i = 0; i < 4; i++) {
      const orderProducts = products.slice(i % products.length, (i % products.length) + 1);
      const totalAmount = orderProducts.reduce((sum, p) => sum + p.price, 0);

      const order = await this.build({
        customer,
        products: orderProducts,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        status: OrderStatus.DELIVERED,
        notes: `Loyalty qualification order ${i + 1}`,
        createdAt: orderDates[i],
        updatedAt: orderDates[i],
      });

      orders.push(order);
    }

    return orders;
  }

  async reset(): Promise<void> {
    this.createdOrders = [];
  }

  getCreatedOrders(): Order[] {
    return [...this.createdOrders];
  }
}