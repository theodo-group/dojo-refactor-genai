# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- **Build**: `pnpm run build` - Compile the NestJS application
- **Start Development**: `pnpm start:dev` - Run with hot reload
- **Lint**: `pnpm run lint` - ESLint with auto-fix
- **Format**: `pnpm run format` - Prettier formatting

### Testing
- **E2E Tests**: `pnpm run test:e2e` - Run all end-to-end tests (includes migration run)
- **Unit Tests**: `pnpm run test` - Run unit tests
- **Test with Coverage**: `pnpm run test:cov`
- **Single Test**: Use Jest patterns, e.g., `jest --testPathPattern=customer`

### Database Management
- **Run Migrations**: `pnpm run migration:run` - Execute pending migrations
- **Generate Migration**: `pnpm run migration:generate` - Create new migration file
- **Revert Migration**: `pnpm run migration:revert` - Rollback last migration
- **Start Test DB**: `docker-compose up -d` - PostgreSQL test database

## Project Architecture

This is a NestJS restaurant management API with the following modular structure:

### Core Modules
- **CustomerModule**: Customer management with CRUD operations
- **OrderModule**: Order processing and status tracking
- **ProductModule**: Menu item management with categories
- **LoyaltyModule**: Customer loyalty program with discount calculations

### Database Layer
- **TypeORM** with PostgreSQL for persistence
- **Entities**: Customer, Order, Product with proper relationships
- **Migrations**: Database schema versioning in `src/migrations/`
- **Configuration**: TypeORM config in `src/config/typeorm.config.ts`

### Testing Architecture
- **E2E Tests**: Located in `test/` directory with `.e2e-spec.ts` files
- **Global Fixtures**: Centralized test data management in `test/fixtures/global-fixtures.ts`
- **Test Database**: Separate PostgreSQL instance via Docker Compose

### Key Architectural Patterns
- **Environment-based Configuration**: Uses `.env` files with ConfigModule
- **Global Validation**: ValidationPipe with whitelist and transform enabled
- **API Prefix**: All endpoints prefixed with `/api`
- **Entity Relationships**: Customer → Orders → Products (many-to-many through junction table)

## Important Context

This is a training project (Dojo) focused on **refactoring global fixtures in tests**. The global fixtures pattern creates coupling between tests, making maintenance difficult when new tests require different data setups.

### Test Data Management
- **Global Fixtures Class**: Creates standardized test data across all e2e tests
- **Data Dependencies**: Customer[0] has multiple historical orders for loyalty program eligibility
- **Database Reset**: TRUNCATE CASCADE used to clear data between test runs
- **Foreign Key Constraints**: Order deletion requires careful sequencing

When working with tests, be aware that modifications to global fixtures can break existing tests that depend on specific data arrangements.