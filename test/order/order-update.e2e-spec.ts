import { loadFeature, defineFeature } from 'jest-cucumber';
import { Context } from '../context';
import { givenTheCustomerExists } from '../shared-steps/customer.steps';
import { givenTheProductExistsWithPrice } from '../shared-steps/product.steps';
import { givenTheOrderExists, thenTheOrderShouldHaveStatus } from '../shared-steps/order.steps';
import { whenPatchRequestIsMadeToWithBody, thenTheResponseStatusCodeShouldBe, thenTheResponseBodyShouldMatchOrder } from '../shared-steps/api.steps';

const feature = loadFeature('test/features/order-update.feature');

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

  test('OK case - Update order status', ({ given, when, then }) => {
    givenTheCustomerExists(given, context);
    givenTheProductExistsWithPrice(given, context);
    givenTheOrderExists(given, context);
    whenPatchRequestIsMadeToWithBody(when, context);
    thenTheResponseStatusCodeShouldBe(then, context);
    thenTheResponseBodyShouldMatchOrder(then, context);
    thenTheOrderShouldHaveStatus(then, context);
  });

  test('KO case - Prevent invalid status transitions', ({ given, when, then }) => {
    givenTheCustomerExists(given, context);
    givenTheProductExistsWithPrice(given, context);
    givenTheOrderExists(given, context);
    whenPatchRequestIsMadeToWithBody(when, context);
    thenTheResponseStatusCodeShouldBe(then, context);
  });
});
