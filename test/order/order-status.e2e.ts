import { loadFeature, defineFeature } from 'jest-cucumber';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { FixtureFactory } from '../helpers/fixture-factory';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { Order, OrderStatus } from '../../src/entities/order.entity';
import * as request from 'supertest';

const feature = loadFeature('./test/features/order/order-status.feature');

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

  test('Update order status from ready to delivered', ({ given, and, when, then }) => {
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

    and(/the customer has an order with status "([^"]*)"/, async (status: string) => {
      currentOrder = await fixtureFactory.createOrder({
        customer: customers[0],
        products: products,
        status: status as OrderStatus,
        totalAmount: products.reduce((sum, p) => sum + Number(p.price), 0),
      });
    });

    when(/I update the order status to "([^"]*)"/, async (status: string) => {
      response = await request(app.getHttpServer())
        .patch(`/api/orders/${currentOrder.id}/status`)
        .send({ status });
    });

    then(/the response status should be (\d+)/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and(/the order status should be "([^"]*)"/, (status: string) => {
      expect(response.body.status).toBe(status);
    });
  });

  test('Prevent invalid status transition from delivered to preparing', ({ given, and, when, then }) => {
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

    and(/the customer has an order with status "([^"]*)"/, async (status: string) => {
      currentOrder = await fixtureFactory.createOrder({
        customer: customers[0],
        products: products,
        status: status as OrderStatus,
        totalAmount: products.reduce((sum, p) => sum + Number(p.price), 0),
      });
    });

    when(/I update the order status to "([^"]*)"/, async (status: string) => {
      response = await request(app.getHttpServer())
        .patch(`/api/orders/${currentOrder.id}/status`)
        .send({ status });
    });

    then(/the response status should be (\d+)/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });
  });

  test('Cancel a pending order', ({ given, and, when, then }) => {
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

    and(/the customer has an order with status "([^"]*)"/, async (status: string) => {
      currentOrder = await fixtureFactory.createOrder({
        customer: customers[0],
        products: products,
        status: status as OrderStatus,
        totalAmount: products.reduce((sum, p) => sum + Number(p.price), 0),
      });
    });

    when('I cancel the order', async () => {
      response = await request(app.getHttpServer())
        .delete(`/api/orders/${currentOrder.id}`);
    });

    then(/the response status should be (\d+)/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and('when I retrieve the order it should have status "cancelled"', async () => {
      const getResponse = await request(app.getHttpServer())
        .get(`/api/orders/${currentOrder.id}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.status).toBe(OrderStatus.CANCELLED);
    });
  });

  test('Cancel a preparing order', ({ given, and, when, then }) => {
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

    and(/the customer has an order with status "([^"]*)"/, async (status: string) => {
      currentOrder = await fixtureFactory.createOrder({
        customer: customers[0],
        products: products,
        status: status as OrderStatus,
        totalAmount: products.reduce((sum, p) => sum + Number(p.price), 0),
      });
    });

    when('I cancel the order', async () => {
      response = await request(app.getHttpServer())
        .delete(`/api/orders/${currentOrder.id}`);
    });

    then(/the response status should be (\d+)/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and('when I retrieve the order it should have status "cancelled"', async () => {
      const getResponse = await request(app.getHttpServer())
        .get(`/api/orders/${currentOrder.id}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.status).toBe(OrderStatus.CANCELLED);
    });
  });
});
