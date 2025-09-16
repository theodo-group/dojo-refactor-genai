import { INestApplication } from '@nestjs/common';
import { Customer } from '../../../src/entities/customer.entity';
import { Product } from '../../../src/entities/product.entity';
import { Order } from '../../../src/entities/order.entity';
import { CustomerFixtureFactory } from '../factories/customer-fixture.factory';
import { ProductFixtureFactory } from '../factories/product-fixture.factory';
import { OrderFixtureFactory } from '../factories/order-fixture.factory';
import { TestDataManager } from '../base/test-data-manager';

export interface LoyaltyEligibleScenario {
  customer: Customer;
  products: Product[];
  orders: Order[];
}

export interface BasicEcommerceScenario {
  customers: Customer[];
  products: Product[];
}

export interface OrderWorkflowScenario {
  customer: Customer;
  products: Product[];
  pendingOrder: Order;
  deliveredOrder: Order;
}

export class ScenarioFixtures {
  private app: INestApplication;
  private dataManager: TestDataManager;

  constructor(app: INestApplication) {
    this.app = app;
    this.dataManager = new TestDataManager(app);
  }

  /**
   * Create a loyalty-eligible customer with historical orders
   * This customer will have 4+ orders and qualify for loyalty discounts
   */
  async createLoyaltyEligibleCustomer(): Promise<LoyaltyEligibleScenario> {
    const customerFactory = new CustomerFixtureFactory(this.app);
    const productFactory = new ProductFixtureFactory(this.app);
    const orderFactory = new OrderFixtureFactory(this.app);

    this.dataManager.register(customerFactory);
    this.dataManager.register(productFactory);
    this.dataManager.register(orderFactory);

    await this.dataManager.init();

    // Create one loyal customer
    customerFactory.addLoyalCustomer({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      address: '123 Main St',
    });

    // Create a variety of products
    productFactory.addCompleteMenu();

    // Build the data
    const customers = await customerFactory.build();
    const products = await productFactory.build();

    // Create historical orders for loyalty eligibility
    orderFactory.addLoyaltyTestOrders(customers[0], products);
    const orders = await orderFactory.build();

    return {
      customer: customers[0],
      products,
      orders,
    };
  }

  /**
   * Create a basic e-commerce scenario with customers and products
   */
  async createBasicEcommerceScenario(): Promise<BasicEcommerceScenario> {
    const customerFactory = new CustomerFixtureFactory(this.app);
    const productFactory = new ProductFixtureFactory(this.app);

    this.dataManager.register(customerFactory);
    this.dataManager.register(productFactory);

    await this.dataManager.init();

    // Create diverse customers
    customerFactory
      .addBasicCustomer({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        address: '123 Main St',
      })
      .addBasicCustomer({
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '987-654-3210',
        address: '456 Oak Ave',
      })
      .addNewCustomer({
        name: 'Bob Johnson',
        email: 'bob@example.com',
        phone: '555-555-5555',
        address: '789 Pine Rd',
      });

    // Create complete product menu
    productFactory.addCompleteMenu();

    const customers = await customerFactory.build();
    const products = await productFactory.build();

    return {
      customers,
      products,
    };
  }

  /**
   * Create an order workflow scenario with different order statuses
   */
  async createOrderWorkflowScenario(): Promise<OrderWorkflowScenario> {
    const customerFactory = new CustomerFixtureFactory(this.app);
    const productFactory = new ProductFixtureFactory(this.app);
    const orderFactory = new OrderFixtureFactory(this.app);

    this.dataManager.register(customerFactory);
    this.dataManager.register(productFactory);
    this.dataManager.register(orderFactory);

    await this.dataManager.init();

    // Create a customer
    customerFactory.addBasicCustomer();

    // Create products
    productFactory.addPizzas().addAppetizers();

    const customers = await customerFactory.build();
    const products = await productFactory.build();

    // Create orders with different statuses
    orderFactory
      .addBasicOrder(
        customers[0],
        products.slice(0, 2),
        { status: 'pending' as any, notes: 'Pending order' }
      )
      .addBasicOrder(
        customers[0],
        products.slice(1, 3),
        { status: 'delivered' as any, notes: 'Delivered order' }
      );

    const orders = await orderFactory.build();

    return {
      customer: customers[0],
      products,
      pendingOrder: orders[0],
      deliveredOrder: orders[1],
    };
  }

  /**
   * Create minimal data for basic app functionality tests
   */
  async createMinimalScenario(): Promise<{ customer: Customer; product: Product }> {
    const customerFactory = new CustomerFixtureFactory(this.app);
    const productFactory = new ProductFixtureFactory(this.app);

    this.dataManager.register(customerFactory);
    this.dataManager.register(productFactory);

    await this.dataManager.init();

    // Create minimal data
    customerFactory.addBasicCustomer();
    productFactory.addProduct({
      name: 'Test Pizza',
      description: 'A test pizza',
      price: 10.99,
      category: 'pizza',
    });

    const customers = await customerFactory.build();
    const products = await productFactory.build();

    return {
      customer: customers[0],
      product: products[0],
    };
  }

  /**
   * Clean up all scenario data
   */
  async cleanup(): Promise<void> {
    await this.dataManager.cleanupAll();
  }

  /**
   * Get the data manager for custom scenarios
   */
  getDataManager(): TestDataManager {
    return this.dataManager;
  }
}