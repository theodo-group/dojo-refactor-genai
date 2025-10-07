import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { Order, OrderStatus } from '../../src/entities/order.entity';

export class FixtureFactory {
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

  async createCustomer(data?: Partial<Customer>): Promise<Customer> {
    const timestamp = Date.now();
    const customer = this.customerRepository.create({
      name: data?.name || `Customer ${timestamp}`,
      email: data?.email || `customer${timestamp}@example.com`,
      phone: data?.phone || `555-${timestamp.toString().slice(-7)}`,
      address: data?.address || `${timestamp} Test St`,
      ...data,
    });
    return await this.customerRepository.save(customer);
  }

  async createCustomers(count: number): Promise<Customer[]> {
    const customers: Customer[] = [];
    for (let i = 0; i < count; i++) {
      customers.push(await this.createCustomer());
    }
    return customers;
  }

  async createProduct(data?: Partial<Product>): Promise<Product> {
    const timestamp = Date.now();
    const product = this.productRepository.create({
      name: data?.name || `Product ${timestamp}`,
      description: data?.description || `Description for product ${timestamp}`,
      price: data?.price || 10.99,
      category: data?.category || 'test',
      ...data,
    });
    return await this.productRepository.save(product);
  }

  async createProducts(count: number): Promise<Product[]> {
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
      products.push(await this.createProduct());
    }
    return products;
  }

  async createOrder(data?: Partial<Order> & { customer?: Customer; products?: Product[] }): Promise<Order> {
    const order = this.orderRepository.create({
      status: data?.status || OrderStatus.PENDING,
      totalAmount: data?.totalAmount || 0,
      notes: data?.notes || null,
      customer: data?.customer,
      products: data?.products || [],
      createdAt: data?.createdAt,
      updatedAt: data?.updatedAt,
    });
    return await this.orderRepository.save(order);
  }

  async createOrders(count: number, customer: Customer, products: Product[]): Promise<Order[]> {
    const orders: Order[] = [];
    for (let i = 0; i < count; i++) {
      orders.push(await this.createOrder({ customer, products }));
    }
    return orders;
  }

  async clearAll(): Promise<void> {
    await this.orderRepository.query('TRUNCATE TABLE order_products CASCADE');
    await this.orderRepository.query('TRUNCATE TABLE orders CASCADE');
    await this.productRepository.query('TRUNCATE TABLE products CASCADE');
    await this.customerRepository.query('TRUNCATE TABLE customers CASCADE');
  }
}
