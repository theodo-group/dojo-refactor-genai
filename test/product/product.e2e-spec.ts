import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { DataSource, Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AppModule } from "../../src/app.module";
import { TestDataBuilder } from "../helpers/test-data-builder";
import { TestCleanup } from "../helpers/test-cleanup";
import { createProductDto } from "../factories/product.factory";
import { createCustomerDto } from "../factories/customer.factory";
import { createOrderDto } from "../factories/order.factory";
import { CreateProductDto } from "../../src/product/dto/create-product.dto";
import { UpdateProductDto } from "../../src/product/dto/update-product.dto";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

describe("ProductController (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let cleanup: TestCleanup;
  let dataBuilder: TestDataBuilder;
  let productRepository: Repository<Product>;
  let orderRepository: Repository<Order>;

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

    dataSource = moduleFixture.get<DataSource>(DataSource);
    cleanup = new TestCleanup(dataSource);
    dataBuilder = new TestDataBuilder(app);
    productRepository = moduleFixture.get<Repository<Product>>(getRepositoryToken(Product));
    orderRepository = moduleFixture.get<Repository<Order>>(getRepositoryToken(Order));
  });

  beforeEach(async () => {
    await cleanup.clearDatabase();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("/api/products", () => {
    it("GET / should return all available products", async () => {
      await dataBuilder.createProducts([
        createProductDto({ name: "Margherita Pizza", category: "pizza" }),
        createProductDto({ name: "Caesar Salad", category: "salad" }),
        createProductDto({ name: "Pepperoni Pizza", category: "pizza" }),
        createProductDto({ name: "Garlic Bread", category: "appetizer" }),
        createProductDto({ name: "Tiramisu", category: "dessert" }),
      ]);

      return request(app.getHttpServer())
        .get("/api/products")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(5);

          const productNames = res.body.map((product) => product.name);
          expect(productNames).toContain("Margherita Pizza");
          expect(productNames).toContain("Caesar Salad");
        });
    });

    it("GET /?category=pizza should filter products by category", async () => {
      await dataBuilder.createProducts([
        createProductDto({ name: "Margherita Pizza", category: "pizza" }),
        createProductDto({ name: "Pepperoni Pizza", category: "pizza" }),
        createProductDto({ name: "Caesar Salad", category: "salad" }),
        createProductDto({ name: "Tiramisu", category: "dessert" }),
      ]);

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
      const product = await dataBuilder.createProduct(
        createProductDto({ name: "Test Product", price: 12.99 })
      );

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
      const createDto: CreateProductDto = {
        name: "Test Product",
        description: "This is a test product",
        price: 9.99,
        category: "test",
      };

      return request(app.getHttpServer())
        .post("/api/products")
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe(createDto.name);
          expect(res.body.description).toBe(createDto.description);
          expect(parseFloat(res.body.price)).toBe(createDto.price);
          expect(res.body.category).toBe(createDto.category);
          expect(res.body.isAvailable).toBe(true);
        });
    });

    it("PATCH /:id should update a product", async () => {
      const product = await dataBuilder.createProduct(
        createProductDto({ name: "Original Name", description: "Original description", price: 10.99 })
      );

      const updateDto: UpdateProductDto = {
        name: "Updated Product Name",
        price: 19.99,
      };

      return request(app.getHttpServer())
        .patch(`/api/products/${product.id}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(product.id);
          expect(res.body.name).toBe(updateDto.name);
          expect(parseFloat(res.body.price)).toBe(updateDto.price);
          expect(res.body.description).toBe(product.description);
        });
    });

    it("DELETE /:id should soft delete a product", async () => {
      const product = await dataBuilder.createProduct(createProductDto());

      return request(app.getHttpServer())
        .delete(`/api/products/${product.id}`)
        .expect(204)
        .then(() => {
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
      await dataBuilder.createProducts([
        createProductDto({ name: "Available Product" }),
        createProductDto({ name: "Another Available" }),
      ]);

      const unavailableProduct = productRepository.create({
        name: "Seasonal Special",
        description: "Limited time offer - currently unavailable",
        price: 15.99,
        category: "special",
        isAvailable: false,
      });
      await productRepository.save(unavailableProduct);

      return request(app.getHttpServer())
        .get("/api/products?available=false")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);

          res.body.forEach((product) => {
            expect(product.isAvailable).toBe(false);
          });

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
      await dataBuilder.createProducts([
        createProductDto({ price: 15.99 }),
        createProductDto({ price: 8.99 }),
        createProductDto({ price: 22.50 }),
        createProductDto({ price: 10.00 }),
      ]);

      return request(app.getHttpServer())
        .get("/api/products?sort=price_asc")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(1);

          for (let i = 1; i < res.body.length; i++) {
            const currentPrice = parseFloat(res.body[i].price);
            const previousPrice = parseFloat(res.body[i - 1].price);
            expect(currentPrice).toBeGreaterThanOrEqual(previousPrice);
          }
        });
    });

    it("GET /?sort=price_desc should return products sorted by price descending", async () => {
      await dataBuilder.createProducts([
        createProductDto({ price: 15.99 }),
        createProductDto({ price: 8.99 }),
        createProductDto({ price: 22.50 }),
        createProductDto({ price: 10.00 }),
      ]);

      return request(app.getHttpServer())
        .get("/api/products?sort=price_desc")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(1);

          for (let i = 1; i < res.body.length; i++) {
            const currentPrice = parseFloat(res.body[i].price);
            const previousPrice = parseFloat(res.body[i - 1].price);
            expect(currentPrice).toBeLessThanOrEqual(previousPrice);
          }
        });
    });

    it("GET /?price_min=10&price_max=15 should filter products by price range", async () => {
      await dataBuilder.createProducts([
        createProductDto({ price: 8.99 }),
        createProductDto({ price: 12.50 }),
        createProductDto({ price: 14.99 }),
        createProductDto({ price: 18.00 }),
        createProductDto({ price: 11.25 }),
      ]);

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
      const product = await dataBuilder.createProduct(createProductDto());

      const invalidUpdates = [
        { price: -10 },
        { price: 0 },
        { price: "not-a-number" },
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
      const product = await dataBuilder.createProduct(
        createProductDto({ name: "Test Product", category: "original" })
      );

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
      await dataBuilder.createProducts([
        createProductDto({ name: "Margherita Pizza" }),
        createProductDto({ name: "Pepperoni Pizza" }),
        createProductDto({ name: "Hawaiian Pizza" }),
        createProductDto({ name: "Caesar Salad" }),
        createProductDto({ name: "Garlic Bread" }),
      ]);

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
      const customer = await dataBuilder.createCustomer(createCustomerDto());
      const product = await dataBuilder.createProduct(
        createProductDto({ name: "Pepperoni Pizza" })
      );

      const order = orderRepository.create({
        customerId: customer.id,
        products: [product],
        totalAmount: 14.99,
        status: OrderStatus.PREPARING,
        notes: "Test order",
      });
      await orderRepository.save(order);

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
      const product = await dataBuilder.createProduct(createProductDto());

      return request(app.getHttpServer())
        .patch(`/api/products/${product.id}`)
        .send({ isAvailable: false })
        .expect(200)
        .expect((res) => {
          expect(res.body.isAvailable).toBe(false);
        })
        .then(() => {
          return request(app.getHttpServer())
            .get("/api/products")
            .expect(200)
            .expect((res) => {
              const foundProduct = res.body.find((p) => p.id === product.id);
              expect(foundProduct).toBeUndefined();
            });
        });
    });

    it("GET /?limit=3&offset=2 should paginate results", async () => {
      await dataBuilder.createProducts([
        createProductDto(),
        createProductDto(),
        createProductDto(),
        createProductDto(),
        createProductDto(),
        createProductDto(),
      ]);

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
      const product = await dataBuilder.createProduct(
        createProductDto({
          name: "Original Name",
          category: "original-category",
          description: "Original description"
        })
      );
      const originalName = product.name;
      const originalCategory = product.category;

      return request(app.getHttpServer())
        .patch(`/api/products/${product.id}`)
        .send({ description: "Updated description only" })
        .expect(200)
        .expect((res) => {
          expect(res.body.description).toBe("Updated description only");
          expect(res.body.name).toBe(originalName);
          expect(res.body.category).toBe(originalCategory);
        });
    });

    it("GET /:id should return 404 for soft-deleted products", async () => {
      const product = await dataBuilder.createProduct(createProductDto());

      await request(app.getHttpServer())
        .delete(`/api/products/${product.id}`)
        .expect(204);

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
