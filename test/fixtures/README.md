# Test Fixtures - Scenario-Based API

This directory contains a new scenario-based API for test fixtures that allows each test to load only the specific data it needs, rather than loading all fixtures globally.

## Overview

The new `GlobalFixtures` class provides scenario-based methods that create and cache specific sets of test data. Each scenario is designed for particular testing needs and only loads the minimal data required.

## Key Benefits

- **Selective Loading**: Each test loads only the fixtures it needs
- **Better Performance**: Reduced database operations and faster test execution
- **Clearer Intent**: Test scenarios are self-documenting
- **Isolation**: Tests don't interfere with each other's data
- **Caching**: Scenarios are cached to avoid duplicate loading

## API Usage

### Basic Pattern

```typescript
import { GlobalFixtures } from "../fixtures/scenarios";

describe("My Test Suite", () => {
  let fixtures: GlobalFixtures;

  beforeAll(async () => {
    // Initialize fixtures (no data loaded yet)
    fixtures = new GlobalFixtures(app);
  });

  afterAll(async () => {
    // Clean up all loaded data
    await fixtures.clear();
  });

  it("should test basic functionality", async () => {
    // Load only the fixtures needed for this test
    const data = await fixtures.basicOrderScenario();

    // Use the specific data
    const customer = data.customers[0];
    const products = data.products;
    const orders = data.orders;

    // Your test logic here...
  });
});
```

## Available Scenarios

### `basicOrderScenario()`

Creates minimal data for basic order testing:

- 2 customers (John Doe, Jane Smith)
- 3 products (Margherita Pizza, Pepperoni Pizza, Caesar Salad)
- 1 pending order

**Use for**: Basic CRUD operations, simple order creation tests

### `loyalCustomerScenario()`

Creates a customer with order history for loyalty testing:

- 1 loyal customer (John Loyal)
- 3 products
- 3 delivered orders with different dates

**Use for**: Loyalty discount tests, customer history analysis

### `orderStatusScenario()`

Creates orders in different statuses for status transition testing:

- 1 customer
- 1 product
- 3 orders (PENDING, PREPARING, DELIVERED)

**Use for**: Order status updates, workflow testing

### `productAvailabilityScenario()`

Creates products with different availability states:

- 1 customer
- 2 products (1 available, 1 unavailable)
- No orders

**Use for**: Product availability validation, inventory tests

### `recentOrderScenario()`

Creates a recent order for modification testing:

- 1 customer
- 1 product
- 1 recent pending order (created 2 minutes ago)

**Use for**: Time-based modification rules, order editing tests

### `multipleCustomersScenario()`

Creates multiple customers with their own orders:

- 3 customers
- 2 products
- 2 orders (one per customer)

**Use for**: Customer filtering, multi-customer operations

### `largeOrderScenario()`

Creates data for large order testing:

- 1 customer
- 5 products
- No orders

**Use for**: Large order creation, bulk operations

## Helper Methods

### `getAllLoadedCustomers()`, `getAllLoadedProducts()`, `getAllLoadedOrders()`

Returns all data across all loaded scenarios.

### `getScenarioData(scenarioKey: string)`

Returns data for a specific scenario if it's been loaded.

## Migration from Old API

### Before (Old Global Fixtures)

```typescript
beforeAll(async () => {
  fixtures = new GlobalFixtures(app);
  await fixtures.load(); // Loads ALL data
});

it("should test something", () => {
  const customer = fixtures.getCustomers()[0]; // Access pre-loaded data
  const products = fixtures.getProducts();
  // ...
});
```

### After (New Scenario-Based API)

```typescript
beforeAll(async () => {
  fixtures = new GlobalFixtures(app); // No data loaded yet
});

it("should test something", async () => {
  const data = await fixtures.basicOrderScenario(); // Load only what's needed
  const customer = data.customers[0];
  const products = data.products;
  // ...
});
```

## Best Practices

1. **Load scenarios at the test level**: Call scenario methods in individual tests, not in `beforeAll`
2. **Use specific scenarios**: Choose the most specific scenario for your test needs
3. **Combine scenarios when needed**: You can load multiple scenarios in the same test
4. **Clean up properly**: Always call `fixtures.clear()` in `afterAll`
5. **Cache awareness**: Scenarios are cached, so calling the same scenario multiple times is efficient

## Example: Complete Test File

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { GlobalFixtures } from "../fixtures/scenarios";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";

describe("OrderController (e2e)", () => {
  let app: INestApplication;
  let fixtures: GlobalFixtures;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api");
    await app.init();

    fixtures = new GlobalFixtures(app);
  });

  afterAll(async () => {
    if (fixtures) {
      await fixtures.clear();
    }
    if (app) {
      await app.close();
    }
  });

  it("should create a basic order", async () => {
    const data = await fixtures.basicOrderScenario();
    const customer = data.customers[0];
    const products = data.products.slice(0, 2);

    const createOrderDto: CreateOrderDto = {
      customerId: customer.id,
      productIds: products.map((p) => p.id),
      totalAmount: 27.98,
      notes: "Test order",
    };

    return request(app.getHttpServer())
      .post("/api/orders")
      .send(createOrderDto)
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe(OrderStatus.PENDING);
        expect(res.body.customer.id).toBe(customer.id);
      });
  });

  it("should apply loyalty discounts", async () => {
    const data = await fixtures.loyalCustomerScenario();
    const loyalCustomer = data.customers[0];
    const products = data.products.slice(0, 2);

    const createOrderDto: CreateOrderDto = {
      customerId: loyalCustomer.id,
      productIds: products.map((p) => p.id),
      totalAmount: 21.98,
      notes: "Loyalty test",
    };

    const response = await request(app.getHttpServer())
      .post("/api/orders")
      .send(createOrderDto)
      .expect(201);

    expect(response.body.totalAmount).toBeLessThanOrEqual(21.98);
  });
});
```

## Adding New Scenarios

To add a new scenario:

1. Add a new method to the `GlobalFixtures` class in `scenarios.ts`
2. Follow the naming pattern: `[scenarioName]Scenario()`
3. Use caching with a unique scenario key
4. Return a `ScenarioData` object with customers, products, and orders
5. Document the scenario in this README

Example:

```typescript
async customScenario(): Promise<ScenarioData> {
  const scenarioKey = 'custom';
  if (this.loadedScenarios.has(scenarioKey)) {
    return this.scenarioData.get(scenarioKey)!;
  }

  // Create your specific test data
  const customers = await this.customerRepository.save([...]);
  const products = await this.productRepository.save([...]);
  const orders = await this.orderRepository.save([...]);

  const data = { customers, products, orders };
  this.scenarioData.set(scenarioKey, data);
  this.loadedScenarios.add(scenarioKey);
  return data;
}
```
