# Dojo Refacto IA

For this dojo, we will study a restaurant API showcasing global fixtures in tests and the need for AI refactorization. As we progress, the codebase will become more complex and the nummber of tests will increase. Lets try to make the bests prompts and tool uses to get it right the first time !

## Description

This project demonstrates a NestJS application with end-to-end tests using global fixtures. The global fixtures approach creates issues when modifying fixtures for one test breaks other tests, making it an excellent candidate for refactorization using GenAI.

## How does the exercise work ?

To get to an level (there are 3 levels), use
 ```bash
   git checkout tags/lvl-1
   ```
Always make sure you have a way to store your prompt and the results (most AI tools now have historiaztion features)
Store your results in branches with the name dojo/date/yourname/lvl-1/try-1, and push the branches


## Technical Overview

- NestJS application for a mock restaurant management API
- Three main controllers: Customer, Order, Product
- A fourth controller : Loyalty : meant to show the issue with new tests
- Data models for customer, order, product, ...
- RESTful API endpoints
- End-to-end tests (to refactor)
- Docker Compose for PostgreSQL test database
- Database migrations to keep schema up-to-date

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose
- npm or pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the test database:
   ```bash
   docker-compose up -d
   ```

4. Run the tests:
   ```bash
   pnpm run test:e2e
   ```

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