import { ApiTestHelpers } from './api-test-helpers';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { Order } from '../../src/entities/order.entity';

export class CleanupHelpers {
  constructor(private apiHelpers: ApiTestHelpers) {}

  async cleanupCustomers(customers: Customer[]): Promise<void> {
    for (const customer of customers) {
      try {
        await this.apiHelpers.deleteCustomer(customer.id);
      } catch (error) {
        // Ignore 404 errors - customer might already be deleted
        const statusCode = error.status || error.response?.status;
        if (statusCode !== 404) {
          // Silently handle cleanup failures in tests - not critical
        }
      }
    }
  }

  async cleanupProducts(products: Product[]): Promise<void> {
    for (const product of products) {
      try {
        await this.apiHelpers.deleteProduct(product.id);
      } catch (error) {
        // Ignore 404 errors - product might already be deleted
        const statusCode = error.status || error.response?.status;
        if (statusCode !== 404) {
          // Silently handle cleanup failures in tests - not critical
        }
      }
    }
  }

  async cleanupOrders(orders: Order[]): Promise<void> {
    for (const order of orders) {
      try {
        await this.apiHelpers.deleteOrder(order.id);
      } catch (error) {
        // Ignore 404 errors (order might already be deleted) and 400 errors (order might be delivered/cancelled)
        const statusCode = error.status || error.response?.status;
        if (statusCode !== 404 && statusCode !== 400) {
          // Silently handle cleanup failures in tests - not critical
        }
      }
    }
  }

  async cleanupAll(data: {
    customers?: Customer[];
    products?: Product[];
    orders?: Order[];
  }): Promise<void> {
    // Clean up in dependency order: orders first, then products, then customers
    if (data.orders) {
      await this.cleanupOrders(data.orders);
    }
    if (data.products) {
      await this.cleanupProducts(data.products);
    }
    if (data.customers) {
      await this.cleanupCustomers(data.customers);
    }
  }
}

export interface TestDataTracker {
  customers: Customer[];
  products: Product[];
  orders: Order[];
}

export function createDataTracker(): TestDataTracker {
  return {
    customers: [],
    products: [],
    orders: [],
  };
}