import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order, OrderStatus } from "../../src/entities/order.entity";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";

export class OrderBuilder {
  private app: INestApplication;
  private orderRepository: Repository<Order>;
  private orderData: Partial<Order> = {};

  constructor(app: INestApplication) {
    this.app = app;
    this.orderRepository = app.get(getRepositoryToken(Order));
    this.setDefaults();
  }

  private setDefaults(): this {
    this.orderData = {
      totalAmount: 0,
      status: OrderStatus.PENDING,
      notes: "",
      products: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return this;
  }

  withCustomer(customer: Customer): this {
    this.orderData.customer = customer;
    this.orderData.customerId = customer.id;
    return this;
  }

  withProducts(products: Product[]): this {
    this.orderData.products = products;
    // Auto-calculate total amount based on products
    this.orderData.totalAmount = products.reduce(
      (sum, product) => sum + parseFloat(product.price.toString()),
      0
    );
    return this;
  }

  withTotalAmount(amount: number): this {
    this.orderData.totalAmount = amount;
    return this;
  }

  withStatus(status: OrderStatus): this {
    this.orderData.status = status;
    return this;
  }

  withNotes(notes: string): this {
    this.orderData.notes = notes;
    return this;
  }

  withCreatedAt(date: Date): this {
    this.orderData.createdAt = date;
    this.orderData.updatedAt = date;
    return this;
  }

  pending(): this {
    return this.withStatus(OrderStatus.PENDING);
  }

  preparing(): this {
    return this.withStatus(OrderStatus.PREPARING);
  }

  ready(): this {
    return this.withStatus(OrderStatus.READY);
  }

  delivered(): this {
    return this.withStatus(OrderStatus.DELIVERED);
  }

  cancelled(): this {
    return this.withStatus(OrderStatus.CANCELLED);
  }

  createdDaysAgo(days: number): this {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return this.withCreatedAt(date);
  }

  createdMinutesAgo(minutes: number): this {
    const date = new Date();
    date.setMinutes(date.getMinutes() - minutes);
    return this.withCreatedAt(date);
  }

  async build(): Promise<Order> {
    if (!this.orderData.customer) {
      throw new Error("Order must have a customer. Use withCustomer() method.");
    }
    if (!this.orderData.products || this.orderData.products.length === 0) {
      throw new Error("Order must have products. Use withProducts() method.");
    }

    const order = this.orderRepository.create(this.orderData);
    return await this.orderRepository.save(order);
  }

  async buildMany(count: number, customer: Customer, products: Product[]): Promise<Order[]> {
    const orders: Order[] = [];
    for (let i = 0; i < count; i++) {
      this.setDefaults();
      this.withCustomer(customer)
        .withProducts(products)
        .withNotes(`Order ${i + 1}`);
      orders.push(await this.build());
    }
    return orders;
  }

  // Predefined order scenarios for common test cases
  static pendingOrder(app: INestApplication, customer: Customer, products: Product[]): OrderBuilder {
    return new OrderBuilder(app)
      .withCustomer(customer)
      .withProducts(products)
      .pending()
      .withNotes("Pending order for testing");
  }

  static deliveredOrder(app: INestApplication, customer: Customer, products: Product[]): OrderBuilder {
    return new OrderBuilder(app)
      .withCustomer(customer)
      .withProducts(products)
      .delivered()
      .createdDaysAgo(5)
      .withNotes("Delivered order for testing");
  }

  static recentOrder(app: INestApplication, customer: Customer, products: Product[]): OrderBuilder {
    return new OrderBuilder(app)
      .withCustomer(customer)
      .withProducts(products)
      .pending()
      .createdMinutesAgo(2)
      .withNotes("Recent order for modification testing");
  }

  static preparingOrder(app: INestApplication, customer: Customer, products: Product[]): OrderBuilder {
    return new OrderBuilder(app)
      .withCustomer(customer)
      .withProducts(products)
      .preparing()
      .createdMinutesAgo(30)
      .withNotes("Order currently being prepared");
  }

  static oldDeliveredOrder(app: INestApplication, customer: Customer, products: Product[]): OrderBuilder {
    return new OrderBuilder(app)
      .withCustomer(customer)
      .withProducts(products)
      .delivered()
      .createdDaysAgo(20)
      .withNotes("Old delivered order for history testing");
  }
}
