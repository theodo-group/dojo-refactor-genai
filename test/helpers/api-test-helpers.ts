import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CreateCustomerDto } from '../../src/customer/dto/create-customer.dto';
import { CreateProductDto } from '../../src/product/dto/create-product.dto';
import { CreateOrderDto } from '../../src/order/dto/create-order.dto';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { Order } from '../../src/entities/order.entity';

export class ApiTestHelpers {
  constructor(private app: INestApplication) {}

  async createCustomer(customerData: CreateCustomerDto): Promise<Customer> {
    const response = await request(this.app.getHttpServer())
      .post('/api/customers')
      .send(customerData)
      .expect(201);
    
    return response.body;
  }

  async createProduct(productData: CreateProductDto): Promise<Product> {
    const response = await request(this.app.getHttpServer())
      .post('/api/products')
      .send(productData)
      .expect(201);
    
    return response.body;
  }

  async createOrder(orderData: CreateOrderDto): Promise<Order> {
    const response = await request(this.app.getHttpServer())
      .post('/api/orders')
      .send(orderData)
      .expect(201);
    
    return response.body;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await request(this.app.getHttpServer())
      .delete(`/api/customers/${customerId}`)
      .expect(204);
  }

  async deleteProduct(productId: string): Promise<void> {
    await request(this.app.getHttpServer())
      .delete(`/api/products/${productId}`)
      .expect(204);
  }

  async deleteOrder(orderId: string): Promise<void> {
    await request(this.app.getHttpServer())
      .delete(`/api/orders/${orderId}`)
      .expect(204);
  }

  async getCustomerOrders(customerId: string): Promise<Order[]> {
    const response = await request(this.app.getHttpServer())
      .get(`/api/orders/customer/${customerId}`)
      .expect(200);
    
    return response.body;
  }

  async getCustomer(customerId: string): Promise<Customer> {
    const response = await request(this.app.getHttpServer())
      .get(`/api/customers/${customerId}`)
      .expect(200);
    
    return response.body;
  }

  async getProduct(productId: string): Promise<Product> {
    const response = await request(this.app.getHttpServer())
      .get(`/api/products/${productId}`)
      .expect(200);
    
    return response.body;
  }

  async getOrder(orderId: string): Promise<Order> {
    const response = await request(this.app.getHttpServer())
      .get(`/api/orders/${orderId}`)
      .expect(200);
    
    return response.body;
  }
}