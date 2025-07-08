# E2E Test Fixtures Refactoring

## Overview

This document describes the refactored E2E test fixture architecture that replaces the previously coupled `GlobalFixtures` approach with domain-specific fixtures.

## Problem Solved

The original `GlobalFixtures` class created tight coupling between test suites:

- All tests shared the same data
- Tests could modify shared data and affect other tests
- No isolation between different domain tests
- Side effects could occur when running tests together

## New Architecture

### Domain-Specific Fixtures

Each domain now has its own dedicated fixture class:

- **`OrderFixtures`** - For order-related tests
- **`CustomerFixtures`** - For customer CRUD tests
- **`ProductFixtures`** - For product CRUD tests
- **`LoyaltyFixtures`** - For loyalty program tests

### Key Features

1. **Complete Isolation**: Each fixture creates and manages its own test data
2. **Clean State**: `beforeEach()` hooks ensure fresh data for every test
3. **Domain-Specific Data**: Only creates data relevant to the domain being tested
4. **Proper Cleanup**: Respects foreign key constraints during cleanup

### Fixture Structure

Each fixture follows this pattern:

```typescript
export interface DomainTestScenario {
  // Domain-specific data structure
}

export class DomainFixtures {
  constructor(app: INestApplication) {
    /* ... */
  }

  async createTestScenario(): Promise<DomainTestScenario> {
    // Create minimal test data for this domain
  }

  async cleanup(): Promise<void> {
    // Clean up data respecting FK constraints
  }
}
```

### Test Structure

Each test file now follows this pattern:

```typescript
describe("DomainController (e2e)", () => {
  let fixtures: DomainFixtures;
  let testData: DomainTestScenario;

  beforeAll(async () => {
    // Setup app and fixtures instance
    fixtures = new DomainFixtures(app);
  });

  beforeEach(async () => {
    // Fresh data for each test
    await fixtures.cleanup();
    testData = await fixtures.createTestScenario();
  });

  afterAll(async () => {
    await fixtures.cleanup();
    await app.close();
  });

  // Tests use testData instead of shared fixtures
});
```

## Benefits Achieved

✅ **Test Isolation**: Each test has its own clean data  
✅ **No Side Effects**: Tests don't interfere with each other  
✅ **Domain Focus**: Fixtures only create relevant data  
✅ **Maintainability**: Easier to understand and modify test data  
✅ **Reliability**: Tests pass consistently whether run individually or together

## File Structure

```
test/
├── fixtures/
│   ├── customer-fixtures.ts     # Customer domain fixtures
│   ├── loyalty-fixtures.ts      # Loyalty program fixtures
│   ├── order-fixtures.ts        # Order domain fixtures
│   └── product-fixtures.ts      # Product domain fixtures
├── customer/
│   └── customer.e2e-spec.ts     # Uses CustomerFixtures
├── loyalty/
│   └── loyalty.e2e-spec.ts      # Uses LoyaltyFixtures
├── order/
│   └── order.e2e-spec.ts        # Uses OrderFixtures
└── product/
    └── product.e2e-spec.ts      # Uses ProductFixtures
```

## Migration Guide

To convert existing tests to the new architecture:

1. Replace `GlobalFixtures` import with domain-specific fixture
2. Add `testData` variable to store scenario data
3. Update `beforeAll()` to instantiate the fixture
4. Add `beforeEach()` to create fresh test data
5. Update test references from `fixtures.getX()` to `testData.x`

## Running Tests

All tests can be run individually or together with full isolation:

```bash
# Individual test suites
npm run test:e2e -- --testPathPattern=order.e2e-spec.ts
npm run test:e2e -- --testPathPattern=customer.e2e-spec.ts

# All tests together - no side effects
npm run test:e2e
```
