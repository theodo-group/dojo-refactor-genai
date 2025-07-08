import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "../../src/entities/product.entity";

export class ProductBuilder {
  private app: INestApplication;
  private productRepository: Repository<Product>;
  private productData: Partial<Product> = {};

  constructor(app: INestApplication) {
    this.app = app;
    this.productRepository = app.get(getRepositoryToken(Product));
    this.setDefaults();
  }

  private setDefaults(): this {
    this.productData = {
      name: "Test Product",
      description: "A test product description",
      price: 9.99,
      category: "test",
      isAvailable: true,
    };
    return this;
  }

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

  unavailable(): this {
    this.productData.isAvailable = false;
    return this;
  }

  async build(): Promise<Product> {
    const product = this.productRepository.create(this.productData);
    return await this.productRepository.save(product);
  }

  async buildMany(count: number): Promise<Product[]> {
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
      // Reset defaults and add unique identifier for each product
      this.setDefaults();
      this.productData.name = `${this.productData.name} ${i + 1}`;
      products.push(await this.build());
    }
    return products;
  }

  // Predefined product types for common scenarios
  static margheritaPizza(app: INestApplication): ProductBuilder {
    return new ProductBuilder(app)
      .withName("Margherita Pizza")
      .withDescription("Classic pizza with tomato sauce and mozzarella")
      .withPrice(12.99)
      .withCategory("pizza");
  }

  static pepperoniPizza(app: INestApplication): ProductBuilder {
    return new ProductBuilder(app)
      .withName("Pepperoni Pizza")
      .withDescription("Pizza with tomato sauce, mozzarella, and pepperoni")
      .withPrice(14.99)
      .withCategory("pizza");
  }

  static caesarSalad(app: INestApplication): ProductBuilder {
    return new ProductBuilder(app)
      .withName("Caesar Salad")
      .withDescription("Fresh salad with romaine lettuce, croutons, and Caesar dressing")
      .withPrice(8.99)
      .withCategory("salad");
  }

  static garlicBread(app: INestApplication): ProductBuilder {
    return new ProductBuilder(app)
      .withName("Garlic Bread")
      .withDescription("Toasted bread with garlic butter")
      .withPrice(4.99)
      .withCategory("appetizer");
  }

  static tiramisu(app: INestApplication): ProductBuilder {
    return new ProductBuilder(app)
      .withName("Tiramisu")
      .withDescription("Classic Italian dessert with coffee and mascarpone")
      .withPrice(7.99)
      .withCategory("dessert");
  }

  static unavailableProduct(app: INestApplication): ProductBuilder {
    return new ProductBuilder(app)
      .withName("Seasonal Special")
      .withDescription("Limited time offer - currently unavailable")
      .withPrice(15.99)
      .withCategory("special")
      .unavailable();
  }
}
