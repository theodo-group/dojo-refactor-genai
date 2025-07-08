import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { DatabaseTestUtils } from "./database-test.utils";
import { CustomerBuilder } from "../builders/customer.builder";
import { ProductBuilder } from "../builders/product.builder";
import { OrderBuilder } from "../builders/order.builder";

export class TestContext {
  public app: INestApplication;
  public dbUtils: DatabaseTestUtils;
  private moduleFixture: TestingModule;

  /**
   * Initialize the test context with NestJS application
   */
  async initialize(): Promise<void> {
    this.moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = this.moduleFixture.createNestApplication();
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    this.app.setGlobalPrefix("api");
    await this.app.init();

    this.dbUtils = new DatabaseTestUtils(this.app);
  }

  /**
   * Clean up resources and close the application
   */
  async cleanup(): Promise<void> {
    if (this.dbUtils) {
      await this.dbUtils.cleanDatabase();
    }
    if (this.app) {
      await this.app.close();
    }
  }

  /**
   * Clean database between tests
   */
  async cleanDatabase(): Promise<void> {
    await this.dbUtils.cleanDatabase();
  }

  /**
   * Get HTTP server for supertest requests
   */
  getHttpServer() {
    return this.app.getHttpServer();
  }

  // Builder factory methods for easy access
  customerBuilder(): CustomerBuilder {
    return new CustomerBuilder(this.app);
  }

  productBuilder(): ProductBuilder {
    return new ProductBuilder(this.app);
  }

  orderBuilder(): OrderBuilder {
    return new OrderBuilder(this.app);
  }

  // Predefined builders for common scenarios
  johnDoe(): CustomerBuilder {
    return CustomerBuilder.johnDoe(this.app);
  }

  janeSmith(): CustomerBuilder {
    return CustomerBuilder.janeSmith(this.app);
  }

  vipCustomer(): CustomerBuilder {
    return CustomerBuilder.vipCustomer(this.app);
  }

  margheritaPizza(): ProductBuilder {
    return ProductBuilder.margheritaPizza(this.app);
  }

  pepperoniPizza(): ProductBuilder {
    return ProductBuilder.pepperoniPizza(this.app);
  }

  caesarSalad(): ProductBuilder {
    return ProductBuilder.caesarSalad(this.app);
  }

  garlicBread(): ProductBuilder {
    return ProductBuilder.garlicBread(this.app);
  }

  tiramisu(): ProductBuilder {
    return ProductBuilder.tiramisu(this.app);
  }

  unavailableProduct(): ProductBuilder {
    return ProductBuilder.unavailableProduct(this.app);
  }
}

/**
 * Helper function to create and initialize a test context
 * Use this in your test files' beforeAll hook
 */
export async function createTestContext(): Promise<TestContext> {
  const context = new TestContext();
  await context.initialize();
  return context;
}

/**
 * Helper function for common test setup pattern
 * Returns a context that's ready to use with clean database
 */
export async function setupTestContext(): Promise<TestContext> {
  const context = await createTestContext();
  await context.cleanDatabase();
  return context;
}
