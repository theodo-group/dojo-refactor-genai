import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";

export interface CustomerTestScenario {
  customers: Customer[];
  testCustomer: Customer;
  updateTestCustomer: Customer;
  deleteTestCustomer: Customer;
}

export class CustomerFixtures {
  private app: INestApplication;
  private customerRepository: Repository<Customer>;

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
  }

  async createTestScenario(): Promise<CustomerTestScenario> {
    const customers = [
      // Customer basique pour les tests CRUD
      this.customerRepository.create({
        name: "Customer Test User",
        email: "customer.test@example.com",
        phone: "555-0100",
        address: "123 Test Street",
      }),

      // Customer pour les tests de mise à jour
      this.customerRepository.create({
        name: "Update Test Customer",
        email: "update.test@example.com",
        phone: "555-0101",
        address: "456 Update Avenue",
      }),

      // Customer pour les tests de suppression
      this.customerRepository.create({
        name: "Delete Test Customer",
        email: "delete.test@example.com",
        phone: "555-0102",
        address: "789 Delete Road",
      }),
    ];

    const savedCustomers = await this.customerRepository.save(customers);

    return {
      customers: savedCustomers,
      testCustomer: savedCustomers[0],
      updateTestCustomer: savedCustomers[1],
      deleteTestCustomer: savedCustomers[2],
    };
  }

  async cleanup(): Promise<void> {
    await this.customerRepository.query("TRUNCATE TABLE customers CASCADE");
  }
} 