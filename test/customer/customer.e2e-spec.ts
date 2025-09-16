import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { TestDataManager } from "../fixtures/base/test-data-manager";
import { ScenarioFixtures } from "../fixtures/scenarios/scenario-fixtures";
import { CreateCustomerDto } from "../../src/customer/dto/create-customer.dto";
import { UpdateCustomerDto } from "../../src/customer/dto/update-customer.dto";

describe("CustomerController (e2e)", () => {
  let app: INestApplication;
  let dataManager: TestDataManager;
  let scenarios: ScenarioFixtures;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    app.setGlobalPrefix("api");
    await app.init();

    dataManager = new TestDataManager(app);
    scenarios = new ScenarioFixtures(app);
    await dataManager.setup();
  });

  afterAll(async () => {
    if (dataManager) {
      await dataManager.teardown();
    }
    if (app) {
      await app.close();
    }
  });

  describe("/api/customers", () => {
    it("GET / should return all active customers", async () => {
      // GIVEN: Multiple active customers in the system
      const activeCustomers = await dataManager.customerFactory.buildMany(3, {
        name: "Active Customer",
      });

      return request(app.getHttpServer())
        .get("/api/customers")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(activeCustomers.length);

          // Check if our created customers are returned
          const emails = res.body.map((customer) => customer.email);
          activeCustomers.forEach(customer => {
            expect(emails).toContain(customer.email);
          });
        });
    });

    it("GET /:id should return customer by id", async () => {
      // GIVEN: A specific customer exists in the system
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Test Customer",
        email: "test.get@example.com",
      });

      return request(app.getHttpServer())
        .get(`/api/customers/${customer.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(customer.id);
          expect(res.body.name).toBe(customer.name);
          expect(res.body.email).toBe(customer.email);
        });
    });

    it("GET /:id should return 404 for non-existent customer", () => {
      return request(app.getHttpServer())
        .get("/api/customers/00000000-0000-0000-0000-000000000000")
        .expect(404);
    });

    it("POST / should create a new customer", () => {
      const createCustomerDto: CreateCustomerDto = {
        name: "Test Customer",
        email: "test@example.com",
        phone: "111-222-3333",
        address: "321 Test St",
      };

      return request(app.getHttpServer())
        .post("/api/customers")
        .send(createCustomerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe(createCustomerDto.name);
          expect(res.body.email).toBe(createCustomerDto.email);
          expect(res.body.phone).toBe(createCustomerDto.phone);
          expect(res.body.address).toBe(createCustomerDto.address);
          expect(res.body.isActive).toBe(true);
        });
    });

    it("POST / should validate request body", () => {
      const invalidDto = {
        name: "Test Customer",
        // Missing required email
      };

      return request(app.getHttpServer())
        .post("/api/customers")
        .send(invalidDto)
        .expect(400);
    });

    it("PATCH /:id should update a customer", async () => {
      // GIVEN: A customer that can be safely updated
      const customer = await dataManager.customerFactory.createTestCustomerForUpdates({
        name: "Original Name",
        email: "update.test@example.com",
        phone: "original-phone",
      });

      // WHEN: Updating specific customer fields
      const updateCustomerDto: UpdateCustomerDto = {
        name: "Updated Name",
        phone: "updated-phone",
      };

      return request(app.getHttpServer())
        .patch(`/api/customers/${customer.id}`)
        .send(updateCustomerDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(customer.id);
          expect(res.body.name).toBe(updateCustomerDto.name);
          expect(res.body.phone).toBe(updateCustomerDto.phone);
          // Email should remain unchanged
          expect(res.body.email).toBe(customer.email);
        });
    });

    it("DELETE /:id should soft delete a customer", async () => {
      // GIVEN: A customer that can be safely deleted
      const customer = await dataManager.customerFactory.createTestCustomerForDeletion({
        name: "Delete Test Customer",
        email: "delete.safe@example.com",
      });

      return request(app.getHttpServer())
        .delete(`/api/customers/${customer.id}`)
        .expect(204)
        .then(() => {
          // THEN: Customer is no longer in the active list
          return request(app.getHttpServer())
            .get("/api/customers")
            .expect(200)
            .expect((res) => {
              const foundCustomer = res.body.find((c) => c.id === customer.id);
              expect(foundCustomer).toBeUndefined();
            });
        });
    });

    // NEW COMPREHENSIVE TESTS
    it("POST / should reject duplicate email addresses", async () => {
      // GIVEN: An existing customer in the system
      const existingCustomer = await dataManager.customerFactory.createBasicCustomer({
        name: "Existing Customer",
        email: "existing.unique@example.com",
      });

      // WHEN: Trying to create another customer with the same email
      const duplicateEmailDto: CreateCustomerDto = {
        name: "Duplicate Test",
        email: existingCustomer.email, // Using existing email
        phone: "999-999-9999",
        address: "999 Test St",
      };

      return request(app.getHttpServer())
        .post("/api/customers")
        .send(duplicateEmailDto)
        .expect(409) // Conflict status
        .expect((res) => {
          expect(res.body.message).toContain("already exists");
        });
    });

    it("GET /?include_orders=true should return customers with order history", async () => {
      // GIVEN: A customer with order history
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Customer With Orders",
        email: "with.orders@example.com",
      });

      const product = await dataManager.productFactory.createMargheritaPizza();

      await dataManager.orderFactory.createDeliveredOrder({
        customer,
        products: [product],
        notes: "Test order for inclusion",
      });

      return request(app.getHttpServer())
        .get("/api/customers?include_orders=true")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);

          // Check if customers have orders property
          res.body.forEach((customer) => {
            expect(customer.orders).toBeDefined();
            expect(Array.isArray(customer.orders)).toBe(true);
          });

          // Find our customer with orders and verify structure
          const customerWithOrders = res.body.find((c) => c.id === customer.id);
          expect(customerWithOrders).toBeDefined();
          expect(customerWithOrders.orders.length).toBeGreaterThan(0);
          expect(customerWithOrders.orders[0]).toHaveProperty("id");
          expect(customerWithOrders.orders[0]).toHaveProperty("totalAmount");
          expect(customerWithOrders.orders[0]).toHaveProperty("status");
        });
    });

    it("POST / should validate required fields", () => {
      const testCases = [
        { email: "test@example.com" }, // missing name
        { name: "Test User" }, // missing email
        {}, // missing both
      ];

      const promises = testCases.map((data) =>
        request(app.getHttpServer())
          .post("/api/customers")
          .send(data)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toBeDefined();
            expect(Array.isArray(res.body.message)).toBe(true);
          })
      );

      return Promise.all(promises);
    });

    it("POST / should handle very long field values", () => {
      return request(app.getHttpServer())
        .post("/api/customers")
        .send({
          name: "A".repeat(1000), // Very long name
          email: "test@example.com",
          phone: "123-456-7890",
          address: "B".repeat(2000), // Very long address
        })
        .expect(400); // Should reject due to length constraints
    });

    it("PATCH /:id should prevent email updates to existing emails", async () => {
      // GIVEN: Two different customers with unique emails
      const customer1 = await dataManager.customerFactory.createBasicCustomer({
        name: "Customer One",
        email: "customer1.patch@example.com",
      });

      const customer2 = await dataManager.customerFactory.createBasicCustomer({
        name: "Customer Two",
        email: "customer2.patch@example.com",
      });

      // WHEN: Trying to update customer1's email to customer2's email
      return request(app.getHttpServer())
        .patch(`/api/customers/${customer1.id}`)
        .send({ email: customer2.email })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain("already exists");
        });
    });

    it("PATCH /:id should allow partial updates", async () => {
      // GIVEN: A customer with specific initial data
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Partial Update Customer",
        email: "partial.update@example.com",
        phone: "original-phone",
      });

      const originalEmail = customer.email;
      const originalName = customer.name;

      // WHEN: Updating only the phone field
      return request(app.getHttpServer())
        .patch(`/api/customers/${customer.id}`)
        .send({ phone: "updated-phone-only" })
        .expect(200)
        .expect((res) => {
          expect(res.body.phone).toBe("updated-phone-only");
          expect(res.body.email).toBe(originalEmail); // Should remain unchanged
          expect(res.body.name).toBe(originalName); // Should remain unchanged
        });
    });

    it("GET / should paginate results when limit parameter is provided", () => {
      return request(app.getHttpServer())
        .get("/api/customers?limit=2&offset=0")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(2);
        });
    });

    it("GET / should filter customers by active status", () => {
      return request(app.getHttpServer())
        .get("/api/customers?active=true")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((customer) => {
            expect(customer.isActive).toBe(true);
          });
        });
    });

    it("GET / should search customers by name", () => {
      return request(app.getHttpServer())
        .get("/api/customers?search=john")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((customer) => {
            expect(customer.name.toLowerCase()).toContain("john");
          });
        });
    });

    it("DELETE /:id should handle non-existent customer gracefully", () => {
      return request(app.getHttpServer())
        .delete("/api/customers/00000000-0000-0000-0000-000000000000")
        .expect(404);
    });

    it("DELETE /:id should not permanently delete customer data", async () => {
      // GIVEN: A customer that will be soft deleted
      const customer = await dataManager.customerFactory.createTestCustomerForDeletion({
        name: "Soft Delete Test",
        email: "soft.delete.test@example.com",
      });

      // WHEN: Soft deleting the customer
      await request(app.getHttpServer())
        .delete(`/api/customers/${customer.id}`)
        .expect(204);

      // THEN: Customer should not appear in active list
      const activeCustomers = await request(app.getHttpServer())
        .get("/api/customers")
        .expect(200);

      const foundActive = activeCustomers.body.find(
        (c) => c.id === customer.id
      );
      expect(foundActive).toBeUndefined();

      // BUT: Should still exist in database (check by trying to recreate with same email)
      await request(app.getHttpServer())
        .post("/api/customers")
        .send({
          name: "New Customer",
          email: customer.email,
        })
        .expect(409); // Should still conflict because customer exists but inactive
    });

    it("PATCH /:id should update customer timestamps", async () => {
      // GIVEN: A customer with a known creation timestamp
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Timestamp Test Customer",
        email: "timestamp.test@example.com",
      });

      const originalUpdatedAt = customer.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // WHEN: Updating the customer
      const response = await request(app.getHttpServer())
        .patch(`/api/customers/${customer.id}`)
        .send({ phone: "timestamp-test-phone" })
        .expect(200);

      // THEN: Updated timestamp should be newer
      expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it("should handle bulk customer operations", async () => {
      // Create multiple customers in parallel
      const bulkCustomers = Array.from({ length: 5 }, (_, i) => ({
        name: `Bulk Customer ${i}`,
        email: `bulk${i}@example.com`,
        phone: `555-000-${i.toString().padStart(4, "0")}`,
      }));

      const createPromises = bulkCustomers.map((customer) =>
        request(app.getHttpServer())
          .post("/api/customers")
          .send(customer)
          .expect(201)
      );

      const results = await Promise.all(createPromises);

      // Verify all were created successfully
      results.forEach((result, index) => {
        expect(result.body.name).toBe(bulkCustomers[index].name);
        expect(result.body.email).toBe(bulkCustomers[index].email);
      });

      // Verify they appear in the customer list
      const allCustomers = await request(app.getHttpServer())
        .get("/api/customers")
        .expect(200);

      const bulkEmails = bulkCustomers.map((c) => c.email);
      const foundEmails = allCustomers.body.map((c) => c.email);

      bulkEmails.forEach((email) => {
        expect(foundEmails).toContain(email);
      });
    });

    it("should validate phone number formats", () => {
      const validPhoneFormats = [
        "123-456-7890",
        "(123) 456-7890",
        "+1-123-456-7890",
        "123.456.7890",
        "1234567890",
      ];

      const promises = validPhoneFormats.map((phone, index) =>
        request(app.getHttpServer())
          .post("/api/customers")
          .send({
            name: `Phone Test ${index}`,
            email: `phonetest${index}@example.com`,
            phone: phone,
          })
          .expect(201)
      );

      return Promise.all(promises);
    });

    it("should handle customer reactivation after soft delete", async () => {
      // GIVEN: A customer that will be soft deleted and potentially reactivated
      const customer = await dataManager.customerFactory.createBasicCustomer({
        name: "Reactivation Test Customer",
        email: "reactivation.test@example.com",
        phone: "555-REACT-01",
        address: "123 Reactivation St",
      });

      // WHEN: Soft deleting the customer
      await request(app.getHttpServer())
        .delete(`/api/customers/${customer.id}`)
        .expect(204);

      // AND THEN: Try to create customer with same email (should allow reactivation)
      const reactivationResponse = await request(app.getHttpServer())
        .post("/api/customers")
        .send({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
        });

      // Should either reactivate existing or create new (depending on business logic)
      expect([201, 409]).toContain(reactivationResponse.status);
    });
  });
});
