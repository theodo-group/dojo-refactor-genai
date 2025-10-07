import { loadFeature, defineFeature } from "jest-cucumber";
import { Context, cleanAllTables } from "../context";
import { givenTheCustomerExistsWithEmail } from "../steps/shared/given";
import {
  whenApiIsCalledWithQuery,
} from "../steps/shared/when";
import {
  thenResponseStatusCode,
  thenResponseBodyIsArrayWithAtLeast,
  thenResponseBodyContainsItemWithProperty,
} from "../steps/shared/then";

const feature = loadFeature(
  "test/bdd/features/customer/customer-filters.feature"
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

  test("OK case - Paginate customer results", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheCustomerExistsWithEmail(given, context);
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalledWithQuery(when, context);
    thenResponseStatusCode(then, context);
  });

  test("OK case - Filter customers by active status", ({
    given,
    when,
    then,
  }) => {
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalledWithQuery(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyIsArrayWithAtLeast(then, context);
  });

  test("OK case - Search customers by name", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalledWithQuery(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyContainsItemWithProperty(then, context);
  });
});
