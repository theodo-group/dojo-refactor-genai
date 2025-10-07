import { INestApplication } from "@nestjs/common";
import { TestDataBuilder } from "./test-data-builder";
import { createCustomerDto } from "../factories/customer.factory";
import { createProductDto } from "../factories/product.factory";
import { createOrderDto } from "../factories/order.factory";
import { Customer } from "../../src/customer/entities/customer.entity";
import { Product } from "../../src/product/entities/product.entity";
import { Order } from "../../src/order/entities/order.entity";

/**
 * Builder for creating customers in various states
 */
export class CustomerTestBuilder {
  private dataBuilder: TestDataBuilder;

  constructor(private readonly app: INestApplication) {
    this.dataBuilder = new TestDataBuilder(app);
  }

  /**
   * Creates a basic customer with no orders
   */
  async createBasicCustomer(
    overrides?: Partial<any>
  ): Promise<Customer> {
    const customerData = createCustomerDto(overrides);
    return await this.dataBuilder.createCustomer(customerData);
  }

  /**
   * Creates a customer with orders
   */
  async createCustomerWithOrders(
    orderCount: number
  ): Promise<{
    customer: Customer;
    products: Product[];
    orders: Order[];
  }> {
    const customer = await this.dataBuilder.createCustomer(createCustomerDto());
    const products = await this.dataBuilder.createProducts([
      createProductDto(),
      createProductDto(),
    ]);

    const orders: Order[] = [];
    for (let i = 0; i < orderCount; i++) {
      const order = await this.dataBuilder.createOrder(
        createOrderDto(
          customer.id,
          products.map((p) => p.id)
        )
      );
      orders.push(order);
    }

    return { customer, products, orders };
  }

  /**
   * Creates multiple customers
   */
  async createMultipleCustomers(count: number): Promise<Customer[]> {
    const customers: Customer[] = [];
    for (let i = 0; i < count; i++) {
      const customer = await this.dataBuilder.createCustomer(
        createCustomerDto({ name: `Customer ${i + 1}` })
      );
      customers.push(customer);
    }
    return customers;
  }

  /**
   * Creates a customer with specific email (useful for uniqueness tests)
   */
  async createCustomerWithEmail(email: string): Promise<Customer> {
    return await this.dataBuilder.createCustomer(createCustomerDto({ email }));
  }

  /**
   * Creates a customer without optional fields
   */
  async createMinimalCustomer(): Promise<Customer> {
    return await this.dataBuilder.createCustomer(
      createCustomerDto({ phone: undefined, address: undefined })
    );
  }
}
