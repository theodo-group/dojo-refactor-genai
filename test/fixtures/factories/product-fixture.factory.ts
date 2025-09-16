import { INestApplication } from '@nestjs/common';
import { Product } from '../../../src/entities/product.entity';
import { BaseFixtures } from '../base/base-fixtures';
import { FixtureBuilder } from '../base/fixture-builder.interface';

export interface ProductSpec {
  name: string;
  description: string;
  price: number;
  category: string;
}

export class ProductFixtureFactory extends BaseFixtures<Product> implements FixtureBuilder<Product> {
  private specs: ProductSpec[] = [];

  async init(_app: INestApplication): Promise<void> {
    // Base constructor already handles app initialization
  }

  /**
   * Add pizza products
   */
  addPizzas(): ProductFixtureFactory {
    this.specs.push(
      {
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato sauce and mozzarella',
        price: 12.99,
        category: 'pizza',
      },
      {
        name: 'Pepperoni Pizza',
        description: 'Pizza with tomato sauce, mozzarella, and pepperoni',
        price: 14.99,
        category: 'pizza',
      }
    );
    return this;
  }

  /**
   * Add salad products
   */
  addSalads(): ProductFixtureFactory {
    this.specs.push({
      name: 'Caesar Salad',
      description: 'Fresh salad with romaine lettuce, croutons, and Caesar dressing',
      price: 8.99,
      category: 'salad',
    });
    return this;
  }

  /**
   * Add appetizer products
   */
  addAppetizers(): ProductFixtureFactory {
    this.specs.push({
      name: 'Garlic Bread',
      description: 'Toasted bread with garlic butter',
      price: 4.99,
      category: 'appetizer',
    });
    return this;
  }

  /**
   * Add dessert products
   */
  addDesserts(): ProductFixtureFactory {
    this.specs.push({
      name: 'Tiramisu',
      description: 'Classic Italian dessert with coffee and mascarpone',
      price: 7.99,
      category: 'dessert',
    });
    return this;
  }

  /**
   * Add products by category
   */
  addProductsByCategory(category: string, count: number = 2): ProductFixtureFactory {
    const categoryProducts: Record<string, ProductSpec[]> = {
      pizza: [
        { name: 'Margherita Pizza', description: 'Classic pizza with tomato sauce and mozzarella', price: 12.99, category: 'pizza' },
        { name: 'Pepperoni Pizza', description: 'Pizza with tomato sauce, mozzarella, and pepperoni', price: 14.99, category: 'pizza' },
        { name: 'Hawaiian Pizza', description: 'Pizza with ham and pineapple', price: 15.99, category: 'pizza' },
      ],
      salad: [
        { name: 'Caesar Salad', description: 'Fresh salad with romaine lettuce, croutons, and Caesar dressing', price: 8.99, category: 'salad' },
        { name: 'Greek Salad', description: 'Salad with feta cheese, olives, and vegetables', price: 9.99, category: 'salad' },
      ],
      appetizer: [
        { name: 'Garlic Bread', description: 'Toasted bread with garlic butter', price: 4.99, category: 'appetizer' },
        { name: 'Mozzarella Sticks', description: 'Fried mozzarella with marinara sauce', price: 6.99, category: 'appetizer' },
      ],
      dessert: [
        { name: 'Tiramisu', description: 'Classic Italian dessert with coffee and mascarpone', price: 7.99, category: 'dessert' },
        { name: 'Cheesecake', description: 'New York style cheesecake', price: 8.99, category: 'dessert' },
      ]
    };

    const products = categoryProducts[category] || [];
    this.specs.push(...products.slice(0, count));
    return this;
  }

  /**
   * Add a complete menu with various categories
   */
  addCompleteMenu(): ProductFixtureFactory {
    return this.addPizzas().addSalads().addAppetizers().addDesserts();
  }

  /**
   * Add a custom product
   */
  addProduct(spec: ProductSpec): ProductFixtureFactory {
    this.specs.push(spec);
    return this;
  }

  /**
   * Add multiple custom products
   */
  addProducts(specs: ProductSpec[]): ProductFixtureFactory {
    this.specs.push(...specs);
    return this;
  }

  /**
   * Build all configured product fixtures
   */
  async build(): Promise<Product[]> {
    if (this.specs.length === 0) {
      // Default to a complete menu if none specified
      this.addCompleteMenu();
    }

    const products = this.specs.map(spec =>
      this.productRepository.create(spec)
    );

    this.data = await this.productRepository.save(products);
    return this.data;
  }

  /**
   * Get products by category
   */
  getProductsByCategory(category: string): Product[] {
    return this.data.filter(product => product.category === category);
  }

  /**
   * Get a product by name
   */
  getProductByName(name: string): Product | undefined {
    return this.data.find(product => product.name === name);
  }

  /**
   * Get products within price range
   */
  getProductsInPriceRange(min: number, max: number): Product[] {
    return this.data.filter(product => product.price >= min && product.price <= max);
  }

  /**
   * Clean up and reset specs
   */
  async cleanup(): Promise<void> {
    await super.cleanup();
    this.specs = [];
  }
}