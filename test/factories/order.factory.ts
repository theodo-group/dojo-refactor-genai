import { Order, OrderStatus } from '../../src/entities/order.entity';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';

export const createOrder = (partialOrder: Partial<Order> = {}): Partial<Order> => ({
  status: OrderStatus.PENDING,
  totalAmount: 25.99,
  notes: 'Test order notes',
  ...partialOrder
});
