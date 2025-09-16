import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { GlobalFixtures } from "../fixtures/global-fixtures";

// Le reste du test sera ajouté lors des étapes suivantes

describe("Orders", () => {
  let app: INestApplication;
  let fixtures: GlobalFixtures;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    fixtures = moduleFixture.get<GlobalFixtures>(GlobalFixtures);
  });

  it("should return all orders", async () => {
    // ARRANGE
    const orders = await fixtures.createOrdersListFixture();

    // ACT
    return request(app.getHttpServer())
      .get("/api/orders")
      .expect(200)
      .expect((res) => {
        // ASSERT
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(orders.length);
        res.body.forEach((order: any) => {
          expect(order.customer).toBeDefined();
          expect(order.products).toBeDefined();
          expect(Array.isArray(order.products)).toBe(true);
        });
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
