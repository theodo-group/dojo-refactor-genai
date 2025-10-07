import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../../src/entities/order.entity';
import { Customer } from '../../../src/entities/customer.entity';
import { Product } from '../../../src/entities/product.entity';

export class OrderBuilder {
  private orderData: Partial<Order> = {
    status: OrderStatus.PENDING,
    totalAmount: 0,
  };
  private customer?: Customer;
  private products: Product[] = [];

  withCustomer(customer: Customer): this {
    this.customer = customer;
    return this;
  }

  withProducts(products: Product[]): this {
    this.products = products;
    return this;
  }

  withProduct(product: Product): this {
    this.products.push(product);
    return this;
  }

  withStatus(status: OrderStatus): this {
    this.orderData.status = status;
    return this;
  }

  withTotalAmount(totalAmount: number): this {
    this.orderData.totalAmount = totalAmount;
    return this;
  }

  withNotes(notes: string): this {
    this.orderData.notes = notes;
    return this;
  }

  withCreatedAt(createdAt: Date): this {
    this.orderData.createdAt = createdAt;
    return this;
  }

  withUpdatedAt(updatedAt: Date): this {
    this.orderData.updatedAt = updatedAt;
    return this;
  }

  build(): Order {
    const order = new Order();
    Object.assign(order, this.orderData);
    if (this.customer) {
      order.customer = this.customer;
    }
    if (this.products.length > 0) {
      order.products = this.products;
    }
    return order;
  }

  async create(repository: Repository<Order>): Promise<Order> {
    const order = repository.create({
      ...this.orderData,
      customer: this.customer,
      products: this.products,
    });
    return await repository.save(order);
  }
}
