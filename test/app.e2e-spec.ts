import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "./../src/app.module";
import { CustomerFixtures } from "./fixtures/customer-fixtures";

describe("AppController (e2e)", () => {
  let app: INestApplication;
  let fixtures: CustomerFixtures;

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
    await fixtures.load();
  });

  afterAll(async () => {
    if (fixtures) {
      await fixtures.clear();
    }
    if (app) {
      await app.close();
    }
  });

  describe("Application Health & Basic Tests", () => {
    it("/ (GET)", () => {
      return request(app.getHttpServer()).get("/").expect(404); // Root path is not defined
    });

    it("/api (GET) should return 404 for undefined API root", () => {
      return request(app.getHttpServer()).get("/api").expect(404);
    });

    it("should handle invalid JSON gracefully", () => {
      return request(app.getHttpServer())
        .post("/api/customers")
        .send('{"invalid": json}')
        .set("Content-Type", "application/json")
        .expect(400);
    });

    it("should handle large request bodies within limits", () => {
      const largeButValidData = {
        name: "A".repeat(100),
        email: "verylongemail@example.com",
        phone: "1".repeat(20),
        address: "B".repeat(500),
      };

      return request(app.getHttpServer())
        .post("/api/customers")
        .send(largeButValidData)
        .expect(201);
    });

    it("should handle concurrent requests properly", async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app.getHttpServer()).get("/api/customers").expect(200)
      );

      const responses = await Promise.all(requests);

      // All responses should be successful and consistent
      responses.forEach((response) => {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
    });

    it("should return appropriate error for unsupported HTTP methods", () => {
      return request(app.getHttpServer())
        .patch("/api/customers") // PATCH without ID should be 404 or 405
        .expect(404);
    });

    it("should handle malformed UUIDs in path parameters", () => {
      return request(app.getHttpServer())
        .get("/api/customers/invalid-uuid-format")
        .expect(400);
    });

    it("should properly handle query parameter validation", () => {
      return request(app.getHttpServer())
        .get("/api/products?category=pizza&available=not-boolean")
        .expect(200) // Should handle gracefully or validate
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe("API Performance & Load Tests", () => {
    it("should handle rapid successive requests", async () => {
      const startTime = Date.now();

      const rapidRequests = Array.from({ length: 50 }, () =>
        request(app.getHttpServer()).get("/api/products").expect(200)
      );

      await Promise.all(rapidRequests);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (5 seconds for 50 requests)
      expect(duration).toBeLessThan(5000);
    });

    it("should maintain data consistency under concurrent modifications", async () => {
      const customer = fixtures.getUpdateTestCustomers()[1]; // Use specific customer for concurrent tests

      // Create multiple concurrent update requests
      const updates = Array.from({ length: 5 }, (_, i) =>
        request(app.getHttpServer())
          .patch(`/api/customers/${customer.id}`)
          .send({ name: `Updated Name ${i}` })
          .expect(200)
      );

      const results = await Promise.all(updates);

      // At least one should succeed
      expect(results.some((res) => res.status === 200)).toBe(true);

      // Verify final state
      const finalCustomer = await request(app.getHttpServer())
        .get(`/api/customers/${customer.id}`)
        .expect(200);

      expect(finalCustomer.body.name).toMatch(/Updated Name \d/);
    });
  });

  describe("Error Handling & Edge Cases", () => {
    it("should handle database connection errors gracefully", async () => {
      // This test would require actual database connection manipulation
      // For now, we'll test that the app can handle invalid operations

      const invalidOperations = [
        request(app.getHttpServer())
          .get("/api/customers/00000000-0000-0000-0000-000000000000")
          .expect(404),
        request(app.getHttpServer())
          .post("/api/orders")
          .send({
            customerId: "00000000-0000-0000-0000-000000000000",
            productIds: ["00000000-0000-0000-0000-000000000000"],
            totalAmount: 100,
          })
          .expect(400),
      ];

      await Promise.all(invalidOperations);
    });

    it("should handle empty request bodies appropriately", () => {
      return request(app.getHttpServer())
        .post("/api/customers")
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
          expect(Array.isArray(res.body.message)).toBe(true);
        });
    });

    it("should handle special characters in request data", () => {
      return request(app.getHttpServer())
        .post("/api/customers")
        .send({
          name: "José María Çağlar-Schmidt",
          email: "test.email+tag@example.co.uk",
          phone: "+1-(555)-123-4567",
          address: '123 Main St., Apt. #4B, "Special" Building',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe("José María Çağlar-Schmidt");
          expect(res.body.email).toBe("test.email+tag@example.co.uk");
        });
    });
  });
});
