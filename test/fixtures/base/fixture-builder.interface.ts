import { INestApplication } from '@nestjs/common';

export interface FixtureBuilder<T> {
  /**
   * Initialize the fixture builder with the NestJS application
   */
  init(app: INestApplication): Promise<void>;

  /**
   * Create fixture data
   */
  build(): Promise<T[]>;

  /**
   * Clean up fixture data
   */
  cleanup(): Promise<void>;

  /**
   * Get created fixture data
   */
  getData(): T[];
}