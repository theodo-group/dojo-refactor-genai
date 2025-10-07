# E2E Test Refactoring Plan

## Problem Summary

The current test suite uses a global fixtures pattern that creates shared, mutable state across all tests. This leads to:
- Test interdependence and order sensitivity
- Difficult debugging and maintenance
- Poor readability (magic indices, helper method proliferation)
- Concurrent execution issues
- Fragile tests that break when fixtures are modified

## Proposed Solutions

### Solution 1: Factory Pattern with Test-Scoped Fixtures ⭐ **RECOMMENDED**

**Approach**: Replace global fixtures with factory functions that create fresh test data per test or test suite.

#### Implementation

```typescript
// test/factories/customer.factory.ts
export const createCustomer = (overrides?: Partial<CreateCustomerDto>) => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  address: faker.location.streetAddress(),
  ...overrides,
});

// test/factories/product.factory.ts
export const createProduct = (overrides?: Partial<CreateProductDto>) => ({
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: parseFloat(faker.commerce.price()),
  category: faker.commerce.department(),
  isAvailable: true,
  ...overrides,
});

// test/factories/order.factory.ts
export const createOrder = (
  customerId: string,
  productIds: string[],
  overrides?: Partial<CreateOrderDto>
) => ({
  customerId,
  productIds,
  status: 'PENDING',
  notes: faker.lorem.sentence(),
  ...overrides,
});
```

#### Usage Pattern

```typescript
describe('Customer E2E', () => {
  let testCustomer: Customer;

  beforeEach(async () => {
    // Each test gets fresh data
    const customerDto = createCustomer({ name: 'Test Customer' });
    testCustomer = await createTestCustomer(app, customerDto);
  });

  it('should update customer', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/customers/${testCustomer.id}`)
      .send({ name: 'Updated Name' });

    expect(response.body.name).toBe('Updated Name');
  });
});
```

#### Advantages
- ✅ Complete test isolation
- ✅ Self-documenting tests (data defined where used)
- ✅ Easy to understand and modify
- ✅ No magic indices or helper methods
- ✅ Safe concurrent execution
- ✅ Randomized data prevents hidden dependencies

#### Disadvantages
- ⚠️ More data creation overhead (mitigated by optimized factories)
- ⚠️ Requires refactoring all existing tests

---

### Solution 4: Hybrid Approach - Scoped Fixture Builders

**Approach**: Create fixture builders that generate test-specific data with semantic names.

#### Implementation

```typescript
class LoyaltyTestBuilder {
  async createBronzeTierCustomer(): Promise<Customer> {
    const customer = await this.createCustomer();
    // 0 orders, $0 spent = Bronze
    return customer;
  }

  async createGoldTierCustomer(): Promise<Customer> {
    const customer = await this.createCustomer();
    const products = await this.createProducts(3);

    // Create 7 orders worth $300+ = Gold tier
    for (let i = 0; i < 7; i++) {
      await this.createOrder(customer.id, products, { totalAmount: 50 });
    }

    return customer;
  }

  async createCustomerNearDiscount(): Promise<Customer> {
    const customer = await this.createCustomer();
    const products = await this.createProducts(2);

    // 3 orders = 1 away from 5% discount threshold
    for (let i = 0; i < 3; i++) {
      await this.createOrder(customer.id, products);
    }

    return customer;
  }
}
```

#### Usage

```typescript
describe('Loyalty Discounts', () => {
  const builder = new LoyaltyTestBuilder();

  it('should apply 10% discount for gold tier', async () => {
    const customer = await builder.createGoldTierCustomer();

    const discount = await loyaltyService.calculateDiscount(customer.id);
    expect(discount).toBe(10);
  });
});
```

#### Advantages
- ✅ Self-documenting tests
- ✅ Business logic embedded in builders
- ✅ Test isolation
- ✅ Reusable semantic builders
- ✅ No magic indices

#### Disadvantages
- ⚠️ Initial effort to create builders
- ⚠️ Maintenance of builder methods

---

## Recommended Approach

**Primary Strategy**: **Solution 1 (Factory Pattern) + Solution 4 (Scoped Builders)**

### Implementation Phases

#### Phase 1: Setup Infrastructure (Week 1)
1. Install `@faker-js/faker` for realistic test data
2. Create factory files in `test/factories/`
   - `customer.factory.ts`
   - `product.factory.ts`
   - `order.factory.ts`
3. Create test helper utilities in `test/helpers/`
   - `test-data-builder.ts` - CRUD operations for test data
   - `test-cleanup.ts` - Cleanup utilities

#### Phase 2: Create Specialized Builders (Week 1-2)
1. `LoyaltyTestBuilder` - For loyalty tier scenarios
2. `OrderTestBuilder` - For order status flows
3. `CustomerTestBuilder` - For customer lifecycle tests

#### Phase 3: Refactor Tests Module-by-Module (Week 2-4)
1. **Start with simplest**: `app.e2e-spec.ts` (health checks)
2. **Mid-complexity**: `product.e2e-spec.ts`, `customer.e2e-spec.ts`
3. **Most complex last**: `order.e2e-spec.ts`, `loyalty.e2e-spec.ts`

#### Phase 4: Remove Global Fixtures (Week 4)
1. Verify all tests passing with new pattern
2. Delete `test/fixtures/global-fixtures.ts`
3. Update test:e2e setup to remove fixture loading

---

## Migration Example: Loyalty Tests

### Before (Current)
```typescript
it('should apply 10% discount for customers with more than 3 orders', async () => {
  const customer = fixtures.getCustomers()[2]; // Who is customer 2? 🤷

  for (let i = 0; i < 5; i++) {
    await request(app.getHttpServer())
      .post('/api/orders')
      .send({ customerId: customer.id, productIds: [fixtures.getProducts()[0].id] });
  }

  const discount = await loyaltyService.calculateDiscount(customer.id);
  expect(discount).toBe(10);
});
```

### After (Factory Pattern)
```typescript
it('should apply 10% discount for customers with 6-10 orders', async () => {
  const builder = new LoyaltyTestBuilder(app);

  // Clear intent: create customer with 6 orders
  const customer = await builder.createCustomerWithOrders(6);

  const discount = await loyaltyService.calculateDiscount(customer.id);
  expect(discount).toBe(10);
});
```

---

## Testing Strategy During Migration

1. **Parallel Development**
   - Keep global fixtures working
   - Add new factory-based tests alongside
   - Migrate test-by-test

2. **Verification**
   - Run both old and new tests in parallel
   - Ensure business logic coverage remains 100%
   - Verify no regression in test coverage

3. **Rollback Plan**
   - Keep global fixtures in git history
   - Tag commit before deletion
   - Document rollback procedure

---

## Expected Outcomes

### Metrics
- **Test Independence**: 100% (currently ~30%)
- **Test Readability**: +60% (no magic indices)
- **Maintenance Time**: -40% (self-contained tests)
- **Concurrent Execution**: Safe (currently impossible)
- **Test Runtime**: +15-20% (more data creation, acceptable trade-off)

### Code Quality
- ✅ Each test understandable in isolation
- ✅ No test order dependencies
- ✅ Easy to add new test cases
- ✅ Simple to modify business logic tests
- ✅ Better error messages (semantic data)

---

## Alternative: Quick Win Approach

If full refactoring isn't feasible immediately, consider this **incremental approach**:

1. **Freeze Global Fixtures**: Document "DO NOT MODIFY" policy
2. **Add Factory Pattern**: For NEW tests only
3. **Isolate Problematic Tests**: Start with loyalty tests (most fragile)
4. **Gradual Migration**: 2-3 tests per sprint

This allows improvement without blocking feature work.

---

## Tooling Recommendations

```json
{
  "devDependencies": {
    "@faker-js/faker": "^8.x",
    "jest-extended": "^4.x",
    "testcontainers": "^10.x"  // Optional: for true DB isolation
  }
}
```

---

## Conclusion

The **Factory Pattern with Scoped Builders** approach provides the best balance of:
- Test isolation and independence
- Code readability and maintainability
- Alignment with testing best practices
- Scalability for future test additions

While it requires upfront investment, the long-term benefits in test reliability, debugging ease, and developer productivity make it the clear choice for this refactoring effort.

When doing the refactor, ensure to:
- Keep tests passing at all times
- Count tests with own data vs. shared fixtures to estimate the test quality
- there is currently 102 tests, there should be still 102 tests after the refactor testing the same behaviour

