import { loadFeature, defineFeature } from "jest-cucumber";
import { Context, cleanAllTables } from "../context";
import {
  givenTheCustomerExistsWithEmail,
  givenTheProductExistsWithProperties,
  givenTheOrderExistsWithStatus,
} from "../steps/shared/given";
import { whenApiIsCalled } from "../steps/shared/when";
import {
  thenResponseStatusCode,
  thenResponseBodyHasPropertyDefined,
} from "../steps/shared/then";

const feature = loadFeature(
  "test/bdd/features/loyalty/loyalty-discounts.feature"
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

  test("OK case - Apply 5% discount for 4th order", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheOrderExistsWithStatus(given, context);
    givenTheOrderExistsWithStatus(given, context);
    givenTheOrderExistsWithStatus(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
  });

  test("OK case - Get customer loyalty tier", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheOrderExistsWithStatus(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
  });

  test("OK case - Get customer loyalty statistics", ({
    given,
    when,
    then,
  }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheOrderExistsWithStatus(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
  });

  test("OK case - Calculate next order with discount", ({
    given,
    when,
    then,
  }) => {
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
  });
});
