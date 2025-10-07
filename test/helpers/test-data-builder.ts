import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { CreateCustomerDto } from "../../src/customer/dto/create-customer.dto";
import { CreateProductDto } from "../../src/product/dto/create-product.dto";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order } from "../../src/entities/order.entity";

/**
 * Helper class for creating test data via API calls
 * Provides methods to persist entities in the test database
 */
export class TestDataBuilder {
  constructor(private readonly app: INestApplication) {}

  /**
   * Creates a customer in the database
   */
  async createCustomer(dto: CreateCustomerDto): Promise<Customer> {
    const response = await request(this.app.getHttpServer())
      .post("/api/customers")
      .send(dto)
      .expect(201);

    return response.body;
  }

  /**
   * Creates multiple customers in the database
   */
  async createCustomers(dtos: CreateCustomerDto[]): Promise<Customer[]> {
    const customers: Customer[] = [];
    for (const dto of dtos) {
      const customer = await this.createCustomer(dto);
      customers.push(customer);
    }
    return customers;
  }

  /**
   * Creates a product in the database
   */
  async createProduct(dto: CreateProductDto): Promise<Product> {
    const response = await request(this.app.getHttpServer())
      .post("/api/products")
      .send(dto)
      .expect(201);

    return response.body;
  }

  /**
   * Creates multiple products in the database
   */
  async createProducts(dtos: CreateProductDto[]): Promise<Product[]> {
    const products: Product[] = [];
    for (const dto of dtos) {
      const product = await this.createProduct(dto);
      products.push(product);
    }
    return products;
  }

  /**
   * Creates an order in the database
   */
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const response = await request(this.app.getHttpServer())
      .post("/api/orders")
      .send(dto)
      .expect(201);

    return response.body;
  }

  /**
   * Creates multiple orders in the database
   */
  async createOrders(dtos: CreateOrderDto[]): Promise<Order[]> {
    const orders: Order[] = [];
    for (const dto of dtos) {
      const order = await this.createOrder(dto);
      orders.push(order);
    }
    return orders;
  }
}
