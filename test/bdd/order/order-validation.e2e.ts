import { loadFeature, defineFeature } from "jest-cucumber";
import { Context, cleanAllTables } from "../context";
import {
  givenTheCustomerExistsWithEmail,
  givenTheProductExistsWithProperties,
  givenTheUnavailableProductExists,
  givenTheOrderExistsWithStatus,
} from "../steps/shared/given";
import {
  whenApiIsCalled,
  whenApiIsCalledWithBody,
} from "../steps/shared/when";
import {
  thenResponseStatusCode,
  thenResponseMessageContains,
} from "../steps/shared/then";

const feature = loadFeature(
  "test/bdd/features/order/order-validation.feature"
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

  test("KO case - Validate total amount matches product prices", ({
    given,
    when,
    then,
  }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseMessageContains(then, context);
  });

  test("KO case - Validate product availability", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheUnavailableProductExists(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseMessageContains(then, context);
  });

  test("KO case - Prevent updating delivered orders", ({
    given,
    when,
    then,
  }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheOrderExistsWithStatus(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseMessageContains(then, context);
  });

  test("KO case - Cannot cancel delivered order", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheProductExistsWithProperties(given, context);
    givenTheOrderExistsWithStatus(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseMessageContains(then, context);
  });
});
