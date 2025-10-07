import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { TestDataBuilder } from "./test-data-builder";
import { createCustomerDto } from "../factories/customer.factory";
import { createProductDto } from "../factories/product.factory";
import { createOrderDto } from "../factories/order.factory";
import { Customer } from "../../src/customer/entities/customer.entity";
import { Product } from "../../src/product/entities/product.entity";
import { Order, OrderStatus } from "../../src/order/entities/order.entity";

/**
 * Builder for creating orders in specific states
 */
export class OrderTestBuilder {
  private dataBuilder: TestDataBuilder;

  constructor(private readonly app: INestApplication) {
    this.dataBuilder = new TestDataBuilder(app);
  }

  /**
   * Creates a complete order setup with customer and products
   */
  async createCompleteOrderSetup(): Promise<{
    customer: Customer;
    products: Product[];
    order: Order;
  }> {
    const customer = await this.dataBuilder.createCustomer(createCustomerDto());
    const products = await this.dataBuilder.createProducts([
      createProductDto(),
      createProductDto(),
    ]);

    const order = await this.dataBuilder.createOrder(
      createOrderDto(
        customer.id,
        products.map((p) => p.id),
        { totalAmount: products.reduce((sum, p) => sum + p.price, 0) }
      )
    );

    return { customer, products, order };
  }

  /**
   * Creates an order in a specific status
   */
  async createOrderWithStatus(
    status: OrderStatus
  ): Promise<{
    customer: Customer;
    products: Product[];
    order: Order;
  }> {
    const { customer, products, order } =
      await this.createCompleteOrderSetup();

    if (status !== OrderStatus.PENDING) {
      // Update order status
      const response = await request(this.app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status })
        .expect(200);

      return { customer, products, order: response.body };
    }

    return { customer, products, order };
  }

  /**
   * Creates a pending order
   */
  async createPendingOrder(): Promise<{
    customer: Customer;
    products: Product[];
    order: Order;
  }> {
    return await this.createOrderWithStatus(OrderStatus.PENDING);
  }

  /**
   * Creates a preparing order
   */
  async createPreparingOrder(): Promise<{
    customer: Customer;
    products: Product[];
    order: Order;
  }> {
    return await this.createOrderWithStatus(OrderStatus.PREPARING);
  }

  /**
   * Creates a ready order
   */
  async createReadyOrder(): Promise<{
    customer: Customer;
    products: Product[];
    order: Order;
  }> {
    return await this.createOrderWithStatus(OrderStatus.READY);
  }

  /**
   * Creates a delivered order
   */
  async createDeliveredOrder(): Promise<{
    customer: Customer;
    products: Product[];
    order: Order;
  }> {
    return await this.createOrderWithStatus(OrderStatus.DELIVERED);
  }

  /**
   * Creates a cancelled order
   */
  async createCancelledOrder(): Promise<{
    customer: Customer;
    products: Product[];
    order: Order;
  }> {
    return await this.createOrderWithStatus(OrderStatus.CANCELLED);
  }

  /**
   * Creates multiple orders with different statuses for a customer
   */
  async createOrdersWithMixedStatuses(
    customer: Customer,
    products: Product[],
    statuses: OrderStatus[]
  ): Promise<Order[]> {
    const orders: Order[] = [];

    for (const status of statuses) {
      const order = await this.dataBuilder.createOrder(
        createOrderDto(
          customer.id,
          products.map((p) => p.id),
          { totalAmount: 50 }
        )
      );

      if (status !== OrderStatus.PENDING) {
        const response = await request(this.app.getHttpServer())
          .patch(`/api/orders/${order.id}/status`)
          .send({ status })
          .expect(200);
        orders.push(response.body);
      } else {
        orders.push(order);
      }
    }

    return orders;
  }
}
