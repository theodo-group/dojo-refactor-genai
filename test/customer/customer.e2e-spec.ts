import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { CreateCustomerDto } from "../../src/customer/dto/create-customer.dto";
import { UpdateCustomerDto } from "../../src/customer/dto/update-customer.dto";
import { CustomerFixtures, CustomerTestScenario } from "../fixtures/customer-fixtures";

describe("CustomerController (e2e)", () => {
  let app: INestApplication;
  let fixtures: CustomerFixtures;
  let scenario: CustomerTestScenario;

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
    fixtures = new CustomerFixtures(app);
  });

  beforeEach(async () => {
    // Clean up and create fresh test scenario for each test
    await fixtures.cleanup();
    scenario = await fixtures.createTestScenario();
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
          expect(res.body.length).toBe(scenario.customers.length);

          // Check if all customers are returned
          const emails = res.body.map((customer) => customer.email);
          expect(emails).toContain("customer.test@example.com");
          expect(emails).toContain("update.test@example.com");
          expect(emails).toContain("delete.test@example.com");
        });
    });

    it("GET /:id should return customer by id", () => {
      const customer = scenario.testCustomer;

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
      const customer = scenario.updateTestCustomer;
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
      const customer = scenario.deleteTestCustomer;

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
      const existingCustomer = scenario.testCustomer;
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

      const promises = invalidEmailFormats.map((email) => {
        const invalidDto: CreateCustomerDto = {
          name: "Test Customer",
          email: email,
          phone: "111-222-3333",
          address: "321 Test St",
        };

        return request(app.getHttpServer())
          .post("/api/customers")
          .send(invalidDto)
          .expect(400);
      });

      return Promise.all(promises);
    });

    it("PATCH /:id should validate partial updates", () => {
      const customer = scenario.updateTestCustomer;
      const updateCustomerDto: UpdateCustomerDto = {
        name: "Updated Name",
        // Only updating name
      };

      return request(app.getHttpServer())
        .patch(`/api/customers/${customer.id}`)
        .send(updateCustomerDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe(updateCustomerDto.name);
          // Other fields should remain unchanged
          expect(res.body.email).toBe(customer.email);
          expect(res.body.phone).toBe(customer.phone);
          expect(res.body.address).toBe(customer.address);
        });
    });

    it("PATCH /:id should return 404 for non-existent customer", () => {
      const updateCustomerDto: UpdateCustomerDto = {
        name: "Updated Name",
      };

      return request(app.getHttpServer())
        .patch("/api/customers/00000000-0000-0000-0000-000000000000")
        .send(updateCustomerDto)
        .expect(404);
    });

    it("DELETE /:id should return 404 for non-existent customer", () => {
      return request(app.getHttpServer())
        .delete("/api/customers/00000000-0000-0000-0000-000000000000")
        .expect(404);
    });
  });
});
