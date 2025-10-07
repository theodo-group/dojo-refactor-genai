import { DataSource } from "typeorm";

/**
 * Helper utilities for cleaning up test data
 */
export class TestCleanup {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Clears all data from the database
   * Maintains referential integrity by deleting in the correct order
   */
  async clearDatabase(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Delete in order to respect foreign key constraints
      await queryRunner.query("DELETE FROM order_products");
      await queryRunner.query("DELETE FROM orders");
      await queryRunner.query("DELETE FROM products");
      await queryRunner.query("DELETE FROM customers");

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Clears orders only
   */
  async clearOrders(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      await queryRunner.query("DELETE FROM order_products");
      await queryRunner.query("DELETE FROM orders");

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Clears customers only (and their related orders)
   */
  async clearCustomers(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      await queryRunner.query("DELETE FROM order_products");
      await queryRunner.query("DELETE FROM orders");
      await queryRunner.query("DELETE FROM customers");

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Clears products only
   */
  async clearProducts(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      await queryRunner.query("DELETE FROM order_products");
      await queryRunner.query("DELETE FROM orders");
      await queryRunner.query("DELETE FROM products");

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
