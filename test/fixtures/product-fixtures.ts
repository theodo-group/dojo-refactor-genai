import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../src/entities/product.entity';

export interface ProductTestScenario {
  products: Product[];
}

export class ProductFixtures {
  private readonly app: INestApplication;
  private readonly productRepository: Repository<Product>;

  constructor(app: INestApplication) {
    this.app = app;
    this.productRepository = app.get(getRepositoryToken(Product));
  }

  async createTestScenario(): Promise<ProductTestScenario> {
    // Create products for product CRUD testing
    const products = await this.createProductTestData();

    return { products };
  }

  async cleanup(): Promise<void> {
    // Simple cleanup for product-only tests
    await this.productRepository.query('TRUNCATE TABLE products CASCADE');
  }

  private async createProductTestData(): Promise<Product[]> {
    const products = [
      this.productRepository.create({
        name: 'Product Test Pizza',
        description: 'Test pizza for product CRUD operations',
        price: 13.99,
        category: 'pizza',
      }),
      this.productRepository.create({
        name: 'Product Test Pasta',
        description: 'Test pasta for product CRUD operations',
        price: 11.99,
        category: 'pasta',
      }),
      this.productRepository.create({
        name: 'Product Test Salad',
        description: 'Test salad for product CRUD operations',
        price: 9.99,
        category: 'salad',
      }),
      this.productRepository.create({
        name: 'Product Test Drink',
        description: 'Test drink for product CRUD operations',
        price: 3.99,
        category: 'beverage',
      }),
      this.productRepository.create({
        name: 'Product Test Dessert',
        description: 'Test dessert for product CRUD operations',
        price: 5.99,
        category: 'dessert',
      }),
    ];
    
    return await this.productRepository.save(products);
  }
}
