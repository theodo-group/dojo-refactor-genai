I want to create an API to create my fixtures for 
  my test\
  \
  Here's my current idea\
  \
  Define scenarios\

    describe("/api/orders", () => {
      const scenario: Fixtures = {
        customers: [customer('customer')],
        products: [product('pizza', {price: 12.99}),
   product('soda')],
        orders: [order('customer', ['pizza', 
  'soda'])]
      };\
  \
  Create them\

      it("GET /?status=pending should filter orders 
  by status", () => {
        const fixtures = await given(scenario);\
  \
  Or override them 
      it("POST / should create a new order", () => {
        const { customers, products } = await 
  given({
          ...scenario,
          orders: []
        });\
  \
  Challenge my API, what could go wrong ?
  ⎿ ⧉ Selected 6 lines from 
    test/order/order.e2e-spec.ts in Cursor

⏺ Read(test/order/order.e2e-spec.ts)
  ⎿  Read 188 lines (ctrl+o to expand)

⏺ Search(pattern: "**/*fixture*")
  ⎿  Found 1 file (ctrl+o to expand)

⏺ Search(pattern: "**/*test*helper*")
  ⎿  Found 0 files 

⏺ Read(test/fixtures/global-fixtures.ts)
  ⎿  Read 184 lines (ctrl+o to expand)

⏺ Search(pattern: "given|customer|product|order",
        path: "test")
  ⎿  Found 5 files (ctrl+o to expand)

⏺ Your proposed API has several potential issues:

  Major Problems:

  1. Missing Function Definitions
  - customer(), product(), order() helper
  functions don't exist
  - given() function is undefined but used in
  tests (test/order/order.e2e-spec.ts:73, 111)
  - Fixtures type is not defined

  2. Inconsistent Usage PatternYou mix
  fixtures.apply(scenario) with given(scenario) -
  pick one approach.

  3. Variable Reference Issues
  - Line 86: order.id references undefined
  variable
  - Line 131: customer.id should be
  customers[0].id

  4. Missing Async/Await
  Lines 73 and 111 use await given() but tests
  aren't marked async.

  Design Concerns:

  1. Database State Management
  Your current GlobalFixtures truncates tables -
  the new API needs similar cleanup between tests
  to prevent state leakage.

  2. Entity Relationships
  No validation that referenced entities exist
  (e.g., order('customer', ['pizza']) - what if
  'customer' or 'pizza' don't exist?).

  3. Type Safety
  String references ('customer', 'pizza') are
  error-prone. Consider using IDs or entity
  objects.

  4. Test Isolation
  Overriding scenarios could create interdependent
   tests that break when run in different orders.

  Recommendations:

  1. Define the missing functions and types
  2. Add relationship validation
  3. Use consistent async patterns
  4. Consider entity builders with fluent API
  5. Implement proper cleanup between test 
  scenarios

> Suggest a better API

⏺ Here's a better API design:

  Proposed API:

  // 1. Builder pattern with type safety
  const scenario = fixtures()
    .withCustomers({
      alice: { name: 'Alice', email:
  'alice@example.com' },
      bob: { name: 'Bob', email: 'bob@example.com'
   }
    })
    .withProducts({
      pizza: { name: 'Pizza', price: 12.99 },
      soda: { name: 'Soda', price: 2.99 }
    })
    .withOrders({
      order1: { customer: 'alice', products:
  ['pizza', 'soda'] }
    });

  // 2. Create and get references
  it('should filter orders', async () => {
    const { customers, products, orders } = await
  scenario.create();

    // Now you have typed entities with IDs
    expect(customers.alice.id).toBeDefined();
  });

  // 3. Override with merge semantics
  it('should create new order', async () => {
    const context = await scenario
      .withOrders({}) // Clear orders
      .create();

    // Test with no existing orders
  });

  // 4. Extend existing scenario
  it('should handle multiple orders', async () =>
  {
    const context = await scenario
      .addOrders({
        order2: { customer: 'bob', products:
  ['pizza'] }
      })
      .create();
  });

  Key Improvements:

  1. Type Safety
  - Named entities with string keys prevent typos
  - TypeScript ensures referenced entities exist
  - Return typed objects with generated IDs

  2. Fluent Builder Pattern
  - Chain methods for readability
  - Immutable operations (each method returns new
  builder)
  - Clear separation between definition and
  creation

  3. Smart Defaults
  - Auto-generate missing fields (IDs, timestamps)
  - Sensible defaults for optional properties
  - Relationship validation at build time

  4. Flexible Overrides
  .withOrders({})           // Clear all orders
  .addOrders({...})         // Add to existing
  .overrideOrders({...})    // Replace specific 
  orders

  5. Database Management
  // Auto-cleanup after each test
  afterEach(() => scenario.cleanup());

  // Or manual control
  const context = await scenario.create({ cleanup:
   false });

  6. Validation & Error Handling
  - Fail fast on invalid references
  - Clear error messages for missing entities
  - Circular dependency detection

  This approach gives you type safety, better IDE
  support, and prevents the runtime errors in your
   original design