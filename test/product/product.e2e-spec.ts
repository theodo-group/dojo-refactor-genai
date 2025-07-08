import * as request from "supertest";
import { TestContext, createTestContext } from "../utils/test-context";
import { CreateProductDto } from "../../src/product/dto/create-product.dto";
import { UpdateProductDto } from "../../src/product/dto/update-product.dto";

describe("ProductController (e2e)", () => {
  let testContext: TestContext;

  beforeAll(async () => {
    testContext = await createTestContext();
  });

  beforeEach(async () => {
    await testContext.cleanDatabase();
  });

  afterAll(async () => {
    await testContext.cleanup();
  });

  describe("/api/products", () => {
    it("GET / should return all available products", async () => {
      // Create test products
      const margherita = await testContext.margheritaPizza().build();
      const caesar = await testContext.caesarSalad().build();

      return request(testContext.getHttpServer())
        .get("/api/products")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);

          // Check if products data is correct
          const productNames = res.body.map((product) => product.name);
          expect(productNames).toContain(margherita.name);
          expect(productNames).toContain(caesar.name);
        });
    });

    it("GET /?category=pizza should filter products by category", async () => {
      // Create products with different categories
      const margherita = await testContext.margheritaPizza().build();
      const pepperoni = await testContext.pepperoniPizza().build();
      const caesar = await testContext.caesarSalad().build();

      return request(testContext.getHttpServer())
        .get("/api/products?category=pizza")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((product) => {
            expect(product.category).toBe("pizza");
          });

          const productNames = res.body.map((product) => product.name);
          expect(productNames).toContain(margherita.name);
          expect(productNames).toContain(pepperoni.name);
          expect(productNames).not.toContain(caesar.name);
        });
    });

    it("GET /:id should return product by id", async () => {
      const product = await testContext.margheritaPizza().build();

      return request(testContext.getHttpServer())
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

      return request(testContext.getHttpServer())
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
      const product = await testContext.margheritaPizza().build();
      const updateProductDto: UpdateProductDto = {
        name: "Updated Product Name",
        price: 19.99,
      };

      return request(testContext.getHttpServer())
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
      const product = await testContext.productBuilder()
        .withName("Deletable Product")
        .withCategory("test")
        .build();

      return request(testContext.getHttpServer())
        .delete(`/api/products/${product.id}`)
        .expect(204)
        .then(() => {
          // Verify product is no longer in the available list
          return request(testContext.getHttpServer())
            .get("/api/products")
            .expect(200)
            .expect((res) => {
              const foundProduct = res.body.find((p) => p.id === product.id);
              expect(foundProduct).toBeUndefined();
            });
        });
    });

    it("POST / should reject products with negative or zero prices", () => {
      const invalidPriceDto: CreateProductDto = {
        name: "Invalid Price Product",
        description: "This product has invalid price",
        price: -5.99, // Invalid negative price
        category: "test",
      };

      return request(testContext.getHttpServer())
        .post("/api/products")
        .send(invalidPriceDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain("price must not be less than 0");
        });
    });

    it("GET /?available=false should return unavailable products", async () => {
      // Create unavailable product
      const unavailableProduct = await testContext.unavailableProduct().build();

      return request(testContext.getHttpServer())
        .get("/api/products?available=false")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);

          // All returned products should be unavailable
          res.body.forEach((product) => {
            expect(product.isAvailable).toBe(false);
          });

          // Should find the unavailable product
          const foundProduct = res.body.find((p) => p.id === unavailableProduct.id);
          expect(foundProduct).toBeDefined();
        });
    });

    it("POST / should validate zero price products", () => {
      const zeroPriceDto: CreateProductDto = {
        name: "Free Product",
        description: "This product is free",
        price: 0, // Zero price should be rejected
        category: "free",
      };

      return request(testContext.getHttpServer())
        .post("/api/products")
        .send(zeroPriceDto)
        .expect(400);
    });

    it("GET /?category=nonexistent should return empty array", () => {
      return request(testContext.getHttpServer())
        .get("/api/products?category=nonexistent")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(0);
        });
    });

    it("GET /?sort=price_asc should return products sorted by price ascending", async () => {
      // Create products with different prices
      await testContext.productBuilder().withPrice(5.99).build();
      await testContext.productBuilder().withPrice(10.99).build();
      await testContext.productBuilder().withPrice(15.99).build();

      return request(testContext.getHttpServer())
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

    it("GET /?sort=price_desc should return products sorted by price descending", async () => {
      // Create products with different prices
      await testContext.productBuilder().withPrice(5.99).build();
      await testContext.productBuilder().withPrice(10.99).build();
      await testContext.productBuilder().withPrice(15.99).build();

      return request(testContext.getHttpServer())
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

    it("GET /?price_min=10&price_max=15 should filter products by price range", async () => {
      // Create products with prices in and out of range
      await testContext.productBuilder().withPrice(8.99).build(); // Below range
      await testContext.productBuilder().withPrice(12.99).build(); // In range
      await testContext.productBuilder().withPrice(17.99).build(); // Above range

      return request(testContext.getHttpServer())
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

    it("POST / should validate required fields", () => {
      const testCases = [
        { description: "Missing name", price: 10.99, category: "test" },
        { name: "Test Product", category: "test" }, // Missing price
        { name: "Test Product", price: 10.99 }, // Missing category
        {}, // Missing everything
      ];

      const promises = testCases.map((data) =>
        request(testContext.getHttpServer())
          .post("/api/products")
          .send(data)
          .expect(400)
      );

      return Promise.all(promises);
    });

    it("PATCH /:id should validate price updates", async () => {
      const product = await testContext.margheritaPizza().build();

      const invalidUpdates = [
        { price: -10 }, // Negative price
        { price: 0 }, // Zero price
        { price: "not-a-number" }, // Invalid format
      ];

      const promises = invalidUpdates.map((update) =>
        request(testContext.getHttpServer())
          .patch(`/api/products/${product.id}`)
          .send(update)
          .expect(400)
      );

      return Promise.all(promises);
    });

    it("PATCH /:id should handle category changes", async () => {
      const product = await testContext.productBuilder()
        .withName("Category Change Test")
        .withCategory("original-category")
        .build();

      return request(testContext.getHttpServer())
        .patch(`/api/products/${product.id}`)
        .send({ category: "updated-category" })
        .expect(200)
        .expect((res) => {
          expect(res.body.category).toBe("updated-category");
          expect(res.body.name).toBe(product.name); // Should remain unchanged
        });
    });

    it("GET /?search=pizza should search products by name", async () => {
      // Create products with and without "pizza" in name
      await testContext.margheritaPizza().build();
      await testContext.pepperoniPizza().build();
      await testContext.caesarSalad().build();

      return request(testContext.getHttpServer())
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
      // Create customer, product, and active order
      const customer = await testContext.johnDoe().build();
      const product = await testContext.pepperoniPizza().build();
      await testContext.orderBuilder()
        .withCustomer(customer)
        .withProducts([product])
        .preparing() // Active status
        .build();

      return request(testContext.getHttpServer())
        .delete(`/api/products/${product.id}`)
        .expect(409) // Should prevent deletion
        .expect((res) => {
          expect(res.body.message).toContain("active orders");
        });
    });

    it("POST / should handle special characters in product names", () => {
      return request(testContext.getHttpServer())
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
      const product = await testContext.margheritaPizza().build();

      return request(testContext.getHttpServer())
        .patch(`/api/products/${product.id}`)
        .send({ isAvailable: false })
        .expect(200)
        .expect((res) => {
          expect(res.body.isAvailable).toBe(false);
        })
        .then(() => {
          // Verify it doesn't appear in available products
          return request(testContext.getHttpServer())
            .get("/api/products")
            .expect(200)
            .expect((res) => {
              const foundProduct = res.body.find((p) => p.id === product.id);
              expect(foundProduct).toBeUndefined();
            });
        });
    });

    it("GET /?limit=3&offset=2 should paginate results", async () => {
      // Create enough products for pagination test
      await testContext.productBuilder().buildMany(6);

      return request(testContext.getHttpServer())
        .get("/api/products?limit=3&offset=2")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(3);
        });
    });

    it("POST / should validate price precision (max 2 decimal places)", () => {
      return request(testContext.getHttpServer())
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
        request(testContext.getHttpServer())
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
      const product = await testContext.productBuilder()
        .withName("Update Test Pizza")
        .withDescription("Pizza used for testing partial updates")
        .withCategory("pizza")
        .build();
      const originalName = product.name;
      const originalCategory = product.category;

      return request(testContext.getHttpServer())
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
      const product = await testContext.productBuilder()
        .withName("Soft Delete Test Product")
        .build();

      // Soft delete the product
      await request(testContext.getHttpServer())
        .delete(`/api/products/${product.id}`)
        .expect(204);

      // Should return 404 when trying to access
      return request(testContext.getHttpServer())
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
        request(testContext.getHttpServer())
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
