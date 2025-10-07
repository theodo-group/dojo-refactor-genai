# Restaurant Order Management System

## Architecture

Tech Stack:
- NestJS (REST API framework)
- TypeORM + PostgreSQL (database)
- Jest (testing)
- Docker Compose (test database)

Core Modules:
1. Customer - CRUD for customer management (src/customer)
2. Product - Menu items/products (src/product)
3. Order - Order processing (src/order)
4. Loyalty - Discount service for repeat customers (src/loyalty)

Entities:
- Customer - Has many orders, soft-deletable (isActive flag)
- Product - Menu items with price, category
- Order - Links customers & products, tracks status & total amount

### Tests

Tests are located in the `/test` directory. To run the tests, use the following command:

`pnpm run test:e2e`


### Project Structure

- `/src` - Application source code
    - `/customer` - Customer module, controller, service, DTOs
    - `/product` - Product module, controller, service, DTOs
    - `/order` - Order module, controller, service, DTOs
    - `/loyalty` - Loyalty service module, controller, service, DTOs - the new service with the first issues of global fixtures
    - `/entities` - Database entity definitions
    - `/migrations` - Database migrations
    - `/test` - End-to-end tests
    - `/fixtures` - Global test fixtures

### Project issue

Problems:
  - Test interdependence - Tests can't run in isolation
  - Order-dependent tests - Running tests in different order causes failures
  - Hard to debug - Changes in one test break unrelated tests
- Hard to extend - Adding new tests risks breaking existing ones

