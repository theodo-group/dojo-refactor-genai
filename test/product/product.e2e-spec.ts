import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { GlobalFixtures } from '../fixtures/global-fixtures';
import { CreateProductDto } from '../../src/product/dto/create-product.dto';
import { UpdateProductDto } from '../../src/product/dto/update-product.dto';

describe('ProductController (e2e)', () => {
  let app: INestApplication;
  let fixtures: GlobalFixtures;

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

    fixtures = new GlobalFixtures(app);
  });

  afterAll(async () => {
    await fixtures.clear();
    await app.close();
  });

  describe('/api/products', () => {
    it('GET / should return all available products', async () => {
      // Given
      const basicProductsScenario = await fixtures.basicProductsScenario();
      
      return request(app.getHttpServer())
        .get('/api/products')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(basicProductsScenario.products.length);
          
          const productNames = res.body.map(product => product.name);
          expect(productNames).toContain('Margherita Pizza');
          expect(productNames).toContain('Caesar Salad');
        });
    });

    it('GET /?category=pizza should filter products by category', async () => {
      // Given
      const productCatalogScenario = await fixtures.productCatalogScenario();
      
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
      // Given
      const basicProductsScenario = await fixtures.basicProductsScenario();
      const product = basicProductsScenario.products[0];
      
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
      // Given
      await fixtures.basicProductsScenario();
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

    it('PATCH /:id should update a product', async () => {
      // Given
      const basicProductsScenario = await fixtures.basicProductsScenario();
      const product = basicProductsScenario.products[0];
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
          expect(res.body.description).toBe(product.description);
        });
    });

    it('DELETE /:id should soft delete a product', async () => {
      // Given
      const basicProductsScenario = await fixtures.basicProductsScenario();
      const product = basicProductsScenario.products[1];
      
      return request(app.getHttpServer())
        .delete(`/api/products/${product.id}`)
        .expect(204)
        .then(() => {
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
