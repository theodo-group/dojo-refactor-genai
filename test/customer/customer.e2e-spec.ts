import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ApiTestHelpers } from '../helpers/api-test-helpers';
import { TestDataFactory } from '../helpers/test-data-factory';
import { CleanupHelpers, createDataTracker, TestDataTracker } from '../helpers/cleanup-helpers';
import { CreateCustomerDto } from '../../src/customer/dto/create-customer.dto';
import { UpdateCustomerDto } from '../../src/customer/dto/update-customer.dto';
import { Customer } from '../../src/entities/customer.entity';

describe('CustomerController (e2e)', () => {
  let app: INestApplication;
  let apiHelpers: ApiTestHelpers;
  let cleanupHelpers: CleanupHelpers;
  let testData: TestDataTracker;
  let testCustomers: Customer[];

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

    // Initialize test helpers
    apiHelpers = new ApiTestHelpers(app);
    cleanupHelpers = new CleanupHelpers(apiHelpers);
  });

  beforeEach(async () => {
    testData = createDataTracker();
    // Create test customers for each test
    const customerDataArray = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        address: '123 Main St',
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '987-654-3210',
        address: '456 Oak Ave',
      },
      {
        name: 'Bob Johnson',
        email: 'bob@example.com',
        phone: '555-555-5555',
        address: '789 Pine Rd',
      },
    ];
    
    testCustomers = [];
    for (const customerData of customerDataArray) {
      const customer = await apiHelpers.createCustomer(customerData);
      testCustomers.push(customer);
      testData.customers.push(customer);
    }
  });

  afterEach(async () => {
    await cleanupHelpers.cleanupAll(testData);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/customers', () => {
    it('GET / should return all active customers', () => {
      return request(app.getHttpServer())
        .get('/api/customers')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(testCustomers.length);
          
          // Check if all expected customers are returned
          const emails = res.body.map(customer => customer.email);
          expect(emails).toContain('john@example.com');
          expect(emails).toContain('jane@example.com');
          expect(emails).toContain('bob@example.com');
        });
    });

    it('GET /:id should return customer by id', () => {
      const customer = testCustomers[0];
      
      return request(app.getHttpServer())
        .get(`/api/customers/${customer.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(customer.id);
          expect(res.body.name).toBe(customer.name);
          expect(res.body.email).toBe(customer.email);
        });
    });

    it('GET /:id should return 404 for non-existent customer', () => {
      return request(app.getHttpServer())
        .get('/api/customers/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('POST / should create a new customer', () => {
      const createCustomerDto: CreateCustomerDto = {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '111-222-3333',
        address: '321 Test St',
      };
      
      return request(app.getHttpServer())
        .post('/api/customers')
        .send(createCustomerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe(createCustomerDto.name);
          expect(res.body.email).toBe(createCustomerDto.email);
          expect(res.body.phone).toBe(createCustomerDto.phone);
          expect(res.body.address).toBe(createCustomerDto.address);
          expect(res.body.isActive).toBe(true);
          // Track the created customer for cleanup
          testData.customers.push(res.body);
        });
    });

    it('POST / should validate request body', () => {
      const invalidDto = {
        name: 'Test Customer',
        // Missing required email
      };
      
      return request(app.getHttpServer())
        .post('/api/customers')
        .send(invalidDto)
        .expect(400);
    });

    it('PATCH /:id should update a customer', () => {
      const customer = testCustomers[0];
      const updateCustomerDto: UpdateCustomerDto = {
        name: 'Updated Name',
        phone: 'updated-phone',
      };
      
      return request(app.getHttpServer())
        .patch(`/api/customers/${customer.id}`)
        .send(updateCustomerDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(customer.id);
          expect(res.body.name).toBe(updateCustomerDto.name);
          expect(res.body.phone).toBe(updateCustomerDto.phone);
          // Email should remain unchanged
          expect(res.body.email).toBe(customer.email);
        });
    });

    it('DELETE /:id should soft delete a customer', () => {
      const customer = testCustomers[1];
      
      return request(app.getHttpServer())
        .delete(`/api/customers/${customer.id}`)
        .expect(204)
        .then(() => {
          // Verify customer is no longer in the active list
          return request(app.getHttpServer())
            .get('/api/customers')
            .expect(200)
            .expect((res) => {
              const foundCustomer = res.body.find(c => c.id === customer.id);
              expect(foundCustomer).toBeUndefined();
            });
        });
    });
  });
});