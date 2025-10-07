import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { setupTestApp } from "../helpers/app.helper";
import { FixturesHelper } from "../helpers/fixtures.helper";
import { DatabaseHelper } from "../helpers/database.helper";
import { CreateCustomerDto } from "../../src/customer/dto/create-customer.dto";
import { UpdateCustomerDto } from "../../src/customer/dto/update-customer.dto";

describe("CustomerController (e2e)", () => {
  let app: INestApplication;
  let fixtures: FixturesHelper;
  let database: DatabaseHelper;

  beforeEach(async () => {
    app = await setupTestApp();
    fixtures = new FixturesHelper(app);
    database = new DatabaseHelper(app);
    await database.cleanDatabase();
  });

  afterEach(async () => {
    await database.cleanDatabase();
    if (app) {
      await app.close();
    }
  });

  describe("/api/customers", () => {
    it("GET / should return all active customers", async () => {
      await fixtures.createCustomer({ email: "john@example.com" });
      await fixtures.createCustomer({ email: "jane@example.com" });
      await fixtures.createCustomer({ email: "bob@example.com" });

      return request(app.getHttpServer())
        .get("/api/customers")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(3);

          const emails = res.body.map((customer) => customer.email);
          expect(emails).toContain("john@example.com");
          expect(emails).toContain("jane@example.com");
          expect(emails).toContain("bob@example.com");
        });
    });

    it("GET /:id should return customer by id", async () => {
      const customer = await fixtures.createCustomer({
        name: "John Doe",
        email: "john@example.com",
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
      const customer = await fixtures.createCustomer({
        name: "Original Name",
        email: "original@example.com",
        phone: "original-phone",
      });

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
      const customer = await fixtures.createCustomer({
        name: "Customer to Delete",
      });

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

    it("POST / should reject duplicate email addresses", async () => {
      const existingCustomer = await fixtures.createCustomer({
        email: "existing@example.com",
      });

      const duplicateEmailDto: CreateCustomerDto = {
        name: "Duplicate Test",
        email: existingCustomer.email,
        phone: "999-999-9999",
        address: "999 Test St",
      };

      return request(app.getHttpServer())
        .post("/api/customers")
        .send(duplicateEmailDto)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain("already exists");
        });
    });

    it("GET /?include_orders=true should return customers with order history", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct();
      await fixtures.createOrder(customer, [product]);

      return request(app.getHttpServer())
        .get("/api/customers?include_orders=true")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);

          res.body.forEach((customer) => {
            expect(customer.orders).toBeDefined();
            expect(Array.isArray(customer.orders)).toBe(true);
          });

          const customerWithOrders = res.body.find((c) => c.orders.length > 0);
          expect(customerWithOrders).toBeDefined();
          expect(customerWithOrders.orders[0]).toHaveProperty("id");
          expect(customerWithOrders.orders[0]).toHaveProperty("totalAmount");
          expect(customerWithOrders.orders[0]).toHaveProperty("status");
        });
    });

    it("POST / should validate email format", async () => {
      const invalidEmailFormats = [
        "notanemail",
        "@domain.com",
        "user@",
        "user@domain",
        "user..double@domain.com",
        "user@domain..com",
      ];

      for (const email of invalidEmailFormats) {
        await request(app.getHttpServer())
          .post("/api/customers")
          .send({
            name: "Test User",
            email,
            phone: "123-456-7890",
          })
          .expect(400);
      }
    });

    it("POST / should validate required fields", () => {
      const testCases = [
        { email: "test@example.com" },
        { name: "Test User" },
        {},
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
          name: "A".repeat(1000),
          email: "test@example.com",
          phone: "123-456-7890",
          address: "B".repeat(2000),
        })
        .expect(400);
    });

    it("PATCH /:id should prevent email updates to existing emails", async () => {
      const customer1 = await fixtures.createCustomer({
        email: "customer1@example.com",
      });
      const customer2 = await fixtures.createCustomer({
        email: "customer2@example.com",
      });

      return request(app.getHttpServer())
        .patch(`/api/customers/${customer1.id}`)
        .send({ email: customer2.email })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain("already exists");
        });
    });

    it("PATCH /:id should allow partial updates", async () => {
      const customer = await fixtures.createCustomer({
        name: "Original Name",
        email: "original@example.com",
        phone: "original-phone",
      });

      return request(app.getHttpServer())
        .patch(`/api/customers/${customer.id}`)
        .send({ phone: "updated-phone-only" })
        .expect(200)
        .expect((res) => {
          expect(res.body.phone).toBe("updated-phone-only");
          expect(res.body.email).toBe(customer.email);
          expect(res.body.name).toBe(customer.name);
        });
    });

    it("GET / should paginate results when limit parameter is provided", async () => {
      await fixtures.createCustomers(5);

      return request(app.getHttpServer())
        .get("/api/customers?limit=2&offset=0")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(2);
        });
    });

    it("GET / should filter customers by active status", async () => {
      await fixtures.createCustomer({ isActive: true });
      await fixtures.createCustomer({ isActive: true });

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

    it("GET / should search customers by name", async () => {
      await fixtures.createCustomer({ name: "John Doe" });
      await fixtures.createCustomer({ name: "Jane Smith" });

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
      const customer = await fixtures.createCustomer({
        email: "delete-test@example.com",
      });

      await request(app.getHttpServer())
        .delete(`/api/customers/${customer.id}`)
        .expect(204);

      const activeCustomers = await request(app.getHttpServer())
        .get("/api/customers")
        .expect(200);

      const foundActive = activeCustomers.body.find(
        (c) => c.id === customer.id
      );
      expect(foundActive).toBeUndefined();

      await request(app.getHttpServer())
        .post("/api/customers")
        .send({
          name: "New Customer",
          email: customer.email,
        })
        .expect(409);
    });

    it("PATCH /:id should update customer timestamps", async () => {
      const customer = await fixtures.createCustomer();
      const originalUpdatedAt = customer.updatedAt;

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

      results.forEach((result, index) => {
        expect(result.body.name).toBe(bulkCustomers[index].name);
        expect(result.body.email).toBe(bulkCustomers[index].email);
      });

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
      const customer = await fixtures.createCustomer({
        name: "Test Customer",
        email: "reactivate@example.com",
      });

      await request(app.getHttpServer())
        .delete(`/api/customers/${customer.id}`)
        .expect(204);

      const reactivationResponse = await request(app.getHttpServer())
        .post("/api/customers")
        .send({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
        });

      expect([201, 409]).toContain(reactivationResponse.status);
    });
  });
});
