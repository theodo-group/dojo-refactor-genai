# Restaurant API

A mock restaurant API with NestJS showcasing global fixtures in tests and the need for refactorization.

## Description

This project demonstrates a NestJS application with end-to-end tests using global fixtures. The global fixtures approach creates issues when modifying fixtures for one test breaks other tests, making it an excellent candidate for refactorization using GenAI.

## Technical Overview

- NestJS application for a mock restaurant management API
- Three main controllers: Customer, Order, Product
- A fourth controller : Loyalty : meant to show the issue with new tests
- Data models for customer, order, product
- 15+ RESTful API endpoints
- 20+ end-to-end tests with Supertest
- Docker Compose for PostgreSQL test database
- Database migrations to keep schema up-to-date

## The Problem

The current implementation uses global fixtures for all tests. When we need to update a fixture for one test, it affects all other tests, potentially breaking them. This demonstrates the need for more isolated, test-specific fixtures.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the test database:
   ```bash
   docker-compose up -d
   ```

4. Run the tests:
   ```bash
   npm run test:e2e
   ```

## Project Structure

- `/src` - Application source code
  - `/customer` - Customer module, controller, service, DTOs
  - `/product` - Product module, controller, service, DTOs
  - `/order` - Order module, controller, service, DTOs
  - `/loyalty` - Loyalty service module, controller, service, DTOs - the new service with the first issues of global fixtures
  - `/entities` - Database entity definitions
  - `/migrations` - Database migrations
  - `/test` - End-to-end tests
  - `/fixtures` - Global test fixtures