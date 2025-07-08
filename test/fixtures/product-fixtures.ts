import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "../../src/entities/product.entity";

export interface ProductTestScenario {
  products: Product[];
  testProduct: Product;
  updateTestProduct: Product;
  deleteTestProduct: Product;
  unavailableProduct: Product;
}

export class ProductFixtures {
  private app: INestApplication;
  private productRepository: Repository<Product>;

  constructor(app: INestApplication) {
    this.app = app;
    this.productRepository = app.get(getRepositoryToken(Product));
  }

  async createTestScenario(): Promise<ProductTestScenario> {
    const products = [
      // Produit basique pour les tests CRUD
      this.productRepository.create({
        name: "Test Pizza",
        description: "Test pizza for product testing",
        price: 12.99,
        category: "pizza",
        isAvailable: true,
      }),

      // Produit pour les tests de mise à jour
      this.productRepository.create({
        name: "Update Test Product",
        description: "Product for update testing",
        price: 15.99,
        category: "test",
        isAvailable: true,
      }),

      // Produit pour les tests de suppression
      this.productRepository.create({
        name: "Delete Test Product",
        description: "Product for deletion testing",
        price: 8.99,
        category: "test",
        isAvailable: true,
      }),

      // Produit non disponible pour les tests
      this.productRepository.create({
        name: "Unavailable Test Product",
        description: "Product that is not available",
        price: 20.99,
        category: "special",
        isAvailable: false,
      }),
    ];

    const savedProducts = await this.productRepository.save(products);

    return {
      products: savedProducts,
      testProduct: savedProducts[0],
      updateTestProduct: savedProducts[1],
      deleteTestProduct: savedProducts[2],
      unavailableProduct: savedProducts[3],
    };
  }

  async cleanup(): Promise<void> {
    await this.productRepository.query("TRUNCATE TABLE products CASCADE");
  }
} 