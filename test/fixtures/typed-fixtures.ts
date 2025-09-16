import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { Order, OrderStatus } from '../../src/entities/order.entity';

// Base data types for fixtures
export interface CustomerData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}

export interface ProductData {
  name: string;
  description?: string;
  price: number;
  category?: string;
  isAvailable?: boolean;
}

export interface OrderData {
  customer: string | Customer;
  products: (string | Product)[];
  status?: OrderStatus;
  totalAmount?: number;
  notes?: string;
}

// Entity reference types
export interface EntityRefs<
  TCustomers extends Record<string, CustomerData>,
  TProducts extends Record<string, ProductData>,
  TOrders extends Record<string, OrderData>
> {
  customers: { [K in keyof TCustomers]: Customer };
  products: { [K in keyof TProducts]: Product };
  orders: { [K in keyof TOrders]: Order };
}

// Context type - the result of creating fixtures
export interface Context<
  TCustomers extends Record<string, CustomerData>,
  TProducts extends Record<string, ProductData>,
  TOrders extends Record<string, OrderData>
> {
  customers: { [K in keyof TCustomers]: Customer & TCustomers[K] & { id: string } };
  products: { [K in keyof TProducts]: Product & TProducts[K] & { id: string } };
  orders: { [K in keyof TOrders]: Order & TOrders[K] & { id: string } };
}

// Helper type to extract context type from a fixture builder
export type ContextFromBuilder<T> = T extends FixtureBuilder<infer C, infer P, infer O>
  ? Context<C, P, O>
  : never;

// Builder function type
export type BuilderFunction<
  TCustomers extends Record<string, CustomerData>,
  TProducts extends Record<string, ProductData>,
  TOrders extends Record<string, OrderData>,
  TReturn extends Record<string, any>
> = (refs: EntityRefs<TCustomers, TProducts, TOrders>) => TReturn;

// Main fixture builder interface
export interface FixtureBuilder<
  TCustomers extends Record<string, CustomerData> = {},
  TProducts extends Record<string, ProductData> = {},
  TOrders extends Record<string, OrderData> = {}
> {
  withCustomers<TNewCustomers extends Record<string, CustomerData>>(
    fn: BuilderFunction<TCustomers, TProducts, TOrders, TNewCustomers>
  ): FixtureBuilder<TNewCustomers, TProducts, TOrders>;

  withProducts<TNewProducts extends Record<string, ProductData>>(
    fn: BuilderFunction<TCustomers, TProducts, TOrders, TNewProducts>
  ): FixtureBuilder<TCustomers, TNewProducts, TOrders>;

  withOrders<TNewOrders extends Record<string, OrderData>>(
    fn: BuilderFunction<TCustomers, TProducts, TOrders, TNewOrders>
  ): FixtureBuilder<TCustomers, TProducts, TNewOrders>;

  create(): Promise<Context<TCustomers, TProducts, TOrders>>;
  cleanup(): Promise<void>;
}

// Implementation class
export class TypedFixtureBuilder<
  TCustomers extends Record<string, CustomerData> = {},
  TProducts extends Record<string, ProductData> = {},
  TOrders extends Record<string, OrderData> = {}
> implements FixtureBuilder<TCustomers, TProducts, TOrders> {

  private app: INestApplication;
  private customerRepository: Repository<Customer>;
  private productRepository: Repository<Product>;
  private orderRepository: Repository<Order>;

  private customerBuilders: Array<BuilderFunction<any, any, any, any>> = [];
  private productBuilders: Array<BuilderFunction<any, any, any, any>> = [];
  private orderBuilders: Array<BuilderFunction<any, any, any, any>> = [];

  // Track created entities for cleanup
  private createdCustomers: Customer[] = [];
  private createdProducts: Product[] = [];
  private createdOrders: Order[] = [];

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  withCustomers<TNewCustomers extends Record<string, CustomerData>>(
    fn: BuilderFunction<TCustomers, TProducts, TOrders, TNewCustomers>
  ): FixtureBuilder<TNewCustomers, TProducts, TOrders> {
    const newBuilder = new TypedFixtureBuilder<TNewCustomers, TProducts, TOrders>(this.app);
    newBuilder.customerBuilders = [fn];
    newBuilder.productBuilders = [...this.productBuilders];
    newBuilder.orderBuilders = [...this.orderBuilders];
    return newBuilder;
  }

  withProducts<TNewProducts extends Record<string, ProductData>>(
    fn: BuilderFunction<TCustomers, TProducts, TOrders, TNewProducts>
  ): FixtureBuilder<TCustomers, TNewProducts, TOrders> {
    const newBuilder = new TypedFixtureBuilder<TCustomers, TNewProducts, TOrders>(this.app);
    newBuilder.customerBuilders = [...this.customerBuilders];
    newBuilder.productBuilders = [fn];
    newBuilder.orderBuilders = [...this.orderBuilders];
    return newBuilder;
  }

  withOrders<TNewOrders extends Record<string, OrderData>>(
    fn: BuilderFunction<TCustomers, TProducts, TOrders, TNewOrders>
  ): FixtureBuilder<TCustomers, TProducts, TNewOrders> {
    const newBuilder = new TypedFixtureBuilder<TCustomers, TProducts, TNewOrders>(this.app);
    newBuilder.customerBuilders = [...this.customerBuilders];
    newBuilder.productBuilders = [...this.productBuilders];
    newBuilder.orderBuilders = [fn];
    return newBuilder;
  }

  async create(): Promise<Context<TCustomers, TProducts, TOrders>> {
    // Clean up any previously created entities
    await this.cleanup();

    // Start with empty refs
    const refs: EntityRefs<any, any, any> = {
      customers: {},
      products: {},
      orders: {}
    };

    // Create customers
    let customers: any = {};
    if (this.customerBuilders.length > 0) {
      const customerSpecs = this.customerBuilders[this.customerBuilders.length - 1](refs);
      customers = await this.createCustomers(customerSpecs);
      refs.customers = customers;
    }

    // Create products
    let products: any = {};
    if (this.productBuilders.length > 0) {
      const productSpecs = this.productBuilders[this.productBuilders.length - 1](refs);
      products = await this.createProducts(productSpecs);
      refs.products = products;
    }

    // Create orders
    let orders: any = {};
    if (this.orderBuilders.length > 0) {
      const orderSpecs = this.orderBuilders[this.orderBuilders.length - 1](refs);
      orders = await this.createOrders(orderSpecs, customers, products);
      refs.orders = orders;
    }

    return { customers, products, orders } as Context<TCustomers, TProducts, TOrders>;
  }

  private async createCustomers(specs: Record<string, CustomerData>): Promise<Record<string, Customer>> {
    const result: Record<string, Customer> = {};

    for (const [key, data] of Object.entries(specs)) {
      const customer = this.customerRepository.create({
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        isActive: data.isActive ?? true,
      });

      const saved = await this.customerRepository.save(customer);
      this.createdCustomers.push(saved);
      result[key] = saved;
    }

    return result;
  }

  private async createProducts(specs: Record<string, ProductData>): Promise<Record<string, Product>> {
    const result: Record<string, Product> = {};

    for (const [key, data] of Object.entries(specs)) {
      const product = this.productRepository.create({
        name: data.name,
        description: data.description || '',
        price: data.price,
        category: data.category,
        isAvailable: data.isAvailable ?? true,
      });

      const saved = await this.productRepository.save(product);
      this.createdProducts.push(saved);
      result[key] = saved;
    }

    return result;
  }

  private async createOrders(
    specs: Record<string, OrderData>,
    customers: Record<string, Customer>,
    products: Record<string, Product>
  ): Promise<Record<string, Order>> {
    const result: Record<string, Order> = {};

    for (const [key, data] of Object.entries(specs)) {
      // Resolve customer reference
      let customer: Customer;
      if (typeof data.customer === 'string') {
        customer = customers[data.customer];
        if (!customer) {
          throw new Error(`Customer '${data.customer}' not found`);
        }
      } else {
        customer = data.customer;
      }

      // Resolve product references
      const orderProducts: Product[] = [];
      for (const productRef of data.products) {
        if (typeof productRef === 'string') {
          const product = products[productRef];
          if (!product) {
            throw new Error(`Product '${productRef}' not found`);
          }
          orderProducts.push(product);
        } else {
          orderProducts.push(productRef);
        }
      }

      // Calculate total if not provided
      const totalAmount = data.totalAmount ?? orderProducts.reduce((sum, p) => sum + Number(p.price), 0);

      const order = this.orderRepository.create({
        customer,
        products: orderProducts,
        status: data.status ?? OrderStatus.PENDING,
        totalAmount,
        notes: data.notes,
      });

      const saved = await this.orderRepository.save(order);
      this.createdOrders.push(saved);
      result[key] = saved;
    }

    return result;
  }

  async cleanup(): Promise<void> {
    // Use raw SQL to truncate tables in the correct order, similar to GlobalFixtures
    try {
      // Delete in the correct order to respect foreign key constraints
      await this.orderRepository.query('TRUNCATE TABLE order_products CASCADE');
      await this.orderRepository.query('TRUNCATE TABLE orders CASCADE');
      await this.productRepository.query('TRUNCATE TABLE products CASCADE');
      await this.customerRepository.query('TRUNCATE TABLE customers CASCADE');
    } catch (error) {
      // If truncate fails, try individual deletes
      console.warn('Truncate failed, falling back to individual deletes:', error);

      if (this.createdOrders.length > 0) {
        for (const order of this.createdOrders) {
          try {
            await this.orderRepository
              .createQueryBuilder()
              .relation(Order, "products")
              .of(order)
              .remove(order.products);
          } catch {}
        }
        await this.orderRepository.remove(this.createdOrders);
      }

      if (this.createdProducts.length > 0) {
        await this.productRepository.remove(this.createdProducts);
      }

      if (this.createdCustomers.length > 0) {
        await this.customerRepository.remove(this.createdCustomers);
      }
    }

    // Clear tracking arrays
    this.createdOrders = [];
    this.createdProducts = [];
    this.createdCustomers = [];
  }
}

// Factory function
export function fixtures(app?: INestApplication): FixtureBuilder {
  if (!app) {
    throw new Error('INestApplication is required for fixtures');
  }
  return new TypedFixtureBuilder(app);
}