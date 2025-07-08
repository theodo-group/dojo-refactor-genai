import { Order, OrderStatus } from '../../src/entities/order.entity';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';

export class OrderBuilder {
  private order: Partial<Order>;

  constructor() {
    this.order = {
      id: 'order-1',
      customer: null,
      products: [],
      status: OrderStatus.PENDING,
      totalAmount: 0,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  withId(id: string): OrderBuilder {
    this.order.id = id;
    return this;
  }

  withCustomer(customer: Customer): OrderBuilder {
    this.order.customer = customer;
    return this;
  }

  withProducts(products: Product[]): OrderBuilder {
    this.order.products = products;
    return this;
  }

  withStatus(status: OrderStatus): OrderBuilder {
    this.order.status = status;
    return this;
  }

  withTotalAmount(totalAmount: number): OrderBuilder {
    this.order.totalAmount = totalAmount;
    return this;
  }

  withNotes(notes: string): OrderBuilder {
    this.order.notes = notes;
    return this;
  }

  withCreatedAt(createdAt: Date): OrderBuilder {
    this.order.createdAt = createdAt;
    return this;
  }

  build(): Order {
    return this.order as Order;
  }
}
