import { loadFeature, defineFeature } from "jest-cucumber";
import { Context, cleanAllTables } from "../context";
import {
  givenTheProductExists,
  givenTheProductExistsWithProperties,
  givenTheCustomerExists,
  givenTheOrderExistsWithStatus,
} from "../steps/shared/given";
import {
  whenApiIsCalled,
  whenApiIsCalledWithBody,
} from "../steps/shared/when";
import {
  thenResponseStatusCode,
  thenResponseBodyIsArrayWithAtLeast,
  thenResponseBodyContainsItemWithProperty,
  thenResponseBodyDoesNotContainItemWithProperty,
  thenResponseBodyHasProperty,
  thenResponseBodyPropertyEquals,
  thenStoreResponseBodyAs,
  thenResponseMessageContains,
} from "../steps/shared/then";

const feature = loadFeature(
  "test/bdd/features/product/product-crud.feature"
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

  test("OK case - Get all available products", ({ given, when, then }) => {
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyIsArrayWithAtLeast(then, context);
    thenResponseBodyContainsItemWithProperty(then, context);
    thenResponseBodyContainsItemWithProperty(then, context);
  });

  test("OK case - Get product by ID", ({ given, when, then }) => {
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasProperty(then, context);
    thenResponseBodyPropertyEquals(then, context);
  });

  test("KO case - Get non-existent product returns 404", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
  });

  test("OK case - Create a new product", ({ given, when, then }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasProperty(then, context);
    thenResponseBodyHasProperty(then, context);
    thenStoreResponseBodyAs(then, context);
  });

  test("OK case - Update a product", ({ given, when, then }) => {
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasProperty(then, context);
    thenResponseBodyPropertyEquals(then, context);
  });

  test("OK case - Delete a product (soft delete)", ({ given, when, then }) => {
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    whenApiIsCalled(when, context);
    thenResponseBodyDoesNotContainItemWithProperty(then, context);
  });

  test("KO case - Delete product in active order should fail", ({
    given,
    when,
    then,
  }) => {
    givenTheCustomerExists(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheOrderExistsWithStatus(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseMessageContains(then, context);
  });

  test("OK case - Partial update of product", ({ given, when, then }) => {
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasProperty(then, context);
    thenResponseBodyHasProperty(then, context);
    thenResponseBodyHasProperty(then, context);
  });
});
