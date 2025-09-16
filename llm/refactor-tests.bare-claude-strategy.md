# Plan: Refactor E2E Testing Architecture to Eliminate Global Fixtures Coupling

## Current Problems Identified:

1. **Global Fixtures Pattern**: All E2E tests share the same fixture data, creating interdependencies
2. **Data Mutation Issues**: Tests modify shared fixture data (seen in `loyalty.e2e-spec.ts:70` where fixture order total is changed)
3. **Brittle Tests**: Tests break when shared data changes, making maintenance difficult
4. **Implicit Dependencies**: Tests rely on specific fixture data arrangements (e.g., customer[0] having 4+ orders for loyalty eligibility)

## Solution: Module-Specific Fixture Pattern

### 1. Create Module-Specific Fixture Classes

- `CustomerTestFixtures` - Contains only customer-related test data
- `OrderTestFixtures` - Contains order scenarios with minimal dependencies
- `ProductTestFixtures` - Contains product catalog variations
- `LoyaltyTestFixtures` - Contains specific customer-order combinations for loyalty testing

### 2. Implement Base Test Fixture Infrastructure

- `BaseTestFixtures` - Common database cleanup and entity repository access
- `TestFixtureBuilder` - Fluent API for creating isolated test scenarios

### 3. Refactor Each E2E Test Suite

- **Customer E2E**: Use `CustomerTestFixtures` with minimal, focused data
- **Order E2E**: Use `OrderTestFixtures` with fresh customers/products per test
- **Product E2E**: Use `ProductTestFixtures` with isolated product catalog
- **Loyalty E2E**: Use `LoyaltyTestFixtures` with specific order histories for discount eligibility

### 4. Benefits of This Approach

- **Isolation**: Each test suite manages its own data without affecting others
- **Maintainability**: Changes to one test suite's fixtures won't break other tests
- **Clarity**: Test data requirements are explicit and localized
- **Flexibility**: Each test can create exactly the data it needs

### 5. Implementation Steps

1. Create base fixture infrastructure classes
2. Build module-specific fixture classes
3. Migrate customer E2E tests first (simplest)
4. Migrate product E2E tests
5. Migrate order E2E tests (more complex due to relationships)
6. Migrate loyalty E2E tests (most complex - needs specific order histories)
7. Remove global fixtures class
8. Update test documentation
