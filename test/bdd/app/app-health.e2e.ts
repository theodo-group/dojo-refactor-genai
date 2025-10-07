import { loadFeature, defineFeature } from "jest-cucumber";
import { Context, cleanAllTables } from "../context";
import { whenApiIsCalled, whenApiIsCalledWithBody } from "../steps/shared/when";
import { thenResponseStatusCode } from "../steps/shared/then";

const feature = loadFeature("test/bdd/features/app/app-health.feature");

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

  test("KO case - Root path returns 404", ({ given, when, then }) => {
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
  });

  test("KO case - API root returns 404", ({ given, when, then }) => {
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
  });

  test("KO case - Handle invalid JSON gracefully", ({ given, when, then }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("OK case - Handle large request bodies within limits", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });

  test("KO case - Return error for unsupported HTTP methods", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
  });

  test("KO case - Handle malformed UUIDs in path parameters", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalled(when, context);
    thenResponseStatusCode(then, context);
  });

  test("OK case - Handle special characters in request data", ({
    given,
    when,
    then,
  }) => {
    whenApiIsCalledWithBody(when, context);
    thenResponseStatusCode(then, context);
  });
});
