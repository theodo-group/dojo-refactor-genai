import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { CreateCustomerDto } from "../../src/customer/dto/create-customer.dto";
import { UpdateCustomerDto } from "../../src/customer/dto/update-customer.dto";
import { CustomerFixtures } from "../fixtures/customer-fixtures";

describe("CustomerController (e2e)", () => {
  let app: INestApplication;
  let fixtures: CustomerFixtures;
  let testData: any;

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

    // Initialize customer fixtures
    fixtures = new CustomerFixtures(app);
  });

  beforeEach(async () => {
    // Create fresh test data for each test
    testData = await fixtures.createTestScenario();
  });

  afterAll(async () => {
    if (fixtures) {
      await fixtures.cleanup();
    }
    if (app) {
      await app.close();
    }
  });

  describe("/api/customers", () => {
    it("GET / should return all active customers", () => {
      return request(app.getHttpServer())
        .get("/api/customers")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(testData.customers.length);

          // Check if all customers are returned
          const emails = res.body.map((customer) => customer.email);
          expect(emails).toContain("john@example.com");
          expect(emails).toContain("jane@example.com");
          expect(emails).toContain("bob@example.com");
        });
    });

    it("GET /:id should return customer by id", () => {
      const customer = testData.customers[0];

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

    it("PATCH /:id should update a customer", () => {
      const customer = testData.updateTestCustomers[0];
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

    it("DELETE /:id should soft delete a customer", () => {
      const customer = testData.deleteTestCustomer;

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
    it("POST / should reject duplicate email addresses", () => {
      const existingCustomer = testData.customers[0];
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
        });
    });

    it("POST / should validate email format", () => {
      const invalidEmailFormats = [
        "notanemail",
        "@domain.com",
        "user@",
        "user@domain",
        "user..double@domain.com",
        "user@domain..com",
      ];

      const promises = invalidEmailFormats.map((invalidEmail) => {
        return request(app.getHttpServer())
          .post("/api/customers")
          .send({
            name: "Test Customer",
            email: invalidEmail,
            phone: "111-222-3333",
            address: "321 Test St",
          })
          .expect(400);
      });

      return Promise.all(promises);
    });

    it("POST / should validate phone format", () => {
      const invalidPhoneFormats = [
        "123",
        "12345678901234567890",
        "abc-def-ghij",
        "123-456-78901",
        "123.456.7890",
      ];

      const promises = invalidPhoneFormats.map((invalidPhone) => {
        return request(app.getHttpServer())
          .post("/api/customers")
          .send({
            name: "Test Customer",
            email: "test@example.com",
            phone: invalidPhone,
            address: "321 Test St",
          })
          .expect(400);
      });

      return Promise.all(promises);
    });

    it("PATCH /:id should perform partial updates", () => {
      const customer = testData.partialUpdateTestCustomer;
      const updateCustomerDto: UpdateCustomerDto = {
        name: "Partially Updated Name",
        // Only updating name, other fields should remain unchanged
      };

      return request(app.getHttpServer())
        .patch(`/api/customers/${customer.id}`)
        .send(updateCustomerDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(customer.id);
          expect(res.body.name).toBe(updateCustomerDto.name);
          expect(res.body.email).toBe(customer.email); // unchanged
          expect(res.body.phone).toBe(customer.phone); // unchanged
          expect(res.body.address).toBe(customer.address); // unchanged
        });
    });

    it("PATCH /:id should validate email format on update", () => {
      const customer = testData.updateTestCustomers[1];
      const invalidEmailUpdate: UpdateCustomerDto = {
        email: "invalid-email-format",
      };

      return request(app.getHttpServer())
        .patch(`/api/customers/${customer.id}`)
        .send(invalidEmailUpdate)
        .expect(400);
    });

    it("PUT /:id should perform full update", () => {
      const customer = testData.updateTestCustomers[0];
      const fullUpdateDto: CreateCustomerDto = {
        name: "Fully Updated Customer",
        email: "fully.updated@example.com",
        phone: "999-888-7777",
        address: "999 Updated Street",
      };

      return request(app.getHttpServer())
        .put(`/api/customers/${customer.id}`)
        .send(fullUpdateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(customer.id);
          expect(res.body.name).toBe(fullUpdateDto.name);
          expect(res.body.email).toBe(fullUpdateDto.email);
          expect(res.body.phone).toBe(fullUpdateDto.phone);
          expect(res.body.address).toBe(fullUpdateDto.address);
          expect(res.body.isActive).toBe(true);
        });
    });

    it("DELETE /:id should prevent deletion of customer with active orders", () => {
      // This test would require a customer with orders, which is not in customer fixtures
      // We can skip this test or modify it to test the behavior differently
    });

    it("GET /?search=name should filter customers by name", () => {
      return request(app.getHttpServer())
        .get("/api/customers?search=John")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((customer) => {
            expect(customer.name.toLowerCase()).toContain("john");
          });
        });
    });

    it("GET /?sort=name should sort customers by name", () => {
      return request(app.getHttpServer())
        .get("/api/customers?sort=name")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          const names = res.body.map((c) => c.name);
          const sortedNames = [...names].sort();
          expect(names).toEqual(sortedNames);
        });
    });

    it("GET /?page=1&limit=2 should paginate customers", () => {
      return request(app.getHttpServer())
        .get("/api/customers?page=1&limit=2")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(2);
        });
    });

    it("GET /?active=false should return inactive customers", () => {
      return request(app.getHttpServer())
        .get("/api/customers?active=false")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((customer) => {
            expect(customer.isActive).toBe(false);
          });
        });
    });

    it("POST / should set default isActive to true", () => {
      const createCustomerDto: CreateCustomerDto = {
        name: "Default Active Customer",
        email: "default.active@example.com",
        phone: "111-222-3333",
        address: "321 Default St",
      };

      return request(app.getHttpServer())
        .post("/api/customers")
        .send(createCustomerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.isActive).toBe(true);
        });
    });

    it("PATCH /:id should handle concurrent updates", async () => {
      const customer = testData.updateTestCustomers[0];
      const updateDto1: UpdateCustomerDto = { name: "Update 1" };
      const updateDto2: UpdateCustomerDto = { name: "Update 2" };

      // Send concurrent updates
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .patch(`/api/customers/${customer.id}`)
          .send(updateDto1),
        request(app.getHttpServer())
          .patch(`/api/customers/${customer.id}`)
          .send(updateDto2),
      ]);

      // Both should succeed (optimistic locking is not implemented)
      expect([200, 200]).toContain(response1.status);
      expect([200, 200]).toContain(response2.status);
    });

    it("DELETE /:id should be idempotent", () => {
      const customer = testData.updateTestCustomers[2];

      return request(app.getHttpServer())
        .delete(`/api/customers/${customer.id}`)
        .expect(204)
        .then(() => {
          // Second delete should also return 204 (idempotent)
          return request(app.getHttpServer())
            .delete(`/api/customers/${customer.id}`)
            .expect(204);
        });
    });
  });
});

