import { loadFeature, defineFeature } from "jest-cucumber";
import { Context, cleanAllTables } from "../context";
import {
  givenTheProductExistsWithProperties,
  givenTheUnavailableProductExists,
} from "../steps/shared/given";
import {
  whenApiIsCalled,
  whenApiIsCalledWithQuery,
  whenApiIsCalledWithBody,
} from "../steps/shared/when";
import {
  thenResponseStatusCode,
  thenResponseBodyIsArrayWithLength,
  thenResponseBodyIsArrayWithAtLeast,
  thenResponseBodyContainsItemWithProperty,
  thenResponseBodyDoesNotContainItemWithProperty,
  thenResponseBodyHasProperty,
} from "../steps/shared/then";

const feature = loadFeature(
  "test/bdd/features/product/product-filters.feature"
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

  test("OK case - Filter products by category", ({ given, when, then }) => {
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalledWithQuery(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyIsArrayWithLength(then, context);
    thenResponseBodyContainsItemWithProperty(then, context);
    thenResponseBodyContainsItemWithProperty(then, context);
  });

  test("OK case - Filter by non-existent category returns empty array", ({
    given,
    when,
    then,
  }) => {
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalledWithQuery(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyIsArrayWithLength(then, context);
  });

  test("OK case - Filter unavailable products", ({ given, when, then }) => {
    givenTheProductExistsWithProperties(given, context);
    givenTheUnavailableProductExists(given, context);
    whenApiIsCalledWithQuery(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyContainsItemWithProperty(then, context);
  });

  test("OK case - Sort products by price ascending", ({
    given,
    when,
    then,
  }) => {
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalledWithQuery(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyIsArrayWithAtLeast(then, context);
  });

  test("OK case - Sort products by price descending", ({
    given,
    when,
    then,
  }) => {
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalledWithQuery(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyIsArrayWithAtLeast(then, context);
  });

  test("OK case - Filter by price range", ({ given, when, then }) => {
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalledWithQuery(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyIsArrayWithAtLeast(then, context);
  });

  test("OK case - Search products by name", ({ given, when, then }) => {
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalledWithQuery(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyContainsItemWithProperty(then, context);
    thenResponseBodyContainsItemWithProperty(then, context);
  });

  test("OK case - Paginate results", ({ given, when, then }) => {
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalledWithQuery(when, context);
    thenResponseStatusCode(then, context);
  });

  test("OK case - Update product availability", ({ given, when, then }) => {
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasProperty(then, context);
    whenApiIsCalled(when, context);
    thenResponseBodyDoesNotContainItemWithProperty(then, context);
  });

  test("KO case - Soft-deleted product returns 404", ({
    given,
    when,
    then,
  }) => {
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
  });
});
