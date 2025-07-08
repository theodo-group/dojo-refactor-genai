# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS restaurant management API built for demonstrating fixture refactoring in tests. The project uses global fixtures that create test data dependencies, making it an excellent candidate for AI-assisted refactoring.

## Commands

### Development
- `pnpm install` - Install dependencies
- `pnpm run start:dev` - Start development server with hot reload
- `pnpm run build` - Build the application
- `pnpm run start:prod` - Start production server

### Testing
- `pnpm run test` - Run unit tests
- `pnpm run test:watch` - Run unit tests in watch mode
- `pnpm run test:cov` - Run tests with coverage
- `pnpm run test:e2e` - Run end-to-end tests (requires database)

### Database
- `docker-compose up -d` - Start PostgreSQL test database
- `pnpm run migration:run` - Run database migrations
- `pnpm run migration:generate` - Generate new migration

### Code Quality
- `pnpm run lint` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier

## Architecture

### Core Structure
- **AppModule**: Main application module combining all feature modules
- **Feature Modules**: Customer, Order, Product, Loyalty - each with controller, service, and DTOs
- **Entities**: TypeORM entities for database schema (Customer, Order, Product)
- **Database**: PostgreSQL with TypeORM for ORM and migrations

### Test Architecture (Key Focus Area)
- **Global Fixtures Pattern**: `test/fixtures/global-fixtures.ts` creates shared test data
- **Problem**: Tests depend on global state, making them fragile and interdependent
- **E2E Tests**: Located in `test/` directory, each module has its own e2e spec file
- **Test Database**: Uses separate PostgreSQL instance for testing

### Key Files
- `src/app.module.ts` - Main application module configuration
- `src/config/typeorm.config.ts` - Database configuration
- `test/fixtures/global-fixtures.ts` - Global test fixtures (refactoring target)
- `test/jest-e2e.json` - E2E test configuration

## Testing Strategy

### Current Global Fixtures Pattern
- Single `GlobalFixtures` class creates all test data
- Data includes customers, products, and orders with complex relationships
- All tests share the same fixture data, creating dependencies
- Uses TRUNCATE CASCADE for cleanup between test runs

### Refactoring Goals
- Convert global fixtures to isolated, test-specific fixtures
- Eliminate test interdependencies
- Improve test reliability and maintainability
- Make tests faster and more predictable

## Development Notes

### Database Setup
- Always run `docker-compose up -d` before running tests
- E2E tests automatically run migrations via `NODE_ENV=test npm run migration:run`
- Test database is separate from development database

### Module Structure
Each feature module follows NestJS conventions:
- Controller handles HTTP requests
- Service contains business logic
- DTOs validate request/response data
- Module ties everything together

### Loyalty Service
The loyalty module was added to demonstrate global fixture problems - it depends on specific customer order history created in global fixtures, making tests brittle when fixtures change.