import { loadFeature, defineFeature } from 'jest-cucumber';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { FixtureFactory } from '../helpers/fixture-factory';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { Order } from '../../src/entities/order.entity';
import * as request from 'supertest';

const feature = loadFeature('./test/features/order/order-retrieval.feature');

defineFeature(feature, (test) => {
  let app: INestApplication;
  let fixtureFactory: FixtureFactory;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    app.setGlobalPrefix('api');
    await app.init();

    fixtureFactory = new FixtureFactory(app);
  });

  afterAll(async () => {
    await app.close();
  });

  test('Retrieve all orders', ({ given, and, when, then }) => {
    let customers: Customer[];
    let products: Product[];
    let orders: Order[];
    let response: request.Response;

    given('the application is running', () => {
      expect(app).toBeDefined();
    });

    and('the database is clean', async () => {
      await fixtureFactory.clearAll();
    });

    given('a customer exists', async () => {
      const customer = await fixtureFactory.createCustomer();
      customers = [customer];
    });

    and(/(\d+) products exist/, async (count: string) => {
      products = await fixtureFactory.createProducts(parseInt(count, 10));
    });

    and(/the customer has (\d+) orders with these products/, async (count: string) => {
      orders = [];
      const numOrders = parseInt(count, 10);
      for (let i = 0; i < numOrders; i++) {
        const order = await fixtureFactory.createOrder({
          customer: customers[0],
          products: products,
          totalAmount: products.reduce((sum, p) => sum + Number(p.price), 0),
        });
        orders.push(order);
      }
    });

    when('I request all orders', async () => {
      response = await request(app.getHttpServer()).get('/api/orders');
    });

    then(/the response status should be (\d+)/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and(/the response should contain (\d+) orders/, (count: string) => {
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(parseInt(count, 10));
    });

    and('each order should have customer information', () => {
      response.body.forEach((order: any) => {
        expect(order.customer).toBeDefined();
        expect(order.customer.id).toBeDefined();
      });
    });

    and('each order should have product information', () => {
      response.body.forEach((order: any) => {
        expect(order.products).toBeDefined();
        expect(Array.isArray(order.products)).toBe(true);
      });
    });
  });

  test('Filter orders by pending status', ({ given, and, when, then }) => {
    let customers: Customer[];
    let products: Product[];
    let response: request.Response;

    given('the application is running', () => {
      expect(app).toBeDefined();
    });

    and('the database is clean', async () => {
      await fixtureFactory.clearAll();
    });

    given('a customer exists', async () => {
      const customer = await fixtureFactory.createCustomer();
      customers = [customer];
    });

    and(/(\d+) products exist/, async (count: string) => {
      products = await fixtureFactory.createProducts(parseInt(count, 10));
    });

    and(/the customer has an order with status "([^"]*)"/, async (status: string) => {
      await fixtureFactory.createOrder({
        customer: customers[0],
        products: products,
        status: status as any,
        totalAmount: products.reduce((sum, p) => sum + Number(p.price), 0),
      });
    });

    and(/the customer has an order with status "([^"]*)"/, async (status: string) => {
      await fixtureFactory.createOrder({
        customer: customers[0],
        products: products,
        status: status as any,
        totalAmount: products.reduce((sum, p) => sum + Number(p.price), 0),
      });
    });

    when(/I request orders with status "([^"]*)"/, async (status: string) => {
      response = await request(app.getHttpServer()).get(`/api/orders?status=${status}`);
    });

    then(/the response status should be (\d+)/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and(/all returned orders should have status "([^"]*)"/, (status: string) => {
      response.body.forEach((order: any) => {
        expect(order.status).toBe(status);
      });
    });
  });

  test('Retrieve a specific order by ID', ({ given, and, when, then }) => {
    let customers: Customer[];
    let products: Product[];
    let currentOrder: Order;
    let response: request.Response;

    given('the application is running', () => {
      expect(app).toBeDefined();
    });

    and('the database is clean', async () => {
      await fixtureFactory.clearAll();
    });

    given('a customer exists', async () => {
      const customer = await fixtureFactory.createCustomer();
      customers = [customer];
    });

    and(/(\d+) products exist/, async (count: string) => {
      products = await fixtureFactory.createProducts(parseInt(count, 10));
    });

    and('the customer has an order with these products', async () => {
      currentOrder = await fixtureFactory.createOrder({
        customer: customers[0],
        products: products,
        totalAmount: products.reduce((sum, p) => sum + Number(p.price), 0),
      });
    });

    when('I request the order by its ID', async () => {
      response = await request(app.getHttpServer()).get(`/api/orders/${currentOrder.id}`);
    });

    then(/the response status should be (\d+)/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and('the response should contain the order details', () => {
      expect(response.body.id).toBe(currentOrder.id);
    });

    and('the order should have customer information', () => {
      expect(response.body.customer).toBeDefined();
      expect(response.body.customer.id).toBe(customers[0].id);
    });

    and('the order should have product information', () => {
      expect(response.body.products).toBeDefined();
      expect(Array.isArray(response.body.products)).toBe(true);
    });
  });

  test('Retrieve orders for a specific customer', ({ given, and, when, then }) => {
    let customers: Customer[];
    let products: Product[];
    let response: request.Response;

    given('the application is running', () => {
      expect(app).toBeDefined();
    });

    and('the database is clean', async () => {
      await fixtureFactory.clearAll();
    });

    given(/(\d+) customers exist/, async (count: string) => {
      customers = await fixtureFactory.createCustomers(parseInt(count, 10));
    });

    and(/(\d+) products exist/, async (count: string) => {
      products = await fixtureFactory.createProducts(parseInt(count, 10));
    });

    and(/customer (\d+) has (\d+) orders/, async (customerIndex: string, orderCount: string) => {
      const custIdx = parseInt(customerIndex, 10) - 1;
      const numOrders = parseInt(orderCount, 10);
      for (let i = 0; i < numOrders; i++) {
        await fixtureFactory.createOrder({
          customer: customers[custIdx],
          products: products,
          totalAmount: products.reduce((sum, p) => sum + Number(p.price), 0),
        });
      }
    });

    and(/customer (\d+) has (\d+) order/, async (customerIndex: string, orderCount: string) => {
      const custIdx = parseInt(customerIndex, 10) - 1;
      const numOrders = parseInt(orderCount, 10);
      for (let i = 0; i < numOrders; i++) {
        await fixtureFactory.createOrder({
          customer: customers[custIdx],
          products: products,
          totalAmount: products.reduce((sum, p) => sum + Number(p.price), 0),
        });
      }
    });

    when(/I request orders for customer (\d+)/, async (customerIndex: string) => {
      const custIdx = parseInt(customerIndex, 10) - 1;
      response = await request(app.getHttpServer())
        .get(`/api/orders/customer/${customers[custIdx].id}`);
    });

    then(/the response status should be (\d+)/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and(/the response should contain (\d+) orders/, (count: string) => {
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(parseInt(count, 10));
    });

    and(/all returned orders should belong to customer (\d+)/, (customerIndex: string) => {
      const custIdx = parseInt(customerIndex, 10) - 1;
      response.body.forEach((order: any) => {
        expect(order.customer.id).toBe(customers[custIdx].id);
      });
    });
  });
});
