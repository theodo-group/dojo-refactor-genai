import { INestApplication } from '@nestjs/common';
import { FixtureBuilder } from './fixture-builder.interface';

export class TestDataManager {
  private app: INestApplication;
  private fixtures: FixtureBuilder<any>[] = [];

  constructor(app: INestApplication) {
    this.app = app;
  }

  /**
   * Register a fixture builder to be managed
   */
  register<T>(fixtureBuilder: FixtureBuilder<T>): void {
    this.fixtures.push(fixtureBuilder);
  }

  /**
   * Initialize all registered fixture builders
   */
  async init(): Promise<void> {
    for (const fixture of this.fixtures) {
      await fixture.init(this.app);
    }
  }

  /**
   * Build all fixture data
   */
  async loadAll(): Promise<void> {
    for (const fixture of this.fixtures) {
      await fixture.build();
    }
  }

  /**
   * Clean up all fixture data
   */
  async cleanupAll(): Promise<void> {
    // Clean up in reverse order
    for (const fixture of this.fixtures.reverse()) {
      await fixture.cleanup();
    }
    this.fixtures.reverse(); // Restore original order
  }

  /**
   * Get a specific fixture builder by type
   */
  getFixture<T extends FixtureBuilder<any>>(
    fixtureClass: new (...args: any[]) => T
  ): T | undefined {
    return this.fixtures.find(
      fixture => fixture instanceof fixtureClass
    ) as T | undefined;
  }
}