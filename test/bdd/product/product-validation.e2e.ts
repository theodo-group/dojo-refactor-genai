import { loadFeature, defineFeature } from "jest-cucumber";
import { Context, cleanAllTables } from "../context";
import { givenTheProductExistsWithProperties } from "../steps/shared/given";
import { whenApiIsCalledWithBody } from "../steps/shared/when";
import {
  thenResponseStatusCode,
  thenResponseMessageContains,
  thenResponseBodyHasProperty,
} from "../steps/shared/then";

const feature = loadFeature(
  "test/bdd/features/product/product-validation.feature"
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

  test("KO case - Reject product with negative price", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseMessageContains(then, context);
  });

  test("KO case - Reject product with zero price", ({ given, when, then }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("KO case - Reject product with missing name", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("KO case - Reject product with missing price", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("KO case - Reject product with missing category", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("KO case - Reject price with too many decimal places", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("KO case - Validate price update - negative value", ({
    given,
    when,
    then,
  }) => {
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("KO case - Validate price update - zero value", ({
    given,
    when,
    then,
  }) => {
    givenTheProductExistsWithProperties(given, context);
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("OK case - Accept product with special characters in name", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
    thenResponseBodyHasProperty(then, context);
  });
});
