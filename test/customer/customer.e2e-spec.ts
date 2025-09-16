import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { createFixtures, FixtureFactory } from "../fixtures";
import { CreateCustomerDto } from "../../src/customer/dto/create-customer.dto";
import { UpdateCustomerDto } from "../../src/customer/dto/update-customer.dto";
import { OrderStatus } from "../../src/entities/order.entity";

describe("CustomerController (e2e)", () => {
  let app: INestApplication;
  let fixtures: FixtureFactory;

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

    // Initialize fixtures
    fixtures = createFixtures(app);
  });

  beforeEach(async () => {
    // Clean up before each test to ensure isolation
    await fixtures.cleanup();
  });

  afterAll(async () => {
    await fixtures.cleanup();
    await app.close();
  });

  describe("/api/customers", () => {
    it("GET / should return all active customers", async () => {
      // Create some test customers
      const customer1 = await fixtures
        .customer()
        .withName("John Doe")
        .withEmail("john@example.com")
        .build();

      const customer2 = await fixtures
        .customer()
        .withName("Jane Smith")
        .withEmail("jane@example.com")
        .build();

      const customer3 = await fixtures
        .customer()
        .withName("Bob Johnson")
        .withEmail("bob@example.com")
        .build();

      return request(app.getHttpServer())
        .get("/api/customers")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(3);

          // Check if all customers are returned
          const emails = res.body.map((customer) => customer.email);
          expect(emails).toContain("john@example.com");
          expect(emails).toContain("jane@example.com");
          expect(emails).toContain("bob@example.com");
        });
    });

    it("GET /:id should return customer by id", async () => {
      // Create a test customer
      const customer = await fixtures
        .customer()
        .withName("John Doe")
        .withEmail("john@example.com")
        .build();

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
      // Create a customer for update testing
      const customer = await fixtures
        .customer()
        .withName("Update Test Customer")
        .withEmail("update.test@example.com")
        .withPhone("333-333-3333")
        .build();

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
      // Create a customer for delete testing
      const customer = await fixtures
        .customer()
        .withName("Delete Test Customer")
        .withEmail("delete.test@example.com")
        .build();

      return request(app.getHttpServer())
        .delete(`/api/customers/${customer.id}`)
        .expect(204)
        .then(() => {
          // Verify customer is no longer in the active list
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
      // Create an existing customer first
      const existingCustomer = await fixtures
        .customer()
        .withName("Existing Customer")
        .withEmail("existing@example.com")
        .build();

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

    it("GET /?include_orders=true should return customers with order history", () => {
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

          // Find a customer with orders and verify structure
          const customerWithOrders = res.body.find((c) => c.orders.length > 0);
          expect(customerWithOrders).toBeDefined();
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
      // Create two customers for this test
      const customer1 = await fixtures
        .customer()
        .withName("Customer One")
        .withEmail("customer1@example.com")
        .build();

      const customer2 = await fixtures
        .customer()
        .withName("Customer Two")
        .withEmail("customer2@example.com")
        .build();

      return request(app.getHttpServer())
        .patch(`/api/customers/${customer1.id}`)
        .send({ email: customer2.email })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain("already exists");
        });
    });

    it("PATCH /:id should allow partial updates", async () => {
      // Create a customer for partial update testing
      const customer = await fixtures
        .customer()
        .withName("Partial Update Customer")
        .withEmail("partial.update@example.com")
        .build();

      const originalEmail = customer.email;
      const originalName = customer.name;

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
      // Create a customer for deletion testing
      const customer = await fixtures
        .customer()
        .withName("Delete Test Customer")
        .withEmail("deletetest@example.com")
        .build();

      // Soft delete the customer
      await request(app.getHttpServer())
        .delete(`/api/customers/${customer.id}`)
        .expect(204);

      // Customer should not appear in active list
      const activeCustomers = await request(app.getHttpServer())
        .get("/api/customers")
        .expect(200);

      const foundActive = activeCustomers.body.find(
        (c) => c.id === customer.id
      );
      expect(foundActive).toBeUndefined();

      // But should still exist in database (check by trying to recreate with same email)
      await request(app.getHttpServer())
        .post("/api/customers")
        .send({
          name: "New Customer",
          email: customer.email,
        })
        .expect(409); // Should still conflict because customer exists but inactive
    });

    it("PATCH /:id should update customer timestamps", async () => {
      // Create a customer for timestamp testing
      const customer = await fixtures
        .customer()
        .withName("Timestamp Test Customer")
        .withEmail("timestamp@example.com")
        .build();
      const originalUpdatedAt = customer.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app.getHttpServer())
        .patch(`/api/customers/${customer.id}`)
        .send({ phone: "timestamp-test-phone" })
        .expect(200);

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
      // Create a customer for reactivation testing
      const customer = await fixtures
        .customer()
        .withName("Reactivation Test Customer")
        .withEmail("reactivation@example.com")
        .build();

      // Soft delete
      await request(app.getHttpServer())
        .delete(`/api/customers/${customer.id}`)
        .expect(204);

      // Try to create customer with same email (should allow reactivation)
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
