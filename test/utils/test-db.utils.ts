import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { Order } from '../../src/entities/order.entity';

export class TestDbUtils {
  private customerRepository: Repository<Customer>;
  private productRepository: Repository<Product>;
  private orderRepository: Repository<Order>;

  constructor(private app: INestApplication) {
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  async createCustomer(customerData: Partial<Customer>): Promise<Customer> {
    const customer = this.customerRepository.create(customerData);
    return await this.customerRepository.save(customer);
  }

  async createMultipleCustomers(customersData: Partial<Customer>[]): Promise<Customer[]> {
    const customers = this.customerRepository.create(customersData);
    return await this.customerRepository.save(customers);
  }

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const product = this.productRepository.create(productData);
    return await this.productRepository.save(product);
  }

  async createMultipleProducts(productsData: Partial<Product>[]): Promise<Product[]> {
    const products = this.productRepository.create(productsData);
    return await this.productRepository.save(products);
  }

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const order = this.orderRepository.create(orderData);
    return await this.orderRepository.save(order);
  }

  async createMultipleOrders(ordersData: Partial<Order>[]): Promise<Order[]> {
    const orders = this.orderRepository.create(ordersData);
    return await this.orderRepository.save(orders);
  }

  async clear(): Promise<void> {
    await this.orderRepository.query('TRUNCATE TABLE order_products CASCADE');
    await this.orderRepository.query('TRUNCATE TABLE orders CASCADE');
    await this.productRepository.query('TRUNCATE TABLE products CASCADE');
    await this.customerRepository.query('TRUNCATE TABLE customers CASCADE');
  }
}
