import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../src/entities/order.entity';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';

export interface CreateOrderOptions {
  customer?: Customer;
  products?: Product[];
  totalAmount?: number;
  status?: OrderStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function createOrder(
  app: INestApplication,
  options: CreateOrderOptions = {}
): Promise<Order> {
  const orderRepository: Repository<Order> = app.get(
    getRepositoryToken(Order)
  );

  if (!options.customer) {
    throw new Error('Customer is required to create an order');
  }

  if (!options.products || options.products.length === 0) {
    throw new Error('At least one product is required to create an order');
  }

  const order = orderRepository.create({
    customer: options.customer,
    products: options.products,
    totalAmount: options.totalAmount ?? 100.0,
    status: options.status ?? OrderStatus.PENDING,
    notes: options.notes,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
  });

  return await orderRepository.save(order);
}

export async function createOrders(
  app: INestApplication,
  count: number,
  baseOptions: CreateOrderOptions = {}
): Promise<Order[]> {
  const orders: Order[] = [];

  for (let i = 0; i < count; i++) {
    const order = await createOrder(app, {
      ...baseOptions,
      totalAmount: baseOptions.totalAmount ?? 100.0 + i * 10,
    });
    orders.push(order);
  }

  return orders;
}

/**
 * Creates orders for a customer with dates in the past to simulate order history
 * Useful for testing loyalty programs
 */
export async function createOrdersWithHistory(
  app: INestApplication,
  customer: Customer,
  products: Product[],
  count: number,
  daysAgoStart: number = 25
): Promise<Order[]> {
  const orders: Order[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const daysAgo = daysAgoStart - i * 5;
    const orderDate = new Date(now);
    orderDate.setDate(now.getDate() - daysAgo);

    const order = await createOrder(app, {
      customer,
      products,
      totalAmount: 20.0 + i * 5,
      status: OrderStatus.DELIVERED,
      createdAt: orderDate,
      updatedAt: orderDate,
    });

    orders.push(order);
  }

  return orders;
}
