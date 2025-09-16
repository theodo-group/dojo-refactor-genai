# Test Fixtures - Scenario-Based API

This document describes the new scenario-based fixture API that allows each test to load only the data it needs.

## Overview

Instead of loading all fixtures globally, each test can now call a specific scenario method that creates only the necessary data for that test. This approach provides:

- **Isolation**: Each test gets fresh, isolated data
- **Clarity**: Test scenarios clearly show what data is available
- **Performance**: Only necessary data is created
- **Maintainability**: Easier to understand test dependencies

## Available Scenarios

### `basicCustomersScenario()`
Creates basic customer data for customer-focused tests.
```typescript
const basicCustomersScenario = await fixtures.basicCustomersScenario();
// Returns: { customers: [John Doe, Jane Smith], products: [], orders: [] }
```

### `basicProductsScenario()`
Creates basic product data for product-focused tests.
```typescript
const basicProductsScenario = await fixtures.basicProductsScenario();
// Returns: { customers: [], products: [Margherita Pizza, Caesar Salad], orders: [] }
```

### `productCatalogScenario()`
Creates extended product catalog for testing product filtering and categories.
```typescript
const productCatalogScenario = await fixtures.productCatalogScenario();
// Returns: { customers: [], products: [Margherita Pizza, Pepperoni Pizza, Caesar Salad, Garlic Bread], orders: [] }
```

### `loyalCustomerScenario()`
Creates a customer with multiple historical orders (4+ orders) for loyalty testing.
```typescript
const loyalCustomerScenario = await fixtures.loyalCustomerScenario();
// Returns: { customers: [John Doe], products: [Margherita Pizza, Caesar Salad], orders: [4 delivered orders] }
```

### `newCustomerScenario()`
Creates a new customer with no order history.
```typescript
const newCustomerScenario = await fixtures.newCustomerScenario();
// Returns: { customers: [Alice Brown], products: [Margherita Pizza, Caesar Salad], orders: [] }
```

### `orderManagementScenario()`
Creates customers, products, and orders with various statuses for order management testing.
```typescript
const orderManagementScenario = await fixtures.orderManagementScenario();
// Returns: { customers: [John Doe, Jane Smith], products: [Margherita Pizza, Caesar Salad], orders: [PREPARING, READY] }
```

## Usage Pattern

Each test should follow this pattern:

```typescript
it('should test something', async () => {
  // Given
  const scenarioData = await fixtures.appropriateScenario();
  const customer = scenarioData.customers[0];
  const product = scenarioData.products[0];
  
  // When
  // ... perform test actions
  
  // Then
  // ... verify results
});
```

## Benefits

1. **Clear Dependencies**: Each test explicitly declares what data it needs
2. **No Side Effects**: Tests don't interfere with each other's data
3. **Minimal Data**: Only necessary entities are created
4. **Better Performance**: Faster test execution due to less data creation
5. **Easier Debugging**: Clear understanding of test data state

## Migration from Global Fixtures

Old approach:
```typescript
beforeAll(async () => {
  fixtures = new GlobalFixtures(app);
  await fixtures.load(); // Loads ALL data
});

it('should test something', () => {
  const customer = fixtures.getCustomers()[0]; // Unclear what data exists
  // ...
});
```

New approach:
```typescript
beforeAll(async () => {
  fixtures = new GlobalFixtures(app);
  // No global loading
});

it('should test something', async () => {
  // Given
  const basicCustomersScenario = await fixtures.basicCustomersScenario();
  const customer = basicCustomersScenario.customers[0]; // Clear what data exists
  // ...
});
