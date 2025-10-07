import { loadFeature, defineFeature } from "jest-cucumber";
import { Context, cleanAllTables } from "../context";
import {
  givenTheCustomerExistsWithEmail,
  givenTheProductExistsWithProperties,
  givenTheOrderExists,
  givenTheOrderExistsWithStatus,
} from "../steps/shared/given";
import {
  whenApiIsCalled,
  whenApiIsCalledWithBody,
  whenApiIsCalledWithQuery,
} from "../steps/shared/when";
import {
  thenResponseStatusCode,
  thenResponseBodyIsArrayWithAtLeast,
  thenResponseBodyHasPropertyDefined,
  thenResponseBodyPropertyEquals,
  thenResponseBodyHasProperty,
} from "../steps/shared/then";

const feature = loadFeature("test/bdd/features/order/order-crud.feature");

defineFeature(feature, (test) => {
  const context = new Context();

  beforeAll(async () => {
    await context.createAndStartApp();
  });

  afterEach(async () => {
    context.cleanContextualData();
    await cleanAllTables(context);
  });

  afterAll(async () => {
    await context.cleanAndStopApp();
  });

  test("OK case - Get all orders", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheOrderExists(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyIsArrayWithAtLeast(then, context);
  });

  test("OK case - Get order by ID", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheOrderExists(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
    thenResponseBodyPropertyEquals(then, context);
  });

  test("OK case - Get orders for a customer", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheOrderExists(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyIsArrayWithAtLeast(then, context);
  });

  test("OK case - Filter orders by status", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheOrderExistsWithStatus(given, context);
    whenApiIsCalledWithQuery(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyIsArrayWithAtLeast(then, context);
  });

  test("OK case - Create a new order", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyPropertyEquals(then, context);
    thenResponseBodyHasProperty(then, context);
  });

  test("OK case - Update order status", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheOrderExistsWithStatus(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyPropertyEquals(then, context);
  });

  test("KO case - Prevent invalid status transitions", ({
    given,
    when,
    then,
  }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheOrderExistsWithStatus(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("OK case - Cancel an order", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheOrderExistsWithStatus(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyPropertyEquals(then, context);
  });
});
