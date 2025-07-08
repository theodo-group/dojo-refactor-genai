import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "../../src/entities/product.entity";

export class ProductFixtures {
  private app: INestApplication;
  private productRepository: Repository<Product>;
  private products: Product[] = [];

  constructor(app: INestApplication) {
    this.app = app;
    this.productRepository = app.get(getRepositoryToken(Product));
  }

  async createTestScenario() {
    // Clear existing data
    await this.cleanup();

    // Create products for testing
    this.products = await this.createProducts();

    return {
      products: this.products,
      availableProducts: this.products.filter(p => p.isAvailable),
      unavailableProducts: this.products.filter(p => !p.isAvailable),
      deletableProducts: this.products.slice(6, 9),
      updateTestProducts: this.products.slice(9, 12),
      pizzaProducts: this.products.filter(p => p.category === 'pizza'),
      testCategoryProducts: this.products.filter(p => p.category === 'test'),
    };
  }

  async cleanup(): Promise<void> {
    // Clear products table
    await this.productRepository.query("TRUNCATE TABLE products CASCADE");
    this.products = [];
  }

  private async createProducts(): Promise<Product[]> {
    const products = [
      // Core products for basic functionality
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
        description: "Fresh salad with romaine lettuce, croutons, and Caesar dressing",
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

      // Unavailable product for testing
      this.productRepository.create({
        name: "Seasonal Special",
        description: "Limited time offer - currently unavailable",
        price: 15.99,
        category: "special",
        isAvailable: false,
      }),

      // Products specifically for deletion tests
      this.productRepository.create({
        name: "Deletable Product 1",
        description: "Product that can be safely deleted - not in any orders",
        price: 9.99,
        category: "test",
      }),
      this.productRepository.create({
        name: "Deletable Product 2",
        description: "Another product that can be safely deleted",
        price: 11.99,
        category: "test",
      }),
      this.productRepository.create({
        name: "Soft Delete Test Product",
        description: "Product used for soft delete testing",
        price: 6.99,
        category: "test",
      }),

      // Products for update tests
      this.productRepository.create({
        name: "Update Test Pizza",
        description: "Pizza used for testing partial updates",
        price: 13.99,
        category: "pizza",
      }),
      this.productRepository.create({
        name: "Category Change Test",
        description: "Product used for testing category changes",
        price: 10.99,
        category: "original-category",
      }),
      this.productRepository.create({
        name: "Price Validation Test",
        description: "Product used for price validation testing",
        price: 5.99,
        category: "validation",
      }),
    ];

    return await this.productRepository.save(products);
  }
} 