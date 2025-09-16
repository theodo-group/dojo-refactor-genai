import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { ScenarioFixtures } from './fixtures/scenarios/scenario-fixtures';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let scenarioFixtures: ScenarioFixtures;

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
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    // Initialize minimal fixtures for basic app functionality
    scenarioFixtures = new ScenarioFixtures(app);
    await scenarioFixtures.createMinimalScenario();
  });

  afterAll(async () => {
    await scenarioFixtures.cleanup();
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(404); // Root path is not defined
  });
});