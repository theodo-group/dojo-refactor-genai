import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { CreateProductDto } from "../../src/product/dto/create-product.dto";
import { UpdateProductDto } from "../../src/product/dto/update-product.dto";
import { ProductFixtures, ProductTestScenario } from "../fixtures/product-fixtures";

describe("ProductController (e2e)", () => {
  let app: INestApplication;
  let fixtures: ProductFixtures;
  let scenario: ProductTestScenario;

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
    fixtures = new ProductFixtures(app);
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

  describe("/api/products", () => {
    it("GET / should return all available products", () => {
      return request(app.getHttpServer())
        .get("/api/products")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(3); // Available products only

          // Check if products data is correct
          const productNames = res.body.map((product) => product.name);
          expect(productNames).toContain("Test Pizza");
          expect(productNames).toContain("Update Test Product");
        });
    });

    it("GET /?category=pizza should filter products by category", () => {
      return request(app.getHttpServer())
        .get("/api/products?category=pizza")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((product) => {
            expect(product.category).toBe("pizza");
          });

          const productNames = res.body.map((product) => product.name);
          expect(productNames).toContain("Test Pizza");
        });
    });

    it("GET /:id should return product by id", () => {
      const product = scenario.testProduct;

      return request(app.getHttpServer())
        .get(`/api/products/${product.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(product.id);
          expect(res.body.name).toBe(product.name);
          expect(res.body.price).toBe(product.price.toString());
        });
    });

    it("POST / should create a new product", () => {
      const createProductDto: CreateProductDto = {
        name: "Test Product",
        description: "This is a test product",
        price: 9.99,
        category: "test",
      };

      return request(app.getHttpServer())
        .post("/api/products")
        .send(createProductDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe(createProductDto.name);
          expect(res.body.description).toBe(createProductDto.description);
          expect(parseFloat(res.body.price)).toBe(createProductDto.price);
          expect(res.body.category).toBe(createProductDto.category);
          expect(res.body.isAvailable).toBe(true);
        });
    });

    it("PATCH /:id should update a product", () => {
      const product = scenario.updateTestProduct;
      const updateProductDto: UpdateProductDto = {
        name: "Updated Product Name",
        price: 19.99,
      };

      return request(app.getHttpServer())
        .patch(`/api/products/${product.id}`)
        .send(updateProductDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(product.id);
          expect(res.body.name).toBe(updateProductDto.name);
          expect(parseFloat(res.body.price)).toBe(updateProductDto.price);
          // Description should remain unchanged
          expect(res.body.description).toBe(product.description);
        });
    });

    it("DELETE /:id should soft delete a product", () => {
      const product = scenario.deleteTestProduct;

      return request(app.getHttpServer())
        .delete(`/api/products/${product.id}`)
        .expect(204)
        .then(() => {
          // Verify product is no longer in the available list
          return request(app.getHttpServer())
            .get("/api/products")
            .expect(200)
            .expect((res) => {
              const foundProduct = res.body.find((p) => p.id === product.id);
              expect(foundProduct).toBeUndefined();
            });
        });
    });

    // NEW COMPREHENSIVE TESTS
    it("POST / should reject products with negative or zero prices", () => {
      const invalidPriceDto: CreateProductDto = {
        name: "Invalid Price Product",
        description: "This product has invalid price",
        price: -5.99, // Invalid negative price
        category: "test",
      };

      return request(app.getHttpServer())
        .post("/api/products")
        .send(invalidPriceDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("price must not be less than 0");
        });
    });

    it("GET /?available=false should return unavailable products", () => {
      return request(app.getHttpServer())
        .get("/api/products?available=false")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);

          // All returned products should be unavailable
          res.body.forEach((product) => {
            expect(product.isAvailable).toBe(false);
          });

          // Should find the unavailable test product
          const unavailableProduct = res.body.find(
            (p) => p.name === "Unavailable Test Product"
          );
          expect(unavailableProduct).toBeDefined();
          expect(unavailableProduct.category).toBe("special");
        });
    });

    it("POST / should validate zero price products", () => {
      const zeroPriceDto: CreateProductDto = {
        name: "Free Product",
        description: "This product is free",
        price: 0, // Zero price should be rejected
        category: "free",
      };

      return request(app.getHttpServer())
        .post("/api/products")
        .send(zeroPriceDto)
        .expect(400);
    });

    it("GET /?category=nonexistent should return empty array", () => {
      return request(app.getHttpServer())
        .get("/api/products?category=nonexistent")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(0);
        });
    });

    it("GET /:id should return 404 for non-existent product", () => {
      return request(app.getHttpServer())
        .get("/api/products/00000000-0000-0000-0000-000000000000")
        .expect(404);
    });

    it("PATCH /:id should return 404 for non-existent product", () => {
      const updateProductDto: UpdateProductDto = {
        name: "Updated Name",
      };

      return request(app.getHttpServer())
        .patch("/api/products/00000000-0000-0000-0000-000000000000")
        .send(updateProductDto)
        .expect(404);
    });

    it("DELETE /:id should return 404 for non-existent product", () => {
      return request(app.getHttpServer())
        .delete("/api/products/00000000-0000-0000-0000-000000000000")
        .expect(404);
    });

    it("POST / should validate required fields", () => {
      const incompleteDto = {
        name: "Incomplete Product",
        // Missing description, price, and category
      };

      return request(app.getHttpServer())
        .post("/api/products")
        .send(incompleteDto)
        .expect(400);
    });

    it("PATCH /:id should allow partial updates", () => {
      const product = scenario.updateTestProduct;
      const updateProductDto: UpdateProductDto = {
        price: 99.99,
        // Only updating price
      };

      return request(app.getHttpServer())
        .patch(`/api/products/${product.id}`)
        .send(updateProductDto)
        .expect(200)
        .expect((res) => {
          expect(parseFloat(res.body.price)).toBe(updateProductDto.price);
          // Other fields should remain unchanged
          expect(res.body.name).toBe(product.name);
          expect(res.body.description).toBe(product.description);
          expect(res.body.category).toBe(product.category);
        });
    });

    it("GET /?available=true should return only available products", () => {
      return request(app.getHttpServer())
        .get("/api/products?available=true")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((product) => {
            expect(product.isAvailable).toBe(true);
          });
        });
    });

    it("POST / should set product as available by default", () => {
      const createProductDto: CreateProductDto = {
        name: "Default Available Product",
        description: "Should be available by default",
        price: 15.99,
        category: "default",
      };

      return request(app.getHttpServer())
        .post("/api/products")
        .send(createProductDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.isAvailable).toBe(true);
        });
    });
  });
});
