export interface FixtureBuilder<T> {
  build(overrides?: Partial<T>): Promise<T>;
  buildMany(count: number, overrides?: Partial<T>): Promise<T[]>;
  reset(): Promise<void>;
}