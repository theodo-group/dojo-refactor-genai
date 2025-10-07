import { loadFeature, defineFeature } from 'jest-cucumber';
import { Context } from '../context';
import { givenTheCustomerExists } from '../shared-steps/customer.steps';
import { givenTheProductExistsWithPrice } from '../shared-steps/product.steps';
import { thenTheOrderShouldBelongToCustomer, thenTheOrderShouldHaveProductCount, thenTheOrderShouldHaveNotes, thenTheOrderShouldHaveTotalAmount } from '../shared-steps/order.steps';
import { whenPostRequestIsMadeToWithBody, thenTheResponseStatusCodeShouldBe, thenTheResponseShouldHaveId } from '../shared-steps/api.steps';

const feature = loadFeature('test/features/order-create.feature');

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

  test('OK case - Create a new order', ({ given, when, then }) => {
    givenTheCustomerExists(given, context);
    givenTheProductExistsWithPrice(given, context);
    givenTheProductExistsWithPrice(given, context);
    whenPostRequestIsMadeToWithBody(when, context);
    thenTheResponseStatusCodeShouldBe(then, context);
    thenTheResponseShouldHaveId(then, context);
    thenTheOrderShouldBelongToCustomer(then, context);
    thenTheOrderShouldHaveProductCount(then, context);
    thenTheOrderShouldHaveNotes(then, context);
    thenTheOrderShouldHaveTotalAmount(then, context);
  });
});
