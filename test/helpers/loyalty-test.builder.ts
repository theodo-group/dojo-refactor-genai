import { INestApplication } from "@nestjs/common";
import { TestDataBuilder } from "./test-data-builder";
import { createCustomerDto } from "../factories/customer.factory";
import { createProductDto } from "../factories/product.factory";
import { createOrderDto } from "../factories/order.factory";
import { Customer } from "../../src/customer/entities/customer.entity";
import { Product } from "../../src/product/entities/product.entity";
import { Order } from "../../src/order/entities/order.entity";

/**
 * Builder for creating customers in specific loyalty tiers
 *
 * Tier thresholds:
 * - Bronze: < 3 orders and < $100 spent
 * - Silver: 3-5 orders or $100-249 spent
 * - Gold: 6-10 orders or $250-499 spent
 * - Platinum: 11+ orders or $500+ spent
 *
 * Discount rates (order-based):
 * - 0-3 orders: 0%
 * - 4-5 orders: 5%
 * - 6-10 orders: 10%
 * - 11+ orders: 15%
 *
 * Discount rates (spending-based):
 * - $0-99: 0%
 * - $100-249: 3%
 * - $250-499: 7%
 * - $500+: 12%
 */
export class LoyaltyTestBuilder {
  private dataBuilder: TestDataBuilder;

  constructor(private readonly app: INestApplication) {
    this.dataBuilder = new TestDataBuilder(app);
  }

  /**
   * Creates a Bronze tier customer (0 orders, $0 spent)
   */
  async createBronzeTierCustomer(): Promise<Customer> {
    const customerData = createCustomerDto({ name: "Bronze Customer" });
    return await this.dataBuilder.createCustomer(customerData);
  }

  /**
   * Creates a Silver tier customer (3 orders, ~$120 spent)
   */
  async createSilverTierCustomer(): Promise<{
    customer: Customer;
    products: Product[];
    orders: Order[];
  }> {
    const customer = await this.dataBuilder.createCustomer(
      createCustomerDto({ name: "Silver Customer" })
    );
    const products = await this.dataBuilder.createProducts([
      createProductDto({ price: 40 }),
      createProductDto({ price: 40 }),
    ]);

    const orders: Order[] = [];
    for (let i = 0; i < 3; i++) {
      const order = await this.dataBuilder.createOrder(
        createOrderDto(
          customer.id,
          products.map((p) => p.id),
          { totalAmount: 40 }
        )
      );
      orders.push(order);
    }

    return { customer, products, orders };
  }

  /**
   * Creates a Gold tier customer (7 orders, ~$350 spent)
   */
  async createGoldTierCustomer(): Promise<{
    customer: Customer;
    products: Product[];
    orders: Order[];
  }> {
    const customer = await this.dataBuilder.createCustomer(
      createCustomerDto({ name: "Gold Customer" })
    );
    const products = await this.dataBuilder.createProducts([
      createProductDto({ price: 50 }),
      createProductDto({ price: 50 }),
    ]);

    const orders: Order[] = [];
    for (let i = 0; i < 7; i++) {
      const order = await this.dataBuilder.createOrder(
        createOrderDto(
          customer.id,
          products.map((p) => p.id),
          { totalAmount: 50 }
        )
      );
      orders.push(order);
    }

    return { customer, products, orders };
  }

  /**
   * Creates a Platinum tier customer (12 orders, ~$600 spent)
   */
  async createPlatinumTierCustomer(): Promise<{
    customer: Customer;
    products: Product[];
    orders: Order[];
  }> {
    const customer = await this.dataBuilder.createCustomer(
      createCustomerDto({ name: "Platinum Customer" })
    );
    const products = await this.dataBuilder.createProducts([
      createProductDto({ price: 50 }),
      createProductDto({ price: 50 }),
    ]);

    const orders: Order[] = [];
    for (let i = 0; i < 12; i++) {
      const order = await this.dataBuilder.createOrder(
        createOrderDto(
          customer.id,
          products.map((p) => p.id),
          { totalAmount: 50 }
        )
      );
      orders.push(order);
    }

    return { customer, products, orders };
  }

  /**
   * Creates a customer with a specific number of orders
   */
  async createCustomerWithOrders(
    orderCount: number,
    orderAmount: number = 50
  ): Promise<{
    customer: Customer;
    products: Product[];
    orders: Order[];
  }> {
    const customer = await this.dataBuilder.createCustomer(
      createCustomerDto({ name: `Customer with ${orderCount} orders` })
    );
    const products = await this.dataBuilder.createProducts([
      createProductDto({ price: orderAmount }),
      createProductDto({ price: orderAmount }),
    ]);

    const orders: Order[] = [];
    for (let i = 0; i < orderCount; i++) {
      const order = await this.dataBuilder.createOrder(
        createOrderDto(
          customer.id,
          products.map((p) => p.id),
          { totalAmount: orderAmount }
        )
      );
      orders.push(order);
    }

    return { customer, products, orders };
  }

  /**
   * Creates a customer near the 5% discount threshold (3 orders)
   */
  async createCustomerNear5PercentDiscount(): Promise<{
    customer: Customer;
    products: Product[];
    orders: Order[];
  }> {
    return await this.createCustomerWithOrders(3, 30);
  }

  /**
   * Creates a customer near the 10% discount threshold (5 orders)
   */
  async createCustomerNear10PercentDiscount(): Promise<{
    customer: Customer;
    products: Product[];
    orders: Order[];
  }> {
    return await this.createCustomerWithOrders(5, 40);
  }

  /**
   * Creates a customer near the 15% discount threshold (10 orders)
   */
  async createCustomerNear15PercentDiscount(): Promise<{
    customer: Customer;
    products: Product[];
    orders: Order[];
  }> {
    return await this.createCustomerWithOrders(10, 50);
  }

  /**
   * Creates a customer with specific spending amount
   */
  async createCustomerWithSpending(
    targetSpending: number
  ): Promise<{
    customer: Customer;
    products: Product[];
    orders: Order[];
  }> {
    const customer = await this.dataBuilder.createCustomer(
      createCustomerDto({ name: `Customer with $${targetSpending} spent` })
    );
    const products = await this.dataBuilder.createProducts([
      createProductDto({ price: 50 }),
      createProductDto({ price: 50 }),
    ]);

    // Create orders to reach target spending
    const orderAmount = Math.min(targetSpending, 100);
    const orderCount = Math.ceil(targetSpending / orderAmount);

    const orders: Order[] = [];
    let remainingAmount = targetSpending;

    for (let i = 0; i < orderCount; i++) {
      const amount =
        i === orderCount - 1 ? remainingAmount : Math.min(orderAmount, remainingAmount);
      const order = await this.dataBuilder.createOrder(
        createOrderDto(
          customer.id,
          products.map((p) => p.id),
          { totalAmount: amount }
        )
      );
      orders.push(order);
      remainingAmount -= amount;
    }

    return { customer, products, orders };
  }
}
