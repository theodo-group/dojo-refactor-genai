import { loadFeature, defineFeature } from "jest-cucumber";
import { Context, cleanAllTables } from "../context";
import { givenTheCustomerExistsWithEmail } from "../steps/shared/given";
import {
  whenApiIsCalled,
  whenApiIsCalledWithBody,
} from "../steps/shared/when";
import {
  thenResponseStatusCode,
  thenResponseBodyHasPropertyDefined,
  thenResponseMessageContains,
} from "../steps/shared/then";

const feature = loadFeature(
  "test/bdd/features/loyalty/loyalty-points.feature"
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

  test("OK case - Get customer loyalty points", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
  });

  test("OK case - Get loyalty information", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
  });

  test("OK case - Get loyalty metrics", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
  });

  test("OK case - Handle point adjustments", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("KO case - Prevent excessive point adjustments", ({
    given,
    when,
    then,
  }) => {
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("OK case - Handle loyalty program suspension", ({
    given,
    when,
    then,
  }) => {
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("OK case - Handle loyalty program reactivation", ({
    given,
    when,
    then,
  }) => {
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
  });

  test("OK case - Handle expired points", ({ given, when, then }) => {
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasPropertyDefined(then, context);
  });

  test("KO case - Validate UUID format for loyalty tier", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseMessageContains(then, context);
  });

  test("KO case - Return 400 for non-existent customer", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
    thenResponseMessageContains(then, context);
  });
});
