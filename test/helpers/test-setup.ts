import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { TestDataFactory } from "./test-data-factory";

export class TestSetup {
  static async createTestApp(): Promise<{
    app: INestApplication;
    dataFactory: TestDataFactory;
  }> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    app.setGlobalPrefix("api");
    await app.init();

    const dataFactory = new TestDataFactory(app);

    return { app, dataFactory };
  }

  static async cleanupTestApp(
    app: INestApplication,
    dataFactory: TestDataFactory
  ): Promise<void> {
    if (dataFactory) {
      await dataFactory.clearAllData();
    }
    if (app) {
      await app.close();
    }
  }
}
