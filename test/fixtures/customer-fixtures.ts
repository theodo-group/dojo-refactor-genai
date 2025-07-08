import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";

export class CustomerFixtures {
  private app: INestApplication;
  private customerRepository: Repository<Customer>;
  private customers: Customer[] = [];

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
  }

  async createTestScenario() {
    // Clear existing data
    await this.cleanup();

    // Create customers for testing
    this.customers = await this.createCustomers();

    return {
      customers: this.customers,
      activeCustomers: this.customers.filter(c => c.isActive),
      updateTestCustomers: this.customers.slice(5, 8),
      partialUpdateTestCustomer: this.customers[6],
      deleteTestCustomer: this.customers[7],
    };
  }

  async cleanup(): Promise<void> {
    // Clear customers table
    await this.customerRepository.query("TRUNCATE TABLE customers CASCADE");
    this.customers = [];
  }

  private async createCustomers(): Promise<Customer[]> {
    const customers = [
      // Core customers for basic functionality
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
      this.customerRepository.create({
        name: "Alice VIP",
        email: "alice.vip@example.com",
        phone: "111-111-1111",
        address: "999 Premium Ave",
      }),
      this.customerRepository.create({
        name: "Charlie Test",
        email: "charlie.test@example.com",
        phone: "222-222-2222",
        address: "123 Test Avenue",
      }),

      // Customers specifically for update/delete tests
      this.customerRepository.create({
        name: "Update Test Customer",
        email: "update.test@example.com",
        phone: "333-333-3333",
        address: "456 Update St",
      }),
      this.customerRepository.create({
        name: "Partial Update Customer",
        email: "partial.update@example.com",
        phone: "444-444-4444",
        address: "789 Partial Ave",
      }),
      this.customerRepository.create({
        name: "Delete Test Customer",
        email: "delete.test@example.com",
        phone: "555-555-5556",
        address: "321 Delete Rd",
      }),

      // Customer for concurrent operation testing
      this.customerRepository.create({
        name: "Concurrent Test Customer",
        email: "concurrent.test@example.com",
        phone: "666-666-6666",
        address: "987 Concurrent Blvd",
      }),
    ];

    return await this.customerRepository.save(customers);
  }
} 