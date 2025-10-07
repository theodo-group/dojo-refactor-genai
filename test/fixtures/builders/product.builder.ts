import { Repository } from 'typeorm';
import { Product } from '../../../src/entities/product.entity';

export class ProductBuilder {
  private productData: Partial<Product> = {
    name: 'Test Product',
    description: 'Test product description',
    price: 9.99,
    category: 'test',
  };

  withName(name: string): this {
    this.productData.name = name;
    return this;
  }

  withDescription(description: string): this {
    this.productData.description = description;
    return this;
  }

  withPrice(price: number): this {
    this.productData.price = price;
    return this;
  }

  withCategory(category: string): this {
    this.productData.category = category;
    return this;
  }

  build(): Product {
    const product = new Product();
    Object.assign(product, this.productData);
    return product;
  }

  async create(repository: Repository<Product>): Promise<Product> {
    const product = repository.create(this.productData);
    return await repository.save(product);
  }
}
