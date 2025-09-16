import { INestApplication } from '@nestjs/common';
import { Order, OrderStatus } from '../../../src/entities/order.entity';
import { Customer } from '../../../src/entities/customer.entity';
import { Product } from '../../../src/entities/product.entity';
import { BaseFixtures } from '../base/base-fixtures';
import { FixtureBuilder } from '../base/fixture-builder.interface';

export interface OrderSpec {
  customer: Customer;
  products: Product[];
  totalAmount: number;
  status: OrderStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class OrderFixtureFactory extends BaseFixtures<Order> implements FixtureBuilder<Order> {
  private specs: OrderSpec[] = [];

  async init(_app: INestApplication): Promise<void> {
    // Base constructor already handles app initialization
  }

  /**
   * Add a basic order
   */
  addBasicOrder(
    customer: Customer,
    products: Product[],
    overrides: Partial<Omit<OrderSpec, 'customer' | 'products'>> = {}
  ): OrderFixtureFactory {
    const totalAmount = overrides.totalAmount ||
      products.reduce((sum, product) => sum + product.price, 0);

    this.specs.push({
      customer,
      products,
      totalAmount,
      status: OrderStatus.PENDING,
      notes: 'Test order',
      ...overrides,
    });
    return this;
  }

  /**
   * Add multiple historical orders for a customer (for loyalty program eligibility)
   */
  addHistoricalOrders(
    customer: Customer,
    products: Product[],
    count: number = 4
  ): OrderFixtureFactory {
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const daysAgo = (i + 1) * 5; // 5, 10, 15, 20 days ago
      const orderDate = new Date(now);
      orderDate.setDate(now.getDate() - daysAgo);

      // Vary the products and amounts for each order
      const orderProducts = products.slice(0, Math.max(1, Math.floor(products.length / 2) + i % 2));
      const totalAmount = orderProducts.reduce((sum, product) => sum + product.price, 0);

      this.specs.push({
        customer,
        products: orderProducts,
        totalAmount,
        status: i % 2 === 0 ? OrderStatus.DELIVERED : OrderStatus.READY,
        notes: `Historical order ${i + 1}`,
        createdAt: orderDate,
        updatedAt: orderDate,
      });
    }
    return this;
  }

  /**
   * Add orders with different statuses
   */
  addOrdersWithStatuses(
    customer: Customer,
    products: Product[],
    statuses: OrderStatus[]
  ): OrderFixtureFactory {
    statuses.forEach((status, index) => {
      const orderProducts = products.slice(index % products.length, (index % products.length) + 2);
      this.addBasicOrder(customer, orderProducts, { status });
    });
    return this;
  }

  /**
   * Add orders for loyalty testing (customer with 4+ orders)
   */
  addLoyaltyTestOrders(
    customer: Customer,
    products: Product[]
  ): OrderFixtureFactory {
    return this.addHistoricalOrders(customer, products, 4);
  }

  /**
   * Add a custom order
   */
  addOrder(spec: OrderSpec): OrderFixtureFactory {
    this.specs.push(spec);
    return this;
  }

  /**
   * Add multiple custom orders
   */
  addOrders(specs: OrderSpec[]): OrderFixtureFactory {
    this.specs.push(...specs);
    return this;
  }

  /**
   * Build all configured order fixtures
   */
  async build(): Promise<Order[]> {
    const orders = this.specs.map(spec =>
      this.orderRepository.create({
        customer: spec.customer,
        products: spec.products,
        totalAmount: spec.totalAmount,
        status: spec.status,
        notes: spec.notes,
        createdAt: spec.createdAt,
        updatedAt: spec.updatedAt,
      })
    );

    this.data = await this.orderRepository.save(orders);
    return this.data;
  }

  /**
   * Get orders by customer
   */
  getOrdersByCustomer(customer: Customer): Order[] {
    return this.data.filter(order => order.customer.id === customer.id);
  }

  /**
   * Get orders by status
   */
  getOrdersByStatus(status: OrderStatus): Order[] {
    return this.data.filter(order => order.status === status);
  }

  /**
   * Get orders within date range
   */
  getOrdersInDateRange(startDate: Date, endDate: Date): Order[] {
    return this.data.filter(order =>
      order.createdAt >= startDate && order.createdAt <= endDate
    );
  }

  /**
   * Clean up and reset specs
   */
  async cleanup(): Promise<void> {
    await super.cleanup();
    this.specs = [];
  }
}