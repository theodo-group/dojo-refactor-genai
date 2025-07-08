import { Product } from '../../src/entities/product.entity';

export const createProduct = (partialProduct: Partial<Product> = {}): Partial<Product> => ({
  name: 'Test Product',
  description: 'This is a test product description',
  price: 9.99,
  category: 'test',
  isAvailable: true,
  ...partialProduct
});
