import { loadFeature, defineFeature } from "jest-cucumber";
import { Context, cleanAllTables } from "../context";
import { givenTheCustomerExistsWithEmail } from "../steps/shared/given";
import { whenApiIsCalledWithBody } from "../steps/shared/when";
import {
  thenResponseStatusCode,
  thenResponseMessageContains,
  thenResponseBodyHasProperty,
} from "../steps/shared/then";

const feature = loadFeature(
  "test/bdd/features/customer/customer-validation.feature"
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

  test("KO case - Reject duplicate email addresses", ({
    given,
    when,
    then,
  }) => {
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseMessageContains(then, context);
  });

  test("KO case - Validate required fields - missing name", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("KO case - Validate required fields - missing email", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("KO case - Validate email format - invalid email", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("KO case - Prevent email updates to existing emails", ({
    given,
    when,
    then,
  }) => {
    givenTheCustomerExistsWithEmail(given, context);
    givenTheCustomerExistsWithEmail(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseMessageContains(then, context);
  });

  test("OK case - Handle special characters in customer data", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasProperty(then, context);
    thenResponseBodyHasProperty(then, context);
  });
});
