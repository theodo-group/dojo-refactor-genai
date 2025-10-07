import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";

export class CustomersFixtures {
  private app: INestApplication;
  private customerRepository: Repository<Customer>;

  // Cached fixtures for reuse across tests
  private customers: Customer[] = [];

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
  }

  async load(): Promise<void> {
    // Clear existing data first
    await this.clear();

    // Create customers
    this.customers = await this.createCustomers();
  }

  async clear(): Promise<void> {
    // Delete in the correct order to respect foreign key constraints
    await this.customerRepository.query("TRUNCATE TABLE customers CASCADE");

    // Reset cached data
    this.customers = [];
  }

  // Customer creation
  public async createCustomers(): Promise<Customer[]> {
    const customers = [
      this.customerRepository.create({
        name: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        address: "123 Main St",
      }),
      this.customerRepository.create({
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "987-654-3210",
        address: "456 Oak Ave",
      }),
      this.customerRepository.create({
        name: "Bob Johnson",
        email: "bob@example.com",
        phone: "555-555-5555",
        address: "789 Pine Rd",
      }),
    ];

    return await this.customerRepository.save(customers);
  }
}

/**
 * Avant on avait une seule commande pour load un type de fixture
 * Par ex : create des orders ou alors create des products mais on
 * n'a pas de granularité sur ce système
 *
 * On pourrait soit faire un système plus modulaire
 * Soit faire des fixtures dédiées à chaque test
 */
