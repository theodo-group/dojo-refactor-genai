import { Product } from '../../src/entities/product.entity';

export class ProductBuilder {
  private product: Partial<Product>;

  constructor() {
    this.product = {
      id: 'product-1',
      name: 'Margherita Pizza',
      description: 'Classic pizza with tomato sauce and mozzarella',
      price: 12.99,
      isAvailable: true,
      category: 'pizza',
      orders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  withId(id: string): ProductBuilder {
    this.product.id = id;
    return this;
  }

  withName(name: string): ProductBuilder {
    this.product.name = name;
    return this;
  }

  withDescription(description: string): ProductBuilder {
    this.product.description = description;
    return this;
  }

  withPrice(price: number): ProductBuilder {
    this.product.price = price;
    return this;
  }

  withIsAvailable(isAvailable: boolean): ProductBuilder {
    this.product.isAvailable = isAvailable;
    return this;
  }

  withCategory(category: string): ProductBuilder {
    this.product.category = category;
    return this;
  }

  withOrders(orders: any[]): ProductBuilder {
    this.product.orders = orders;
    return this;
  }

  build(): Product {
    return this.product as Product;
  }
}
