export { FixtureFactory } from "./fixture-builders";
export * from "./fixture-builders";

import { INestApplication } from "@nestjs/common";
import { FixtureFactory } from "./fixture-builders";

export function createFixtures(app: INestApplication): FixtureFactory {
  return new FixtureFactory(app);
}
