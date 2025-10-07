import { loadFeature, defineFeature } from 'jest-cucumber';
import { Context } from '../context';
import { givenTheCustomerExists } from '../shared-steps/customer.steps';
import { givenTheProductExistsWithPrice } from '../shared-steps/product.steps';
import { givenTheOrderExists, thenTheOrderShouldHaveStatus } from '../shared-steps/order.steps';
import { whenDeleteRequestIsMadeTo, whenGetRequestIsMadeTo, thenTheResponseStatusCodeShouldBe } from '../shared-steps/api.steps';

const feature = loadFeature('test/features/order-delete.feature');

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

  test('OK case - Cancel a pending order', ({ given, when, then }) => {
    givenTheCustomerExists(given, context);
    givenTheProductExistsWithPrice(given, context);
    givenTheOrderExists(given, context);
    whenDeleteRequestIsMadeTo(when, context);
    thenTheResponseStatusCodeShouldBe(then, context);
    whenGetRequestIsMadeTo(when, context);
    thenTheResponseStatusCodeShouldBe(then, context);
    thenTheOrderShouldHaveStatus(then, context);
  });
});
