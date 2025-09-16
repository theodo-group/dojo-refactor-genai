import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "../../../src/entities/product.entity";
import { FixtureBuilder } from "../base/fixture-builder.interface";

export interface ProductOptions {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  isAvailable?: boolean;
}

export class ProductFixtureFactory implements FixtureBuilder<Product> {
  private repository: Repository<Product>;
  private createdProducts: Product[] = [];

  constructor(app: INestApplication) {
    this.repository = app.get(getRepositoryToken(Product));
  }

  async build(overrides: ProductOptions = {}): Promise<Product> {
    const productData = {
      name: overrides.name || `Test Product ${Date.now()}`,
      description: overrides.description || "A test product",
      price: overrides.price ?? 9.99,
      category: overrides.category || "test",
      isAvailable: overrides.isAvailable ?? true,
    };

    const product = this.repository.create(productData);
    const savedProduct = await this.repository.save(product);
    this.createdProducts.push(savedProduct);
    return savedProduct;
  }

  async buildMany(count: number, overrides: ProductOptions = {}): Promise<Product[]> {
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
      const product = await this.build({
        ...overrides,
        name: overrides.name ? `${overrides.name} ${i + 1}` : undefined,
      });
      products.push(product);
    }
    return products;
  }

  async createPizza(overrides: ProductOptions = {}): Promise<Product> {
    return this.build({
      name: "Test Pizza",
      description: "Delicious test pizza",
      price: 12.99,
      category: "pizza",
      ...overrides,
    });
  }

  async createMargheritaPizza(overrides: ProductOptions = {}): Promise<Product> {
    return this.build({
      name: "Margherita Pizza",
      description: "Classic pizza with tomato sauce and mozzarella",
      price: 12.99,
      category: "pizza",
      ...overrides,
    });
  }

  async createPepperoniPizza(overrides: ProductOptions = {}): Promise<Product> {
    return this.build({
      name: "Pepperoni Pizza",
      description: "Pizza with tomato sauce, mozzarella, and pepperoni",
      price: 14.99,
      category: "pizza",
      ...overrides,
    });
  }

  async createSalad(overrides: ProductOptions = {}): Promise<Product> {
    return this.build({
      name: "Test Salad",
      description: "Fresh test salad",
      price: 8.99,
      category: "salad",
      ...overrides,
    });
  }

  async createCaesarSalad(overrides: ProductOptions = {}): Promise<Product> {
    return this.build({
      name: "Caesar Salad",
      description: "Fresh salad with romaine lettuce, croutons, and Caesar dressing",
      price: 8.99,
      category: "salad",
      ...overrides,
    });
  }

  async createAppetizer(overrides: ProductOptions = {}): Promise<Product> {
    return this.build({
      name: "Test Appetizer",
      description: "Delicious test appetizer",
      price: 4.99,
      category: "appetizer",
      ...overrides,
    });
  }

  async createGarlicBread(overrides: ProductOptions = {}): Promise<Product> {
    return this.build({
      name: "Garlic Bread",
      description: "Toasted bread with garlic butter",
      price: 4.99,
      category: "appetizer",
      ...overrides,
    });
  }

  async createDessert(overrides: ProductOptions = {}): Promise<Product> {
    return this.build({
      name: "Test Dessert",
      description: "Sweet test dessert",
      price: 7.99,
      category: "dessert",
      ...overrides,
    });
  }

  async createTiramisu(overrides: ProductOptions = {}): Promise<Product> {
    return this.build({
      name: "Tiramisu",
      description: "Classic Italian dessert with coffee and mascarpone",
      price: 7.99,
      category: "dessert",
      ...overrides,
    });
  }

  async createUnavailableProduct(overrides: ProductOptions = {}): Promise<Product> {
    return this.build({
      name: "Unavailable Product",
      description: "Currently unavailable product",
      price: 15.99,
      category: "special",
      isAvailable: false,
      ...overrides,
    });
  }

  async createProductsForDeletion(count: number = 3): Promise<Product[]> {
    return this.buildMany(count, {
      name: "Deletable Product",
      description: "Product that can be safely deleted",
      category: "test",
    });
  }

  async createProductsForUpdates(count: number = 3): Promise<Product[]> {
    const baseProducts = [
      {
        name: "Update Test Pizza",
        description: "Pizza used for testing partial updates",
        price: 13.99,
        category: "pizza",
      },
      {
        name: "Category Change Test",
        description: "Product used for testing category changes",
        price: 10.99,
        category: "original-category",
      },
      {
        name: "Price Validation Test",
        description: "Product used for price validation testing",
        price: 5.99,
        category: "validation",
      },
    ];

    const products: Product[] = [];
    for (let i = 0; i < count && i < baseProducts.length; i++) {
      products.push(await this.build(baseProducts[i]));
    }

    // Fill remaining with generic update test products if count > baseProducts.length
    for (let i = baseProducts.length; i < count; i++) {
      products.push(await this.build({
        name: `Update Test Product ${i + 1}`,
        description: `Product ${i + 1} for update testing`,
        category: "test",
      }));
    }

    return products;
  }

  async reset(): Promise<void> {
    this.createdProducts = [];
  }

  getCreatedProducts(): Product[] {
    return [...this.createdProducts];
  }
}