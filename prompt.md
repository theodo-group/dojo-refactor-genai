# Fix tests

## User

READ @test/. Right now every test uses fixtures
for everything and we use global fixtures.

I would like to uncouple my tests with the
global fixtures so each test can use or not a
given fixture.

Make a plan to uncouple the fixtures and use
only the required fixtures in each test. For the
order creation test, we might need to only load
the customer and product fixtures only.

## Claude

⎿  Plan: Decouple Global Fixtures to Modular Test Fixtures

     Current Problem Analysis

     Every test file uses GlobalFixtures which creates all data (customers, products, orders) for every test, causing:
     - Test interdependencies (loyalty test modifies fixture data affecting other tests)
     - Unnecessary data loading (customer tests don't need orders)
     - Brittle tests that break when fixture data changes

     Solution: Individual Fixture Classes (No Manager)

     1. Create Self-Contained Fixture Classes

     - CustomerFixture: Creates and manages only customer data
     - ProductFixture: Creates and manages only product data
     - OrderFixture: Creates orders (accepts customer/product fixtures as dependencies)

     2. Test Usage Patterns

     - Customer tests: Use only CustomerFixture
     - Product tests: Use only ProductFixture
     - Order tests: Use CustomerFixture + ProductFixture + OrderFixture
     - Loyalty tests: Use CustomerFixture + ProductFixture + OrderFixture

     3. Implementation Steps

     1. Create individual fixture classes in test/fixtures/
     2. Each fixture handles its own cleanup in clear() method
     3. Update each test file to instantiate only required fixtures
     4. Remove GlobalFixtures dependency
     5. Verify all tests pass independently

     This eliminates the fixture manager complexity while achieving test isolation.

# Refactor tests to ensure parallelization and use API

## User

We are using fixtures right now in the @test/. I would like us to remove the fixtures and use endpoints to create and remove customers, products and orders. This way we simply use │
│ the API and not fixtures in the database. This should also allow us to parallelize tests. Make a plan to do this.

Don't hesitate to use sub agents for the refactor.

## Claude

Plan: Replace Database Fixtures with API Endpoint Calls

     Analysis Summary

     ✅ All necessary endpoints are available - no additional API development needed.

     Current setup uses database-level fixtures that create test data dependencies. All CRUD endpoints exist for customers, products, and orders.

     Refactoring Strategy

     1. Create Test Helper Utilities (test/helpers/)

     - api-test-helpers.ts: Helper functions for creating/deleting data via API endpoints
     - test-data-factory.ts: Factory functions for generating consistent test data
     - cleanup-helpers.ts: Cleanup utilities for isolated test runs

     2. Refactor Each Test Suite

     Replace fixture dependencies with API calls in each e2e test:

     Customer tests: Remove CustomerFixture, use POST/DELETE /api/customers endpoints
     Product tests: Remove ProductFixture, use POST/DELETE /api/products endpointsOrder tests: Create customers/products via API, then test /api/orders endpoints
     Loyalty tests: Use API to create customer with order history, test loyalty logic

     3. Test Isolation Strategy

     - Each test will create its own data via API calls in beforeEach
     - Clean up test data in afterEach using DELETE endpoints
     - Remove shared fixture dependencies
     - Enable parallel test execution

     4. Configuration Updates

     - Update Jest configuration to support parallel test runs
     - Remove fixture initialization from test setup
     - Ensure each test suite is completely independent

     Available Endpoints (All Ready)

     - POST/DELETE /api/customers ✅
     - POST/DELETE /api/products ✅
     - POST/DELETE /api/orders ✅
     - GET /api/orders/customer/:id ✅ (for loyalty testing)

     Benefits

     - Parallelization: Tests can run simultaneously without data conflicts
     - Isolation: Each test has its own clean dataset
     - Realistic: Tests exercise actual API endpoints like production usage
     - Maintainability: Easier to understand and debug test failures
     - Speed: Parallel execution will improve overall test suite performance
