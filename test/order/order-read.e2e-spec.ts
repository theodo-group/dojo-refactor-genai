import { loadFeature, defineFeature } from 'jest-cucumber';
import { Context } from '../context';
import { givenTheCustomerExists } from '../shared-steps/customer.steps';
import { givenTheProductExistsWithPrice } from '../shared-steps/product.steps';
import { givenTheOrderExists, thenTheNumberOfOrdersShouldBe, thenAllOrdersShouldHaveStatus, thenAllOrdersShouldHaveCustomerAndProducts, thenTheOrderShouldBelongToCustomer, thenAllOrdersShouldBelongToCustomer, thenTheOrderShouldHaveProductCount } from '../shared-steps/order.steps';
import { whenGetRequestIsMadeTo, thenTheResponseStatusCodeShouldBe, thenTheResponseShouldBeAnArray, thenTheResponseShouldHaveId, thenTheResponseBodyShouldMatchOrder } from '../shared-steps/api.steps';

const feature = loadFeature('test/features/order-read.feature');

defineFeature(feature, (test) => {
  const context = new Context();

  beforeAll(async () => {
    await context.createAndStartApp();
  });

  afterEach(async () => {
    context.cleanContextualData();
    await context.cleanAllTables();
  });

  afterAll(async () => {
    await context.cleanAndStopApp();
  });

  test('OK case - Get all orders', ({ given, when, then }) => {
    givenTheCustomerExists(given, context);
    givenTheCustomerExists(given, context);
    givenTheProductExistsWithPrice(given, context);
    givenTheProductExistsWithPrice(given, context);
    givenTheOrderExists(given, context);
    givenTheOrderExists(given, context);
    whenGetRequestIsMadeTo(when, context);
    thenTheResponseStatusCodeShouldBe(then, context);
    thenTheResponseShouldBeAnArray(then, context);
    thenTheNumberOfOrdersShouldBe(then, context);
    thenAllOrdersShouldHaveCustomerAndProducts(then, context);
  });

  test('OK case - Get orders filtered by status', ({ given, when, then }) => {
    givenTheCustomerExists(given, context);
    givenTheProductExistsWithPrice(given, context);
    givenTheProductExistsWithPrice(given, context);
    givenTheOrderExists(given, context);
    givenTheOrderExists(given, context);
    whenGetRequestIsMadeTo(when, context);
    thenTheResponseStatusCodeShouldBe(then, context);
    thenTheResponseShouldBeAnArray(then, context);
    thenAllOrdersShouldHaveStatus(then, context);
  });

  test('OK case - Get order by id', ({ given, when, then }) => {
    givenTheCustomerExists(given, context);
    givenTheProductExistsWithPrice(given, context);
    givenTheOrderExists(given, context);
    whenGetRequestIsMadeTo(when, context);
    thenTheResponseStatusCodeShouldBe(then, context);
    thenTheResponseShouldHaveId(then, context);
    thenTheResponseBodyShouldMatchOrder(then, context);
    thenTheOrderShouldBelongToCustomer(then, context);
    thenTheOrderShouldHaveProductCount(then, context);
  });

  test('OK case - Get orders for a customer', ({ given, when, then }) => {
    givenTheCustomerExists(given, context);
    givenTheCustomerExists(given, context);
    givenTheProductExistsWithPrice(given, context);
    givenTheProductExistsWithPrice(given, context);
    givenTheOrderExists(given, context);
    givenTheOrderExists(given, context);
    givenTheOrderExists(given, context);
    whenGetRequestIsMadeTo(when, context);
    thenTheResponseStatusCodeShouldBe(then, context);
    thenTheResponseShouldBeAnArray(then, context);
    thenTheNumberOfOrdersShouldBe(then, context);
    thenAllOrdersShouldBelongToCustomer(then, context);
  });
});
