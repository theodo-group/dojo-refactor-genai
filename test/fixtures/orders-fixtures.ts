import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

export class OrdersFixtures {
  private app: INestApplication;
  private orderRepository: Repository<Order>;

  constructor(app: INestApplication) {
    this.app = app;
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  async clear(): Promise<void> {
    // Delete in the correct order to respect foreign key constraints
    await this.orderRepository.query("TRUNCATE TABLE order_products CASCADE");
    await this.orderRepository.query("TRUNCATE TABLE orders CASCADE");
  }

  // Order creation
  public async createOrders(): Promise<Order[]> {
    // Create dates for the orders - to make first customer eligible for loyalty program
    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(now.getDate() - 10);

    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(now.getDate() - 15);

    const twentyDaysAgo = new Date(now);
    twentyDaysAgo.setDate(now.getDate() - 20);

    const twentyFiveDaysAgo = new Date(now);
    twentyFiveDaysAgo.setDate(now.getDate() - 25);

    const orders = [
      this.orderRepository.create({
        customer: this.customers[0],
        products: [this.products[0], this.products[3]],
        totalAmount: 17.98,
        status: OrderStatus.DELIVERED,
        notes: "Extra cheese please",
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
      }),
      this.orderRepository.create({
        customer: this.customers[0],
        products: [this.products[1], this.products[2], this.products[4]],
        totalAmount: 31.97,
        status: OrderStatus.PREPARING,
        createdAt: fifteenDaysAgo,
        updatedAt: fifteenDaysAgo,
      }),
      this.orderRepository.create({
        customer: this.customers[0],
        products: [this.products[0], this.products[2]],
        totalAmount: 21.98,
        status: OrderStatus.DELIVERED,
        createdAt: twentyDaysAgo,
        updatedAt: twentyDaysAgo,
      }),
      this.orderRepository.create({
        customer: this.customers[0],
        products: [this.products[4]],
        totalAmount: 7.99,
        status: OrderStatus.READY,
        createdAt: twentyFiveDaysAgo,
        updatedAt: twentyFiveDaysAgo,
      }),
    ];

    return await this.orderRepository.save(orders);
  }
}

/**
 * Avant on avait une seule commande pour load un type de fixture
 * Par ex : create des orders ou alors create des products mais on
 * n'a pas de granularité sur ce système
 *
 * On pourrait soit faire un système plus modulaire
 * Soit faire des fixtures dédiées à chaque test
 */
