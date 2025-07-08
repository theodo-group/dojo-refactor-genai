import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ProductFixtures, ProductTestScenario } from '../fixtures/product-fixtures';
import { CreateProductDto } from '../../src/product/dto/create-product.dto';
import { UpdateProductDto } from '../../src/product/dto/update-product.dto';

describe('ProductController (e2e)', () => {
  let app: INestApplication;
  let fixtures: ProductFixtures;
  let testData: ProductTestScenario;

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

    // Initialize product-specific fixtures
    fixtures = new ProductFixtures(app);
  });

  beforeEach(async () => {
    // Clean up and create fresh test data for each test
    await fixtures.cleanup();
    testData = await fixtures.createTestScenario();
  });

  afterAll(async () => {
    await fixtures.cleanup();
    await app.close();
  });

  describe('/api/products', () => {
    it('GET / should return all available products', () => {
      return request(app.getHttpServer())
        .get('/api/products')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(testData.products.length);
          
          // Check if products data is correct
          const productNames = res.body.map(product => product.name);
          expect(productNames).toContain('Product Test Pizza');
          expect(productNames).toContain('Product Test Salad');
        });
    });

    it('GET /?category=pizza should filter products by category', () => {
      return request(app.getHttpServer())
        .get('/api/products?category=pizza')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach(product => {
            expect(product.category).toBe('pizza');
          });
          
          const productNames = res.body.map(product => product.name);
          expect(productNames).toContain('Product Test Pizza');
        });
    });

    it('GET /:id should return product by id', () => {
      const product = testData.products[0];
      
      return request(app.getHttpServer())
        .get(`/api/products/${product.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(product.id);
          expect(res.body.name).toBe(product.name);
          expect(res.body.price).toBe(product.price.toString());
        });
    });

    it('POST / should create a new product', () => {
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
          expect(res.body.name).toBe(createProductDto.name);
          expect(res.body.description).toBe(createProductDto.description);
          expect(parseFloat(res.body.price)).toBe(createProductDto.price);
          expect(res.body.category).toBe(createProductDto.category);
          expect(res.body.isAvailable).toBe(true);
        });
    });

    it('PATCH /:id should update a product', () => {
      const product = testData.products[0];
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

    it('DELETE /:id should soft delete a product', () => {
      const product = testData.products[1];
      
      return request(app.getHttpServer())
        .delete(`/api/products/${product.id}`)
        .expect(204)
        .then(() => {
          // Verify product is no longer in the available list
          return request(app.getHttpServer())
            .get('/api/products')
            .expect(200)
            .expect((res) => {
              const foundProduct = res.body.find(p => p.id === product.id);
              expect(foundProduct).toBeUndefined();
            });
        });
    });
  });
});