import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Customer } from '../src/entities/customer.entity';
import { Product } from '../src/entities/product.entity';
import { Order } from '../src/entities/order.entity';

export class Context {
  public app: INestApplication;
  public data: Record<string, any> = {};
  public response: request.Response;

  private customerRepository: Repository<Customer>;
  private productRepository: Repository<Product>;
  private orderRepository: Repository<Order>;

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
    this.app.setGlobalPrefix('api');
    await this.app.init();

    // Get repositories
    this.customerRepository = this.app.get(getRepositoryToken(Customer));
    this.productRepository = this.app.get(getRepositoryToken(Product));
    this.orderRepository = this.app.get(getRepositoryToken(Order));
  }

  getCustomerRepository(): Repository<Customer> {
    return this.customerRepository;
  }

  getProductRepository(): Repository<Product> {
    return this.productRepository;
  }

  getOrderRepository(): Repository<Order> {
    return this.orderRepository;
  }

  cleanContextualData(): void {
    this.data = {};
    this.response = null;
  }

  async cleanAllTables(): Promise<void> {
    // Delete in the correct order to respect foreign key constraints
    await this.orderRepository.query('TRUNCATE TABLE order_products CASCADE');
    await this.orderRepository.query('TRUNCATE TABLE orders CASCADE');
    await this.productRepository.query('TRUNCATE TABLE products CASCADE');
    await this.customerRepository.query('TRUNCATE TABLE customers CASCADE');
  }

  async cleanAndStopApp(): Promise<void> {
    await this.cleanAllTables();
    await this.app.close();
  }
}
