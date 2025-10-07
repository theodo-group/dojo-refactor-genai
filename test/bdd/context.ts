import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order } from "../../src/entities/order.entity";

/**
 * Context class for managing test data and application state in BDD tests.
 * Follows the pattern described in e2e-tests-standard.md
 */
export class Context {
  app: INestApplication;
  data: Record<string, any> = {};
  response: request.Response | null = null;

  // Repository access
  customerRepository: Repository<Customer>;
  productRepository: Repository<Product>;
  orderRepository: Repository<Order>;

  /**
   * Creates and starts the NestJS application with proper configuration
   */
  async createAndStartApp(): Promise<void> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    this.app.setGlobalPrefix("api");
    await this.app.init();

    // Initialize repositories
    this.customerRepository = this.app.get(getRepositoryToken(Customer));
    this.productRepository = this.app.get(getRepositoryToken(Product));
    this.orderRepository = this.app.get(getRepositoryToken(Order));
  }

  /**
   * Cleans contextual data stored during test execution
   */
  cleanContextualData(): void {
    this.data = {};
    this.response = null;
  }

  /**
   * Stops the application and releases resources
   */
  async cleanAndStopApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }

  /**
   * Makes an HTTP request and stores the response
   */
  async makeRequest(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<request.Response> {
    let req = request(this.app.getHttpServer())[method.toLowerCase()](
      endpoint
    );

    if (body) {
      req = req.send(body);
    }

    this.response = await req;
    return this.response;
  }

  /**
   * Gets the response status code
   */
  getResponseStatusCode(): number {
    if (!this.response) {
      throw new Error("No response available");
    }
    return this.response.status;
  }

  /**
   * Gets the response body
   */
  getResponseBody(): any {
    if (!this.response) {
      throw new Error("No response available");
    }
    return this.response.body;
  }
}

/**
 * Helper function to clean all database tables
 */
export async function cleanAllTables(context: Context): Promise<void> {
  await context.orderRepository.query("TRUNCATE TABLE order_products CASCADE");
  await context.orderRepository.query("TRUNCATE TABLE orders CASCADE");
  await context.productRepository.query("TRUNCATE TABLE products CASCADE");
  await context.customerRepository.query("TRUNCATE TABLE customers CASCADE");
}
