import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { TestDataManager } from "../fixtures/base/test-data-manager";
import { ScenarioFixtures } from "../fixtures/scenarios/scenario-fixtures";
import { CreateProductDto } from "../../src/product/dto/create-product.dto";
import { UpdateProductDto } from "../../src/product/dto/update-product.dto";

describe("ProductController (e2e)", () => {
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

  describe("/api/products", () => {
    it("GET / should return all available products", async () => {
      // GIVEN: Various products in different categories
      const menuProducts = await scenarios.setupBasicMenuScenario();

      return request(app.getHttpServer())
        .get("/api/products")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);

          // Check if our created products are present
          const productNames = res.body.map((product) => product.name);
          expect(productNames).toContain("Margherita Pizza");
          expect(productNames).toContain("Caesar Salad");
        });
    });

    it("GET /?category=pizza should filter products by category", async () => {
      // GIVEN: Products in pizza category
      await dataManager.productFactory.createMargheritaPizza();
      await dataManager.productFactory.createPepperoniPizza();

      return request(app.getHttpServer())
        .get("/api/products?category=pizza")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((product) => {
            expect(product.category).toBe("pizza");
          });

          const productNames = res.body.map((product) => product.name);
          expect(productNames).toContain("Margherita Pizza");
          expect(productNames).toContain("Pepperoni Pizza");
        });
    });

    it("GET /:id should return product by id", async () => {
      // GIVEN: A specific product exists in the system
      const product = await dataManager.productFactory.createMargheritaPizza({
        name: "Test Pizza Product",
        price: 15.99,
      });

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

    it("PATCH /:id should update a product", async () => {
      // GIVEN: A product that can be updated
      const product = await dataManager.productFactory.createMargheritaPizza({
        name: "Original Product Name",
        price: 12.99,
        description: "Original description",
      });

      // WHEN: Updating specific product fields
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

    it("DELETE /:id should soft delete a product", async () => {
      // GIVEN: A product that can be safely deleted (not in any orders)
      const product = await dataManager.productFactory.build({
        name: "Deletable Test Product",
        description: "Product that can be safely deleted",
        price: 9.99,
        category: "test",
      });

      return request(app.getHttpServer())
        .delete(`/api/products/${product.id}`)
        .expect(204)
        .then(() => {
          // THEN: Product is no longer in the available list
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

    it("GET /?available=false should return unavailable products", async () => {
      // GIVEN: Some unavailable products in the system
      await dataManager.productFactory.createUnavailableProduct({
        name: "Seasonal Special",
        description: "Limited time offer - currently unavailable",
        price: 15.99,
        category: "special",
      });

      return request(app.getHttpServer())
        .get("/api/products?available=false")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);

          // All returned products should be unavailable
          res.body.forEach((product) => {
            expect(product.isAvailable).toBe(false);
          });

          // Should find the "Seasonal Special" unavailable product
          const seasonalProduct = res.body.find(
            (p) => p.name === "Seasonal Special"
          );
          expect(seasonalProduct).toBeDefined();
          expect(seasonalProduct.category).toBe("special");
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

    it("GET /?sort=price_asc should return products sorted by price ascending", () => {
      return request(app.getHttpServer())
        .get("/api/products?sort=price_asc")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(1);

          // Check if sorted by price ascending
          for (let i = 1; i < res.body.length; i++) {
            const currentPrice = parseFloat(res.body[i].price);
            const previousPrice = parseFloat(res.body[i - 1].price);
            expect(currentPrice).toBeGreaterThanOrEqual(previousPrice);
          }
        });
    });

    it("GET /?sort=price_desc should return products sorted by price descending", () => {
      return request(app.getHttpServer())
        .get("/api/products?sort=price_desc")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(1);

          // Check if sorted by price descending
          for (let i = 1; i < res.body.length; i++) {
            const currentPrice = parseFloat(res.body[i].price);
            const previousPrice = parseFloat(res.body[i - 1].price);
            expect(currentPrice).toBeLessThanOrEqual(previousPrice);
          }
        });
    });

    it("GET /?price_min=10&price_max=15 should filter products by price range", () => {
      return request(app.getHttpServer())
        .get("/api/products?price_min=10&price_max=15")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);

          res.body.forEach((product) => {
            const price = parseFloat(product.price);
            expect(price).toBeGreaterThanOrEqual(10);
            expect(price).toBeLessThanOrEqual(15);
          });
        });
    });

    it("PATCH /:id should validate price updates", async () => {
      // GIVEN: A product that will be used for price validation testing
      const product = await dataManager.productFactory.createMargheritaPizza({
        name: "Price Validation Test Product",
      });

      // WHEN: Attempting invalid price updates
      const invalidUpdates = [
        { price: -10 }, // Negative price
        { price: 0 }, // Zero price
        { price: "not-a-number" }, // Invalid format
      ];

      const promises = invalidUpdates.map((update) =>
        request(app.getHttpServer())
          .patch(`/api/products/${product.id}`)
          .send(update)
          .expect(400)
      );

      return Promise.all(promises);
    });

    it("PATCH /:id should handle category changes", async () => {
      // GIVEN: A product designed for category update testing
      const product = await dataManager.productFactory.build({
        name: "Category Change Test Product",
        description: "Product used for testing category changes",
        price: 10.99,
        category: "original-category",
      });

      // WHEN: Changing only the category
      return request(app.getHttpServer())
        .patch(`/api/products/${product.id}`)
        .send({ category: "updated-category" })
        .expect(200)
        .expect((res) => {
          expect(res.body.category).toBe("updated-category");
          expect(res.body.name).toBe(product.name); // Should remain unchanged
        });
    });

    it("GET /?search=pizza should search products by name", () => {
      return request(app.getHttpServer())
        .get("/api/products?search=pizza")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);

          res.body.forEach((product) => {
            expect(product.name.toLowerCase()).toContain("pizza");
          });
        });
    });

    it("DELETE /:id should prevent deletion of products in active orders", async () => {
      // GIVEN: A product that is in an active order (should not be deletable)
      const productsCrudScenario = await scenarios.setupProductCrudScenario();
      const productInOrder = productsCrudScenario.productsInActiveOrders[0];

      // WHEN: Attempting to delete a product that is in active orders
      return request(app.getHttpServer())
        .delete(`/api/products/${productInOrder.id}`)
        .expect(409) // Should prevent deletion
        .expect((res) => {
          expect(res.body.message).toContain("active orders");
        });
    });

    it("POST / should handle special characters in product names", () => {
      return request(app.getHttpServer())
        .post("/api/products")
        .send({
          name: "Spicy Jalapeño & Cheese Nacho's",
          description: "Product with special characters: åäö, éèê, ñ",
          price: 15.99,
          category: "snacks",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe("Spicy Jalapeño & Cheese Nacho's");
        });
    });

    it("PATCH /:id should update product availability", async () => {
      // GIVEN: A product that is initially available
      const product = await dataManager.productFactory.createMargheritaPizza({
        name: "Availability Test Product",
        isAvailable: true,
      });

      // WHEN: Making the product unavailable
      return request(app.getHttpServer())
        .patch(`/api/products/${product.id}`)
        .send({ isAvailable: false })
        .expect(200)
        .expect((res) => {
          expect(res.body.isAvailable).toBe(false);
        })
        .then(() => {
          // THEN: Product doesn't appear in available products list
          return request(app.getHttpServer())
            .get("/api/products")
            .expect(200)
            .expect((res) => {
              const foundProduct = res.body.find((p) => p.id === product.id);
              expect(foundProduct).toBeUndefined();
            });
        });
    });

    it("GET /?limit=3&offset=2 should paginate results", () => {
      return request(app.getHttpServer())
        .get("/api/products?limit=3&offset=2")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(3);
        });
    });

    it("POST / should validate price precision (max 2 decimal places)", () => {
      return request(app.getHttpServer())
        .post("/api/products")
        .send({
          name: "Precision Test Product",
          description: "Testing price precision",
          price: 12.999, // Too many decimal places
          category: "test",
        })
        .expect(400);
    });

    it("should handle bulk product creation", async () => {
      const bulkProducts = Array.from({ length: 5 }, (_, i) => ({
        name: `Bulk Product ${i}`,
        description: `Description for bulk product ${i}`,
        price: 10.99 + i,
        category: "bulk-test",
      }));

      const createPromises = bulkProducts.map((product) =>
        request(app.getHttpServer())
          .post("/api/products")
          .send(product)
          .expect(201)
      );

      const results = await Promise.all(createPromises);

      results.forEach((result, index) => {
        expect(result.body.name).toBe(bulkProducts[index].name);
        expect(parseFloat(result.body.price)).toBe(bulkProducts[index].price);
      });
    });

    it("PATCH /:id should handle partial updates without affecting other fields", async () => {
      // GIVEN: A product with specific initial data
      const product = await dataManager.productFactory.build({
        name: "Partial Update Test Pizza",
        description: "Pizza used for testing partial updates",
        price: 13.99,
        category: "pizza",
      });

      const originalName = product.name;
      const originalCategory = product.category;

      // WHEN: Updating only the description field
      return request(app.getHttpServer())
        .patch(`/api/products/${product.id}`)
        .send({ description: "Updated description only" })
        .expect(200)
        .expect((res) => {
          expect(res.body.description).toBe("Updated description only");
          expect(res.body.name).toBe(originalName); // Should remain unchanged
          expect(res.body.category).toBe(originalCategory); // Should remain unchanged
        });
    });

    it("GET /:id should return 404 for soft-deleted products", async () => {
      // GIVEN: A product that will be soft deleted
      const product = await dataManager.productFactory.build({
        name: "Soft Delete Test Product",
        description: "Product used for soft delete testing",
        price: 6.99,
        category: "test",
      });

      // WHEN: Soft deleting the product
      await request(app.getHttpServer())
        .delete(`/api/products/${product.id}`)
        .expect(204);

      // THEN: Should return 404 when trying to access
      return request(app.getHttpServer())
        .get(`/api/products/${product.id}`)
        .expect(404);
    });

    it("should validate category enum values", () => {
      const validCategories = [
        "pizza",
        "salad",
        "drink",
        "dessert",
        "appetizer",
      ];

      const promises = validCategories.map((category, index) =>
        request(app.getHttpServer())
          .post("/api/products")
          .send({
            name: `Category Test ${index}`,
            description: `Testing ${category} category`,
            price: 12.99,
            category: category,
          })
          .expect(201)
      );

      return Promise.all(promises);
    });
  });
});
