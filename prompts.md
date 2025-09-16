Currently, tests in .e2e-spec.ts files are based on the same global fixtures.
Each test must load only the fixtures it needs to pass. Propose a new API on GlobalFixtures to use at the beginning of each it test.
For example,
```
it(statement, () => {
  // Given
  fixtures.scenario()
  // When ...
```
The scenario must clearly show what data is created for each test by defining a variable. For example loyalCustomerScenario = { products : [], customers: [], ...}
Update the existing files. Be lean. Code minimal tests. Coherent tests order, customers and products.


#########


I need to analyze the current test structure and understand how the global fixtures are being used. Let me start by examining the existing test files and the global fixtures to understand the current implementation.

From the file structure, I can see:

1. There are e2e test files in various directories (customer, loyalty, order, product)
2. There's a global-fixtures.ts file in test/fixtures/
3. The task asks me to create a new API for GlobalFixtures that allows each test to load only the fixtures it needs

Let me first examine the current global fixtures implementation and some of the existing test files to understand the current structure.

I'll help you refactor the test fixtures to create a more targeted approach where each test loads only the data it needs. Let me start by examining the current structure.

Cline wants to read this file:

/test/fixtures/global-fixtures.ts‎

**Checkpoint

Compare

Restore

API Request$0.0144

Now let me examine one of the existing test files to understand how the global fixtures are currently being used:

Cline wants to read this file:

/test/loyalty/loyalty.e2e-spec.ts‎

**Checkpoint

Compare

Restore

API Request$0.0000

Let me examine another test file to better understand the current usage patterns:

Cline wants to read this file:

/test/customer/customer.e2e-spec.ts‎

**Checkpoint

Compare

Restore

API Request$0.0000

Now let me check one more test file to understand the full pattern:

Cline wants to read this file:

/test/product/product.e2e-spec.ts‎

**Checkpoint

Compare

Restore

API Request$0.0679

Now I understand the current structure. Let me design and implement the new scenario-based API for GlobalFixtures. I'll update the GlobalFixtures class to support targeted scenario loading:

Cline wants to edit this file:

/test/fixtures/global-fixtures.ts‎

3

**Checkpoint

Compare

Restore

API Request$0.0521

Now I need to refactor the existing test files to use the new scenario-based API. Let me start with the loyalty test:

Cline wants to edit this file:

/test/loyalty/loyalty.e2e-spec.ts‎

1

**Checkpoint

Compare

Restore

API Request$0.0637

Now let me refactor the customer test file to use the new scenario-based API:

Cline wants to edit this file:

/test/customer/customer.e2e-spec.ts‎

1

**Checkpoint

Compare

Restore

API Request$0.0734

Now let me refactor the product test file:

Cline wants to edit this file:

/test/product/product.e2e-spec.ts‎

1

**Checkpoint

Compare

Restore

API Request$0.0000

Now let me check and refactor the order test file:

Cline wants to read this file:

/test/order/order.e2e-spec.ts‎

**Checkpoint

Compare

Restore

API Request$0.0686

Now let me refactor the order test file to use the new scenario-based API:

Cline wants to edit this file:

/test/order/order.e2e-spec.ts‎

1

**Checkpoint

Compare

Restore

API Request$0.0491

Now let me create a README file to document the new scenario-based API:

Cline wants to create a new file:

/test/fixtures/README.md‎

**Checkpoint

Compare

Restore

API Request$0.0259

Now let me run the tests to verify that the refactoring works correctly:

Cline wants to execute this command:

```shell
npm test
```

The command to run is pnpm test:e2e. The output is ``` PASS test/order/order.e2e-spec.ts PASS test/loyalty/loyalty.e2e-spec.ts PASS test/customer/customer.e2e-spec.ts PASS test/product/product.e2e-spec.ts FAIL test/app.e2e-spec.ts ● Test suite failed to run test/app.e2e-spec.ts:29:20 - error TS2339: Property 'load' does not exist on type 'GlobalFixtures'. 29 await fixtures.load(); ~~~~ Test Suites: 1 failed, 4 passed, 5 total Tests: 20 passed, 20 total Snapshots: 0 total Time: 3.773 s, estimated 5 s Ran all test suites.  ELIFECYCLE  Command failed with exit code 1. ```

**Checkpoint

Compare

Restore

API Request$0.0237

I see there's one more test file that needs to be updated - `test/app.e2e-spec.ts` is still using the old `load()` method. Let me fix that:

Cline wants to read this file:

/test/app.e2e-spec.ts‎

**Checkpoint

Compare

Restore

API Request$0.0300

Now I'll fix the app.e2e-spec.ts file to remove the old `load()` method call since this test doesn't actually need any fixtures:

Cline wants to edit this file:

/test/app.e2e-spec.ts‎

1

**Checkpoint

Compare

Restore

API Request$0.0236

Now let me run the tests again to verify that all tests pass:

Cline wants to execute this command:

```shell
pnpm test:e2e
```
