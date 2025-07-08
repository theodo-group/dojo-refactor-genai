import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order } from "../../src/entities/order.entity";

export class DatabaseTestUtils {
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

  /**
   * Clean all test data from the database
   * Respects foreign key constraints by deleting in correct order
   */
  async cleanDatabase(): Promise<void> {
    try {
      // Delete in the correct order to respect foreign key constraints
      await this.orderRepository.query("TRUNCATE TABLE order_products CASCADE");
      await this.orderRepository.query("TRUNCATE TABLE orders CASCADE");
      await this.productRepository.query("TRUNCATE TABLE products CASCADE");
      await this.customerRepository.query("TRUNCATE TABLE customers CASCADE");
    } catch (error) {
      console.error("Error cleaning database:", error);
      throw error;
    }
  }

  /**
   * Clean only orders, keeping customers and products
   */
  async cleanOrders(): Promise<void> {
    try {
      await this.orderRepository.query("TRUNCATE TABLE order_products CASCADE");
      await this.orderRepository.query("TRUNCATE TABLE orders CASCADE");
    } catch (error) {
      console.error("Error cleaning orders:", error);
      throw error;
    }
  }

  /**
   * Clean only products (and related orders)
   */
  async cleanProducts(): Promise<void> {
    try {
      await this.orderRepository.query("TRUNCATE TABLE order_products CASCADE");
      await this.orderRepository.query("TRUNCATE TABLE orders CASCADE");
      await this.productRepository.query("TRUNCATE TABLE products CASCADE");
    } catch (error) {
      console.error("Error cleaning products:", error);
      throw error;
    }
  }

  /**
   * Clean only customers (and related orders)
   */
  async cleanCustomers(): Promise<void> {
    try {
      await this.orderRepository.query("TRUNCATE TABLE order_products CASCADE");
      await this.orderRepository.query("TRUNCATE TABLE orders CASCADE");
      await this.customerRepository.query("TRUNCATE TABLE customers CASCADE");
    } catch (error) {
      console.error("Error cleaning customers:", error);
      throw error;
    }
  }

  /**
   * Get count of records in each table for debugging
   */
  async getTableCounts(): Promise<{
    customers: number;
    products: number;
    orders: number;
  }> {
    const [customerCount] = await this.customerRepository.query(
      "SELECT COUNT(*) as count FROM customers"
    );
    const [productCount] = await this.productRepository.query(
      "SELECT COUNT(*) as count FROM products"
    );
    const [orderCount] = await this.orderRepository.query(
      "SELECT COUNT(*) as count FROM orders"
    );

    return {
      customers: parseInt(customerCount.count),
      products: parseInt(productCount.count),
      orders: parseInt(orderCount.count),
    };
  }

  /**
   * Verify database is clean (useful for debugging test isolation issues)
   */
  async verifyDatabaseIsClean(): Promise<boolean> {
    const counts = await this.getTableCounts();
    return counts.customers === 0 && counts.products === 0 && counts.orders === 0;
  }

  /**
   * Reset database sequences (useful after truncate operations)
   */
  async resetSequences(): Promise<void> {
    try {
      // Reset sequences for auto-incrementing fields if any
      // This is PostgreSQL specific - adjust for other databases
      await this.customerRepository.query(
        "SELECT setval(pg_get_serial_sequence('customers', 'id'), 1, false)"
      );
      await this.productRepository.query(
        "SELECT setval(pg_get_serial_sequence('products', 'id'), 1, false)"
      );
      await this.orderRepository.query(
        "SELECT setval(pg_get_serial_sequence('orders', 'id'), 1, false)"
      );
    } catch (error) {
      // Sequences might not exist or database might not be PostgreSQL
      // This is not critical, so we can ignore the error
      console.warn("Could not reset sequences:", error.message);
    }
  }
}
