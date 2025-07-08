import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "./../src/app.module";
import { GlobalFixtures } from "./fixtures/global-fixtures";
import { customerMocks } from "./fixtures/mocks/customer.mocks";
import { productMocks } from "./fixtures/mocks/product.mocks";

describe("AppController (e2e)", () => {
  let app: INestApplication;
  let fixtures: GlobalFixtures;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    app.setGlobalPrefix("api");
    await app.init();

    // Initialize fixtures
    fixtures = new GlobalFixtures(app);
    const customers = await fixtures.createCustomers(customerMocks);
    const products = await fixtures.createProducts(productMocks);
    await fixtures.load(customers, products);
  });

  afterAll(async () => {
    await fixtures.clear();
    await app.close();
  });

  it("/ (GET)", () => {
    return request(app.getHttpServer()).get("/").expect(404); // Root path is not defined
  });
});
