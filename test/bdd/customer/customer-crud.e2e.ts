import { loadFeature, defineFeature } from "jest-cucumber";
import { Context, cleanAllTables } from "../context";
import {
  givenTheCustomerExists,
  givenTheCustomerExistsWithEmail,
  givenTheProductExistsWithProperties,
  givenTheOrderExists,
} from "../steps/shared/given";
import {
  whenApiIsCalled,
  whenApiIsCalledWithBody,
  whenApiIsCalledWithQuery,
} from "../steps/shared/when";
import {
  thenResponseStatusCode,
  thenResponseBodyIsArrayWithAtLeast,
  thenResponseBodyContainsItemWithProperty,
  thenResponseBodyDoesNotContainItemWithProperty,
  thenResponseBodyHasProperty,
} from "../steps/shared/then";

const feature = loadFeature(
  "test/bdd/features/customer/customer-crud.feature"
);

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

  test("OK case - Get all active customers", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheCustomerExistsWithEmail(given, context);
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyIsArrayWithAtLeast(then, context);
    thenResponseBodyContainsItemWithProperty(then, context);
    thenResponseBodyContainsItemWithProperty(then, context);
  });

  test("OK case - Get customer by ID", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasProperty(then, context);
    thenResponseBodyHasProperty(then, context);
  });

  test("KO case - Get non-existent customer returns 404", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
  });

  test("OK case - Create a new customer", ({ given, when, then }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasProperty(then, context);
    thenResponseBodyHasProperty(then, context);
    thenResponseBodyHasProperty(then, context);
  });

  test("OK case - Update a customer", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasProperty(then, context);
    thenResponseBodyHasProperty(then, context);
    thenResponseBodyHasProperty(then, context);
  });

  test("OK case - Soft delete a customer", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    whenApiIsCalled(when, context);
    thenResponseBodyDoesNotContainItemWithProperty(then, context);
  });

  test("OK case - Partial update of customer", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasProperty(then, context);
    thenResponseBodyHasProperty(then, context);
    thenResponseBodyHasProperty(then, context);
  });

  test("OK case - Get customers with order history", ({
    given,
    when,
    then,
  }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheOrderExists(given, context);
    whenApiIsCalledWithQuery(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyIsArrayWithAtLeast(then, context);
  });
});
