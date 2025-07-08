import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ApiTestHelpers } from '../helpers/api-test-helpers';
import { TestDataFactory } from '../helpers/test-data-factory';
import { CleanupHelpers, TestDataTracker, createDataTracker } from '../helpers/cleanup-helpers';
import { CreateProductDto } from '../../src/product/dto/create-product.dto';
import { UpdateProductDto } from '../../src/product/dto/update-product.dto';
import { Product } from '../../src/entities/product.entity';

describe('ProductController (e2e)', () => {
  let app: INestApplication;
  let apiHelpers: ApiTestHelpers;
  let cleanupHelpers: CleanupHelpers;
  let testData: TestDataTracker;

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
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    // Initialize test helpers
    apiHelpers = new ApiTestHelpers(app);
    cleanupHelpers = new CleanupHelpers(apiHelpers);
  });

  beforeEach(async () => {
    // Reset test data tracker for each test
    testData = createDataTracker();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupHelpers.cleanupAll(testData);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/products', () => {
    it('GET / should return all available products', async () => {
      // Create test products
      const productData = TestDataFactory.getStandardProducts();
      for (const product of productData) {
        const createdProduct = await apiHelpers.createProduct(product);
        testData.products.push(createdProduct);
      }
      
      return request(app.getHttpServer())
        .get('/api/products')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(productData.length);
          
          // Check if our test products are included
          const productNames = res.body.map(product => product.name);
          expect(productNames).toContain('Margherita Pizza');
          expect(productNames).toContain('Caesar Salad');
        });
    });

    it('GET /?category=pizza should filter products by category', async () => {
      // Create test products including pizza category
      const productData = TestDataFactory.getStandardProducts();
      for (const product of productData) {
        const createdProduct = await apiHelpers.createProduct(product);
        testData.products.push(createdProduct);
      }
      
      return request(app.getHttpServer())
        .get('/api/products?category=pizza')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach(product => {
            expect(product.category).toBe('pizza');
          });
          
          const productNames = res.body.map(product => product.name);
          expect(productNames).toContain('Margherita Pizza');
          expect(productNames).toContain('Pepperoni Pizza');
        });
    });

    it('GET /:id should return product by id', async () => {
      // Create a test product
      const productData = TestDataFactory.getStandardProducts()[0];
      const product = await apiHelpers.createProduct(productData);
      testData.products.push(product);
      
      return request(app.getHttpServer())
        .get(`/api/products/${product.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(product.id);
          expect(res.body.name).toBe(product.name);
          expect(res.body.price).toBe(product.price.toString());
        });
    });

    it('POST / should create a new product', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Test Product',
        description: 'This is a test product',
        price: 9.99,
        category: 'test',
      };
      
      return request(app.getHttpServer())
        .post('/api/products')
        .send(createProductDto)
        .expect(201)
        .expect((res) => {
          // Track created product for cleanup
          testData.products.push(res.body);
          
          expect(res.body.name).toBe(createProductDto.name);
          expect(res.body.description).toBe(createProductDto.description);
          expect(parseFloat(res.body.price)).toBe(createProductDto.price);
          expect(res.body.category).toBe(createProductDto.category);
          expect(res.body.isAvailable).toBe(true);
        });
    });

    it('PATCH /:id should update a product', async () => {
      // Create a test product to update
      const productData = TestDataFactory.getStandardProducts()[0];
      const product = await apiHelpers.createProduct(productData);
      testData.products.push(product);
      
      const updateProductDto: UpdateProductDto = {
        name: 'Updated Product Name',
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

    it('DELETE /:id should soft delete a product', async () => {
      // Create test products
      const productData = TestDataFactory.getStandardProducts();
      for (const product of productData) {
        const createdProduct = await apiHelpers.createProduct(product);
        testData.products.push(createdProduct);
      }
      
      const productToDelete = testData.products[1];
      
      return request(app.getHttpServer())
        .delete(`/api/products/${productToDelete.id}`)
        .expect(204)
        .then(() => {
          // Verify product is no longer in the available list
          return request(app.getHttpServer())
            .get('/api/products')
            .expect(200)
            .expect((res) => {
              const foundProduct = res.body.find(p => p.id === productToDelete.id);
              expect(foundProduct).toBeUndefined();
            });
        });
    });
  });
});