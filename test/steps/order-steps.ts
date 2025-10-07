import { DefineStepFunction } from 'jest-cucumber';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Order, OrderStatus } from '../../src/entities/order.entity';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { FixtureFactory } from '../helpers/fixture-factory';
import { CreateOrderDto } from '../../src/order/dto/create-order.dto';

export interface OrderStepsContext {
  app: INestApplication;
  fixtureFactory: FixtureFactory;
  customers: Customer[];
  products: Product[];
  orders: Order[];
  response: request.Response;
  currentOrder: Order;
}

export const defineOrderSteps = (defineStep: DefineStepFunction, context: OrderStepsContext) => {
  defineStep('the customer has an order with these products', async () => {
    const order = await context.fixtureFactory.createOrder({
      customer: context.customers[0],
      products: context.products,
      totalAmount: context.products.reduce((sum, p) => sum + Number(p.price), 0),
    });
    context.orders = [order];
    context.currentOrder = order;
  });

  defineStep(/the customer has (\d+) orders? with these products/, async (count: string) => {
    const numOrders = parseInt(count, 10);
    context.orders = [];
    for (let i = 0; i < numOrders; i++) {
      const order = await context.fixtureFactory.createOrder({
        customer: context.customers[0],
        products: context.products,
        totalAmount: context.products.reduce((sum, p) => sum + Number(p.price), 0),
      });
      context.orders.push(order);
    }
  });

  defineStep(/the customer has an order with status "([^"]*)"/, async (status: string) => {
    const order = await context.fixtureFactory.createOrder({
      customer: context.customers[0],
      products: context.products,
      status: status as OrderStatus,
      totalAmount: context.products.reduce((sum, p) => sum + Number(p.price), 0),
    });
    context.orders = [order];
    context.currentOrder = order;
  });

  defineStep(/customer (\d+) has (\d+) orders?/, async (customerIndex: string, orderCount: string) => {
    const custIdx = parseInt(customerIndex, 10) - 1;
    const numOrders = parseInt(orderCount, 10);

    for (let i = 0; i < numOrders; i++) {
      const order = await context.fixtureFactory.createOrder({
        customer: context.customers[custIdx],
        products: context.products,
        totalAmount: context.products.reduce((sum, p) => sum + Number(p.price), 0),
      });
      context.orders.push(order);
    }
  });

  defineStep('I request all orders', async () => {
    context.response = await request(context.app.getHttpServer())
      .get('/api/orders');
  });

  defineStep(/I request orders with status "([^"]*)"/, async (status: string) => {
    context.response = await request(context.app.getHttpServer())
      .get(`/api/orders?status=${status}`);
  });

  defineStep('I request the order by its ID', async () => {
    context.response = await request(context.app.getHttpServer())
      .get(`/api/orders/${context.currentOrder.id}`);
  });

  defineStep(/I request orders for customer (\d+)/, async (customerIndex: string) => {
    const custIdx = parseInt(customerIndex, 10) - 1;
    context.response = await request(context.app.getHttpServer())
      .get(`/api/orders/customer/${context.customers[custIdx].id}`);
  });

  defineStep('I create an order with the following details:', async (table) => {
    const data = table.reduce((acc: any, row: any) => {
      acc[row.field] = row.value;
      return acc;
    }, {});

    const productCount = parseInt(data.productCount, 10);
    const selectedProducts = context.products.slice(0, productCount);

    const createOrderDto: CreateOrderDto = {
      customerId: context.customers[0].id,
      productIds: selectedProducts.map(p => p.id),
      totalAmount: parseFloat(data.totalAmount),
      notes: data.notes,
    };

    context.response = await request(context.app.getHttpServer())
      .post('/api/orders')
      .send(createOrderDto);
  });

  defineStep(/I update the order status to "([^"]*)"/, async (status: string) => {
    context.response = await request(context.app.getHttpServer())
      .patch(`/api/orders/${context.currentOrder.id}/status`)
      .send({ status });
  });

  defineStep('I cancel the order', async () => {
    context.response = await request(context.app.getHttpServer())
      .delete(`/api/orders/${context.currentOrder.id}`);
  });

  defineStep(/the response status should be (\d+)/, (statusCode: string) => {
    expect(context.response.status).toBe(parseInt(statusCode, 10));
  });

  defineStep(/the response should contain (\d+) orders?/, (count: string) => {
    expect(Array.isArray(context.response.body)).toBe(true);
    expect(context.response.body.length).toBe(parseInt(count, 10));
  });

  defineStep('each order should have customer information', () => {
    context.response.body.forEach((order: any) => {
      expect(order.customer).toBeDefined();
      expect(order.customer.id).toBeDefined();
    });
  });

  defineStep('each order should have product information', () => {
    context.response.body.forEach((order: any) => {
      expect(order.products).toBeDefined();
      expect(Array.isArray(order.products)).toBe(true);
    });
  });

  defineStep(/all returned orders should have status "([^"]*)"/, (status: string) => {
    context.response.body.forEach((order: any) => {
      expect(order.status).toBe(status);
    });
  });

  defineStep('the response should contain the order details', () => {
    expect(context.response.body.id).toBe(context.currentOrder.id);
  });

  defineStep('the order should have customer information', () => {
    expect(context.response.body.customer).toBeDefined();
    expect(context.response.body.customer.id).toBe(context.customers[0].id);
  });

  defineStep('the order should have product information', () => {
    expect(context.response.body.products).toBeDefined();
    expect(Array.isArray(context.response.body.products)).toBe(true);
  });

  defineStep(/all returned orders should belong to customer (\d+)/, (customerIndex: string) => {
    const custIdx = parseInt(customerIndex, 10) - 1;
    context.response.body.forEach((order: any) => {
      expect(order.customer.id).toBe(context.customers[custIdx].id);
    });
  });

  defineStep(/the order status should be "([^"]*)"/, (status: string) => {
    expect(context.response.body.status).toBe(status);
  });

  defineStep(/the order total amount should be (.+)/, (amount: string) => {
    expect(context.response.body.totalAmount).toBe(parseFloat(amount));
  });

  defineStep(/the order notes should be "([^"]*)"/, (notes: string) => {
    expect(context.response.body.notes).toBe(notes);
  });

  defineStep(/the order should have (\d+) products?/, (count: string) => {
    expect(context.response.body.products.length).toBe(parseInt(count, 10));
  });

  defineStep('when I retrieve the order it should have status "cancelled"', async () => {
    const getResponse = await request(context.app.getHttpServer())
      .get(`/api/orders/${context.currentOrder.id}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.status).toBe(OrderStatus.CANCELLED);
  });
};
