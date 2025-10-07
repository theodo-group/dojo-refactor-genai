import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../src/entities/product.entity';

export interface CreateProductOptions {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  isAvailable?: boolean;
}

export async function createProduct(
  app: INestApplication,
  options: CreateProductOptions = {}
): Promise<Product> {
  const productRepository: Repository<Product> = app.get(
    getRepositoryToken(Product)
  );

  const product = productRepository.create({
    name: options.name ?? `Product ${Date.now()}`,
    description: options.description ?? 'Test product description',
    price: options.price ?? 10.99,
    category: options.category ?? 'test',
    isAvailable: options.isAvailable ?? true,
  });

  return await productRepository.save(product);
}

export async function createProducts(
  app: INestApplication,
  count: number,
  baseOptions: CreateProductOptions = {}
): Promise<Product[]> {
  const products: Product[] = [];

  for (let i = 0; i < count; i++) {
    const product = await createProduct(app, {
      ...baseOptions,
      name: baseOptions.name ?? `Product ${i + 1}`,
      price: baseOptions.price ?? 10.0 + i,
    });
    products.push(product);
  }

  return products;
}
