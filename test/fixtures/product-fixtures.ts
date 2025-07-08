import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "../../src/entities/product.entity";

export class ProductFixtures {
  private app: INestApplication;
  private productRepository: Repository<Product>;

  // Cached fixtures for reuse across tests
  private products: Product[] = [];

  constructor(app: INestApplication) {
    this.app = app;
    this.productRepository = app.get(getRepositoryToken(Product));
  }

  async load(): Promise<void> {
    // Clear existing data first
    await this.clear();

    // Create products
    this.products = await this.createProducts();
  }

  async clear(): Promise<void> {
    // Delete in the correct order to respect foreign key constraints
    await this.productRepository.query("TRUNCATE TABLE products CASCADE");

    // Reset cached data
    this.products = [];
  }

  getProducts(): Product[] {
    return this.products;
  }

  // Product creation
  private async createProducts(): Promise<Product[]> {
    const products = [
      this.productRepository.create({
        name: "Margherita Pizza",
        description: "Classic pizza with tomato sauce and mozzarella",
        price: 12.99,
        category: "pizza",
      }),
      this.productRepository.create({
        name: "Pepperoni Pizza",
        description: "Pizza with tomato sauce, mozzarella, and pepperoni",
        price: 14.99,
        category: "pizza",
      }),
      this.productRepository.create({
        name: "Caesar Salad",
        description:
          "Fresh salad with romaine lettuce, croutons, and Caesar dressing",
        price: 8.99,
        category: "salad",
      }),
      this.productRepository.create({
        name: "Garlic Bread",
        description: "Toasted bread with garlic butter",
        price: 4.99,
        category: "appetizer",
      }),
      this.productRepository.create({
        name: "Tiramisu",
        description: "Classic Italian dessert with coffee and mascarpone",
        price: 7.99,
        category: "dessert",
      }),
    ];

    return await this.productRepository.save(products);
  }
}
