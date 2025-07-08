import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { Order, OrderStatus } from '../../src/entities/order.entity';

export interface LoyaltyTestScenario {
  loyalCustomer: Customer;
  newCustomer: Customer;
  products: Product[];
  existingOrders: Order[];
}

export class LoyaltyFixtures {
  private readonly app: INestApplication;
  private readonly customerRepository: Repository<Customer>;
  private readonly productRepository: Repository<Product>;
  private readonly orderRepository: Repository<Order>;

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  async createTestScenario(): Promise<LoyaltyTestScenario> {
    // Create customers with different loyalty status
    const { loyalCustomer, newCustomer } = await this.createLoyaltyTestCustomers();
    
    // Create products for loyalty testing
    const products = await this.createLoyaltyTestProducts();
    
    // Create existing orders to establish loyalty status
    const existingOrders = await this.createLoyaltyTestOrders(loyalCustomer, products);

    return { loyalCustomer, newCustomer, products, existingOrders };
  }

  async cleanup(): Promise<void> {
    // Delete in correct order to respect FK constraints
    await this.orderRepository.query('TRUNCATE TABLE order_products CASCADE');
    await this.orderRepository.query('TRUNCATE TABLE orders CASCADE');
    await this.productRepository.query('TRUNCATE TABLE products CASCADE');
    await this.customerRepository.query('TRUNCATE TABLE customers CASCADE');
  }

  private async createLoyaltyTestCustomers(): Promise<{ loyalCustomer: Customer; newCustomer: Customer }> {
    const customers = [
      this.customerRepository.create({
        name: 'Loyal Customer',
        email: 'loyal@example.com',
        phone: '555-LOYAL-1',
        address: '123 Loyalty St',
      }),
      this.customerRepository.create({
        name: 'New Customer',
        email: 'new@example.com',
        phone: '555-NEW-01',
        address: '456 Fresh Ave',
      }),
    ];
    
    const savedCustomers = await this.customerRepository.save(customers);
    return {
      loyalCustomer: savedCustomers[0],
      newCustomer: savedCustomers[1],
    };
  }

  private async createLoyaltyTestProducts(): Promise<Product[]> {
    const products = [
      this.productRepository.create({
        name: 'Loyalty Test Pizza',
        description: 'Pizza for loyalty discount testing',
        price: 15.99,
        category: 'pizza',
      }),
      this.productRepository.create({
        name: 'Loyalty Test Appetizer',
        description: 'Appetizer for loyalty testing',
        price: 7.99,
        category: 'appetizer',
      }),
    ];
    
    return await this.productRepository.save(products);
  }

  private async createLoyaltyTestOrders(loyalCustomer: Customer, products: Product[]): Promise<Order[]> {
    // Create multiple orders for the loyal customer to qualify for discount
    const now = new Date();
    const orders = [];

    // Create 4 previous orders to make customer eligible for loyalty discount
    for (let i = 0; i < 4; i++) {
      const orderDate = new Date(now);
      orderDate.setDate(now.getDate() - (i + 1) * 7); // Orders from 1, 2, 3, 4 weeks ago

      const order = this.orderRepository.create({
        customer: loyalCustomer,
        products: [products[i % products.length]],
        totalAmount: 15.99,
        status: OrderStatus.DELIVERED,
        notes: `Loyalty test order ${i + 1}`,
        createdAt: orderDate,
        updatedAt: orderDate,
      });
      orders.push(order);
    }
    
    return await this.orderRepository.save(orders);
  }
}
