import { DefineStepFunction } from 'jest-cucumber';
import { Context } from '../context';
import { OrderStatus } from '../../src/entities/order.entity';

export const givenTheOrderExists = (given: DefineStepFunction, context: Context) => {
  given(/^the order "([^"]*)" exists for customer "([^"]*)" with products "([^"]*)" and status "([^"]*)"$/, async (orderName, customerName, productNames, status) => {
    const customer = context.data[customerName];
    const productNameList = productNames.split(',').map(name => name.trim());
    const products = productNameList.map(name => context.data[name]);

    const totalAmount = products.reduce((sum, product) => sum + parseFloat(product.price), 0);

    const order = context.getOrderRepository().create({
      customer: customer,
      products: products,
      totalAmount: totalAmount,
      status: status as OrderStatus,
      notes: null,
    });

    const savedOrder = await context.getOrderRepository().save(order);
    context.data[orderName] = savedOrder;
  });
};

export const givenTheOrderExistsWithNotes = (given: DefineStepFunction, context: Context) => {
  given(/^the order "([^"]*)" exists for customer "([^"]*)" with products "([^"]*)", status "([^"]*)", and notes "([^"]*)"$/, async (orderName, customerName, productNames, status, notes) => {
    const customer = context.data[customerName];
    const productNameList = productNames.split(',').map(name => name.trim());
    const products = productNameList.map(name => context.data[name]);

    const totalAmount = products.reduce((sum, product) => sum + parseFloat(product.price), 0);

    const order = context.getOrderRepository().create({
      customer: customer,
      products: products,
      totalAmount: totalAmount,
      status: status as OrderStatus,
      notes: notes,
    });

    const savedOrder = await context.getOrderRepository().save(order);
    context.data[orderName] = savedOrder;
  });
};

export const thenTheOrderShouldHaveStatus = (then: DefineStepFunction, context: Context) => {
  then(/^the order "([^"]*)" should have status "([^"]*)"$/, async (orderName, expectedStatus) => {
    const order = await context.getOrderRepository().findOne({
      where: { id: context.data[orderName].id },
    });

    expect(order.status).toBe(expectedStatus);
  });
};

export const thenTheNumberOfOrdersShouldBe = (then: DefineStepFunction, context: Context) => {
  then(/^the number of orders should be (\d+)$/, async (count) => {
    const orders = context.response.body;
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBe(parseInt(count));
  });
};

export const thenAllOrdersShouldHaveStatus = (then: DefineStepFunction, context: Context) => {
  then(/^all orders should have status "([^"]*)"$/, async (expectedStatus) => {
    const orders = context.response.body;
    expect(Array.isArray(orders)).toBe(true);
    orders.forEach((order) => {
      expect(order.status).toBe(expectedStatus);
    });
  });
};

export const thenAllOrdersShouldHaveCustomerAndProducts = (then: DefineStepFunction, context: Context) => {
  then(/^all orders should have customer and products$/, async () => {
    const orders = context.response.body;
    expect(Array.isArray(orders)).toBe(true);
    orders.forEach((order) => {
      expect(order.customer).toBeDefined();
      expect(order.products).toBeDefined();
      expect(Array.isArray(order.products)).toBe(true);
    });
  });
};

export const thenTheOrderShouldBelongToCustomer = (then: DefineStepFunction, context: Context) => {
  then(/^the order should belong to customer "([^"]*)"$/, async (customerName) => {
    const order = context.response.body;
    const customer = context.data[customerName];
    expect(order.customer.id).toBe(customer.id);
  });
};

export const thenAllOrdersShouldBelongToCustomer = (then: DefineStepFunction, context: Context) => {
  then(/^all orders should belong to customer "([^"]*)"$/, async (customerName) => {
    const orders = context.response.body;
    const customer = context.data[customerName];
    expect(Array.isArray(orders)).toBe(true);
    orders.forEach((order) => {
      expect(order.customer.id).toBe(customer.id);
    });
  });
};

export const thenTheOrderShouldHaveProductCount = (then: DefineStepFunction, context: Context) => {
  then(/^the order should have (\d+) products?$/, async (count) => {
    const order = context.response.body;
    expect(Array.isArray(order.products)).toBe(true);
    expect(order.products.length).toBe(parseInt(count));
  });
};

export const thenTheOrderShouldHaveNotes = (then: DefineStepFunction, context: Context) => {
  then(/^the order should have notes "([^"]*)"$/, async (expectedNotes) => {
    const order = context.response.body;
    expect(order.notes).toBe(expectedNotes);
  });
};

export const thenTheOrderShouldHaveTotalAmount = (then: DefineStepFunction, context: Context) => {
  then(/^the order should have total amount "([^"]*)"$/, async (expectedAmount) => {
    const order = context.response.body;
    expect(order.totalAmount).toBe(parseFloat(expectedAmount));
  });
};
