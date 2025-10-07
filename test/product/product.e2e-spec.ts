import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { setupTestApp } from "../helpers/app.helper";
import { FixturesHelper } from "../helpers/fixtures.helper";
import { DatabaseHelper } from "../helpers/database.helper";
import { CreateProductDto } from "../../src/product/dto/create-product.dto";
import { UpdateProductDto } from "../../src/product/dto/update-product.dto";
import { OrderStatus } from "../../src/entities/order.entity";

describe("ProductController (e2e)", () => {
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

  describe("/api/products", () => {
    it("GET / should return all available products", async () => {
      // Create test products
      await fixtures.createProduct({
        name: "Margherita Pizza",
        category: "pizza",
        price: 12.99,
      });
      await fixtures.createProduct({
        name: "Caesar Salad",
        category: "salad",
        price: 8.99,
      });

      return request(app.getHttpServer())
        .get("/api/products")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);

          const productNames = res.body.map((product) => product.name);
          expect(productNames).toContain("Margherita Pizza");
          expect(productNames).toContain("Caesar Salad");
        });
    });

    it("GET /?category=pizza should filter products by category", async () => {
      await fixtures.createProduct({
        name: "Margherita Pizza",
        category: "pizza",
      });
      await fixtures.createProduct({
        name: "Pepperoni Pizza",
        category: "pizza",
      });
      await fixtures.createProduct({
        name: "Caesar Salad",
        category: "salad",
      });

      return request(app.getHttpServer())
        .get("/api/products?category=pizza")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);
          res.body.forEach((product) => {
            expect(product.category).toBe("pizza");
          });

          const productNames = res.body.map((product) => product.name);
          expect(productNames).toContain("Margherita Pizza");
          expect(productNames).toContain("Pepperoni Pizza");
        });
    });

    it("GET /:id should return product by id", async () => {
      const product = await fixtures.createProduct({
        name: "Test Product",
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
      const product = await fixtures.createProduct({
        name: "Original Name",
        description: "Original Description",
        price: 10.99,
      });

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
      const product = await fixtures.createProduct({
        name: "Product to Delete",
      });

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

    it("POST / should reject products with negative or zero prices", () => {
      const invalidPriceDto: CreateProductDto = {
        name: "Invalid Price Product",
        description: "This product has invalid price",
        price: -5.99,
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
      await fixtures.createProduct({
        name: "Available Product",
        isAvailable: true,
      });
      await fixtures.createProduct({
        name: "Seasonal Special",
        category: "special",
        isAvailable: false,
      });

      return request(app.getHttpServer())
        .get("/api/products?available=false")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);

          res.body.forEach((product) => {
            expect(product.isAvailable).toBe(false);
          });

          expect(res.body[0].name).toBe("Seasonal Special");
          expect(res.body[0].category).toBe("special");
        });
    });

    it("POST / should validate zero price products", () => {
      const zeroPriceDto: CreateProductDto = {
        name: "Free Product",
        description: "This product is free",
        price: 0,
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

    it("GET /?sort=price_asc should return products sorted by price ascending", async () => {
      await fixtures.createProduct({ name: "Expensive", price: 20.99 });
      await fixtures.createProduct({ name: "Cheap", price: 5.99 });
      await fixtures.createProduct({ name: "Medium", price: 12.99 });

      return request(app.getHttpServer())
        .get("/api/products?sort=price_asc")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(3);

          for (let i = 1; i < res.body.length; i++) {
            const currentPrice = parseFloat(res.body[i].price);
            const previousPrice = parseFloat(res.body[i - 1].price);
            expect(currentPrice).toBeGreaterThanOrEqual(previousPrice);
          }
        });
    });

    it("GET /?sort=price_desc should return products sorted by price descending", async () => {
      await fixtures.createProduct({ name: "Expensive", price: 20.99 });
      await fixtures.createProduct({ name: "Cheap", price: 5.99 });
      await fixtures.createProduct({ name: "Medium", price: 12.99 });

      return request(app.getHttpServer())
        .get("/api/products?sort=price_desc")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(3);

          for (let i = 1; i < res.body.length; i++) {
            const currentPrice = parseFloat(res.body[i].price);
            const previousPrice = parseFloat(res.body[i - 1].price);
            expect(currentPrice).toBeLessThanOrEqual(previousPrice);
          }
        });
    });

    it("GET /?price_min=10&price_max=15 should filter products by price range", async () => {
      await fixtures.createProduct({ name: "Too Cheap", price: 5.99 });
      await fixtures.createProduct({ name: "Just Right 1", price: 10.99 });
      await fixtures.createProduct({ name: "Just Right 2", price: 14.99 });
      await fixtures.createProduct({ name: "Too Expensive", price: 20.99 });

      return request(app.getHttpServer())
        .get("/api/products?price_min=10&price_max=15")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);

          res.body.forEach((product) => {
            const price = parseFloat(product.price);
            expect(price).toBeGreaterThanOrEqual(10);
            expect(price).toBeLessThanOrEqual(15);
          });
        });
    });

    it("POST / should validate required fields", async () => {
      const testCases = [
        { description: "Missing name", price: 10.99, category: "test" },
        { name: "Test Product", category: "test" },
        { name: "Test Product", price: 10.99 },
        {},
      ];

      for (const data of testCases) {
        await request(app.getHttpServer())
          .post("/api/products")
          .send(data)
          .expect(400);
      }
    });

    it("PATCH /:id should validate price updates", async () => {
      const product = await fixtures.createProduct();

      const invalidUpdates = [
        { price: -10 },
        { price: 0 },
        { price: "not-a-number" },
      ];

      for (const update of invalidUpdates) {
        await request(app.getHttpServer())
          .patch(`/api/products/${product.id}`)
          .send(update)
          .expect(400);
      }
    });

    it("PATCH /:id should handle category changes", async () => {
      const product = await fixtures.createProduct({
        name: "Test Product",
        category: "original-category",
      });

      return request(app.getHttpServer())
        .patch(`/api/products/${product.id}`)
        .send({ category: "updated-category" })
        .expect(200)
        .expect((res) => {
          expect(res.body.category).toBe("updated-category");
          expect(res.body.name).toBe(product.name);
        });
    });

    it("GET /?search=pizza should search products by name", async () => {
      await fixtures.createProduct({ name: "Margherita Pizza" });
      await fixtures.createProduct({ name: "Pepperoni Pizza" });
      await fixtures.createProduct({ name: "Caesar Salad" });

      return request(app.getHttpServer())
        .get("/api/products?search=pizza")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);

          res.body.forEach((product) => {
            expect(product.name.toLowerCase()).toContain("pizza");
          });
        });
    });

    it("DELETE /:id should prevent deletion of products in active orders", async () => {
      const customer = await fixtures.createCustomer();
      const product = await fixtures.createProduct({ name: "Pepperoni Pizza" });

      // Create an order with this product in PREPARING status (active)
      await fixtures.createOrder(customer, [product], {
        status: OrderStatus.PREPARING,
      });

      return request(app.getHttpServer())
        .delete(`/api/products/${product.id}`)
        .expect(409)
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
      const product = await fixtures.createProduct({
        name: "Test Product",
        isAvailable: true,
      });

      await request(app.getHttpServer())
        .patch(`/api/products/${product.id}`)
        .send({ isAvailable: false })
        .expect(200)
        .expect((res) => {
          expect(res.body.isAvailable).toBe(false);
        });

      // Verify it doesn't appear in available products
      return request(app.getHttpServer())
        .get("/api/products")
        .expect(200)
        .expect((res) => {
          const foundProduct = res.body.find((p) => p.id === product.id);
          expect(foundProduct).toBeUndefined();
        });
    });

    it("GET /?limit=3&offset=2 should paginate results", async () => {
      // Create 10 products
      await fixtures.createProducts(10);

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
          price: 12.999,
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
      const product = await fixtures.createProduct({
        name: "Original Name",
        description: "Original Description",
        category: "original-category",
        price: 10.99,
      });

      return request(app.getHttpServer())
        .patch(`/api/products/${product.id}`)
        .send({ description: "Updated description only" })
        .expect(200)
        .expect((res) => {
          expect(res.body.description).toBe("Updated description only");
          expect(res.body.name).toBe(product.name);
          expect(res.body.category).toBe(product.category);
        });
    });

    it("GET /:id should return 404 for soft-deleted products", async () => {
      const product = await fixtures.createProduct({
        name: "Product to be deleted",
      });

      // Soft delete the product
      await request(app.getHttpServer())
        .delete(`/api/products/${product.id}`)
        .expect(204);

      // Should return 404 when trying to access
      return request(app.getHttpServer())
        .get(`/api/products/${product.id}`)
        .expect(404);
    });

    it("should validate category enum values", async () => {
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

      await Promise.all(promises);
    });
  });
});
