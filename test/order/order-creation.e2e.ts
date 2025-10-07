import { loadFeature, defineFeature } from 'jest-cucumber';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { FixtureFactory } from '../helpers/fixture-factory';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import * as request from 'supertest';
import { CreateOrderDto } from '../../src/order/dto/create-order.dto';

const feature = loadFeature('./test/features/order/order-creation.feature');

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

  test('Create a new order with valid data', ({ given, and, when, then }) => {
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

    when('I create an order with the following details:', async (table) => {
      const data = table.reduce((acc: any, row: any) => {
        acc[row.field] = row.value;
        return acc;
      }, {});

      const productCount = parseInt(data.productCount, 10);
      const selectedProducts = products.slice(0, productCount);

      const createOrderDto: CreateOrderDto = {
        customerId: customers[0].id,
        productIds: selectedProducts.map(p => p.id),
        totalAmount: parseFloat(data.totalAmount),
        notes: data.notes,
      };

      response = await request(app.getHttpServer())
        .post('/api/orders')
        .send(createOrderDto);
    });

    then(/the response status should be (\d+)/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and(/the order status should be "([^"]*)"/, (status: string) => {
      expect(response.body.status).toBe(status);
    });

    and(/the order total amount should be (.+)/, (amount: string) => {
      expect(response.body.totalAmount).toBe(parseFloat(amount));
    });

    and(/the order notes should be "([^"]*)"/, (notes: string) => {
      expect(response.body.notes).toBe(notes);
    });

    and(/the order should have (\d+) products/, (count: string) => {
      expect(response.body.products.length).toBe(parseInt(count, 10));
    });
  });

  test('Create an order without notes', ({ given, and, when, then }) => {
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

    when('I create an order with the following details:', async (table) => {
      const data = table.reduce((acc: any, row: any) => {
        acc[row.field] = row.value;
        return acc;
      }, {});

      const productCount = parseInt(data.productCount, 10);
      const selectedProducts = products.slice(0, productCount);

      const createOrderDto: CreateOrderDto = {
        customerId: customers[0].id,
        productIds: selectedProducts.map(p => p.id),
        totalAmount: parseFloat(data.totalAmount),
      };

      response = await request(app.getHttpServer())
        .post('/api/orders')
        .send(createOrderDto);
    });

    then(/the response status should be (\d+)/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and(/the order status should be "([^"]*)"/, (status: string) => {
      expect(response.body.status).toBe(status);
    });

    and(/the order should have (\d+) products/, (count: string) => {
      expect(response.body.products.length).toBe(parseInt(count, 10));
    });
  });
});
