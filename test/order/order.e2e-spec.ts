import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order } from "../../src/entities/order.entity";

// ==================== FIXTURE BUILDER ====================
class FixtureBuilder {
  private entities = new Map<string, any>();
  private createdEntities: { type: string; entity: any }[] = [];

  constructor(
    private customerRepo: Repository<Customer>,
    private productRepo: Repository<Product>,
    private orderRepo: Repository<Order>
  ) {}

  customer(name: string, overrides: Partial<Customer> = {}): this {
    if (this.entities.has(name)) {
      throw new Error(`Customer '${name}' already exists`);
    }

    const customer = {
      name: overrides.name ?? `Customer ${name}`,
      email: overrides.email ?? `${name.toLowerCase()}@test.com`,
      phone: overrides.phone ?? "555-0100",
      address: overrides.address ?? "123 Test St",
      isActive: overrides.isActive ?? true,
      ...overrides,
    };

    this.entities.set(name, { type: "customer", data: customer });
    return this;
  }

  product(name: string, overrides: Partial<Product> = {}): this {
    if (this.entities.has(name)) {
      throw new Error(`Product '${name}' already exists`);
    }

    const product = {
      name: overrides.name ?? `Product ${name}`,
      description: overrides.description ?? `Description for ${name}`,
      price: overrides.price ?? 9.99,
      category: overrides.category ?? "general",
      isAvailable: overrides.isAvailable ?? true,
      ...overrides,
    };

    this.entities.set(name, { type: "product", data: product });
    return this;
  }

  order(
    name: string,
    config: {
      customer: string;
      products: string[];
      status?: OrderStatus;
      notes?: string;
      totalAmount?: number;
      createdAt?: Date;
    }
  ): this {
    if (this.entities.has(name)) {
      throw new Error(`Order '${name}' already exists`);
    }

    if (!this.entities.has(config.customer)) {
      throw new Error(`Customer '${config.customer}' not found`);
    }

    for (const productName of config.products) {
      if (!this.entities.has(productName)) {
        throw new Error(`Product '${productName}' not found`);
      }
    }

    this.entities.set(name, {
      type: "order",
      data: {
        customerRef: config.customer,
        productRefs: config.products,
        status: config.status ?? OrderStatus.PENDING,
        notes: config.notes,
        totalAmount: config.totalAmount, // will auto-calculate if not provided
        createdAt: config.createdAt,
      },
    });
    return this;
  }

  async build(): Promise<TestContext> {
    const builtEntities = new Map<string, any>();

    // Create customers first
    for (const [name, { type, data }] of this.entities.entries()) {
      if (type === "customer") {
        const customer = this.customerRepo.create(data);
        const saved = await this.customerRepo.save(customer);
        builtEntities.set(name, saved);
        this.createdEntities.push({ type: "customer", entity: saved });
      }
    }

    // Create products second
    for (const [name, { type, data }] of this.entities.entries()) {
      if (type === "product") {
        const product = this.productRepo.create(data);
        const saved = await this.productRepo.save(product);
        builtEntities.set(name, saved);
        this.createdEntities.push({ type: "product", entity: saved });
      }
    }

    // Create orders last (with relationships)
    for (const [name, { type, data }] of this.entities.entries()) {
      if (type === "order") {
        const customer = builtEntities.get(data.customerRef);
        const products = data.productRefs.map((ref) => builtEntities.get(ref));

        // Auto-calculate totalAmount if not provided
        const totalAmount =
          data.totalAmount ??
          products.reduce((sum, product) => sum + parseFloat(product.price), 0);

        const orderData = {
          customer,
          products,
          status: data.status,
          notes: data.notes,
          totalAmount,
          createdAt: data.createdAt,
        };

        const order = this.orderRepo.create(orderData);
        const saved = await this.orderRepo.save(order);
        builtEntities.set(name, saved);
        this.createdEntities.push({ type: "order", entity: saved });
      }
    }

    return new TestContext(builtEntities, this.createdEntities, {
      customerRepo: this.customerRepo,
      productRepo: this.productRepo,
      orderRepo: this.orderRepo,
    });
  }
}

class TestContext {
  private dynamicEntities: { type: string; id: string }[] = [];

  constructor(
    private entities: Map<string, any>,
    private createdEntities: { type: string; entity: any }[],
    private repos: {
      customerRepo: Repository<Customer>;
      productRepo: Repository<Product>;
      orderRepo: Repository<Order>;
    }
  ) {}

  get<T>(name: string): T {
    const entity = this.entities.get(name);
    if (!entity) {
      throw new Error(`Entity '${name}' not found`);
    }
    return entity;
  }

  // Track entities created during tests (not by the builder)
  trackOrder(id: string): void {
    this.dynamicEntities.push({ type: "order", id });
  }

  trackCustomer(id: string): void {
    this.dynamicEntities.push({ type: "customer", id });
  }

  trackProduct(id: string): void {
    this.dynamicEntities.push({ type: "product", id });
  }

  async cleanup(): Promise<void> {
    try {
      // Clean up dynamically created entities first
      const dynamicOrders = this.dynamicEntities.filter(
        (e) => e.type === "order"
      );
      for (const { id } of dynamicOrders) {
        try {
          await this.repos.orderRepo.delete(id);
        } catch (error) {
          // Entity might already be deleted, ignore
        }
      }

      const dynamicProducts = this.dynamicEntities.filter(
        (e) => e.type === "product"
      );
      for (const { id } of dynamicProducts) {
        try {
          await this.repos.productRepo.delete(id);
        } catch (error) {
          // Entity might already be deleted, ignore
        }
      }

      const dynamicCustomers = this.dynamicEntities.filter(
        (e) => e.type === "customer"
      );
      for (const { id } of dynamicCustomers) {
        try {
          await this.repos.customerRepo.delete(id);
        } catch (error) {
          // Entity might already be deleted, ignore
        }
      }

      // Clean up builder-created entities
      const orders = this.createdEntities.filter((e) => e.type === "order");
      for (const { entity } of orders) {
        try {
          await this.repos.orderRepo.delete(entity.id);
        } catch (error) {
          // Entity might already be deleted, ignore
        }
      }

      const products = this.createdEntities.filter((e) => e.type === "product");
      for (const { entity } of products) {
        try {
          await this.repos.productRepo.delete(entity.id);
        } catch (error) {
          // Entity might already be deleted, ignore
        }
      }

      const customers = this.createdEntities.filter(
        (e) => e.type === "customer"
      );
      for (const { entity } of customers) {
        try {
          await this.repos.customerRepo.delete(entity.id);
        } catch (error) {
          // Entity might already be deleted, ignore
        }
      }
    } catch (error) {
      console.warn("Cleanup error:", error.message);
    }
  }
}

function fixture(app: INestApplication): FixtureBuilder {
  return new FixtureBuilder(
    app.get(getRepositoryToken(Customer)),
    app.get(getRepositoryToken(Product)),
    app.get(getRepositoryToken(Order))
  );
}

async function cleanDatabase(app: INestApplication): Promise<void> {
  const orderRepo = app.get(getRepositoryToken(Order));
  const productRepo = app.get(getRepositoryToken(Product));
  const customerRepo = app.get(getRepositoryToken(Customer));

  // Clean all tables
  await orderRepo.query("TRUNCATE TABLE order_products CASCADE");
  await orderRepo.query("TRUNCATE TABLE orders CASCADE");
  await productRepo.query("TRUNCATE TABLE products CASCADE");
  await customerRepo.query("TRUNCATE TABLE customers CASCADE");
}

// ==================== TESTS ====================

describe("OrderController (e2e)", () => {
  let app: INestApplication;
  let context: TestContext;

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
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean any existing test data before creating new fixtures
    await cleanDatabase(app);

    context = await fixture(app)
      .customer("john", { name: "John Doe", email: "john@test.com" })
      .customer("jane", { name: "Jane Smith", email: "jane@test.com" })
      .customer("bob", { name: "Bob Johnson", email: "bob@test.com" })
      .product("pizza", {
        name: "Margherita Pizza",
        price: 12.99,
        category: "pizza",
      })
      .product("pepperoni", {
        name: "Pepperoni Pizza",
        price: 14.99,
        category: "pizza",
      })
      .product("salad", {
        name: "Caesar Salad",
        price: 8.99,
        category: "salad",
      })
      .product("bread", {
        name: "Garlic Bread",
        price: 4.99,
        category: "appetizer",
      })
      .product("tiramisu", {
        name: "Tiramisu",
        price: 7.99,
        category: "dessert",
      })
      .order("order1", {
        customer: "john",
        products: ["pizza", "bread"],
        status: OrderStatus.DELIVERED,
        notes: "Extra cheese please",
      })
      .order("order2", {
        customer: "john",
        products: ["pepperoni", "salad", "tiramisu"],
        status: OrderStatus.PREPARING,
      })
      .order("order3", {
        customer: "john",
        products: ["pizza", "salad"],
        status: OrderStatus.READY,
      })
      .build();
  });

  afterEach(async () => {
    await context.cleanup();
  });

  describe("/api/orders", () => {
    it("GET / should return all orders", () => {
      return request(app.getHttpServer())
        .get("/api/orders")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(3); // We have 3 orders in our fixture

          // Check if each order has customer and products
          res.body.forEach((order) => {
            expect(order.customer).toBeDefined();
            expect(order.products).toBeDefined();
            expect(Array.isArray(order.products)).toBe(true);
          });
        });
    });

    it("GET /?status=pending should filter orders by status", () => {
      return request(app.getHttpServer())
        .get("/api/orders?status=pending")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((order) => {
            expect(order.status).toBe("pending");
          });
        });
    });

    it("GET /:id should return order by id", () => {
      const order = context.get<Order>("order1");

      return request(app.getHttpServer())
        .get(`/api/orders/${order.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(order.id);
          expect(res.body.status).toBe(order.status);
          expect(res.body.customer.id).toBe(order.customer.id);
          expect(Array.isArray(res.body.products)).toBe(true);
        });
    });

    it("GET /customer/:customerId should return orders for a customer", () => {
      const customer = context.get<Customer>("john");

      return request(app.getHttpServer())
        .get(`/api/orders/customer/${customer.id}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((order) => {
            expect(order.customer.id).toBe(customer.id);
          });
        });
    });

    it("POST / should create a new order", () => {
      const customer = context.get<Customer>("john");
      const pizza = context.get<Product>("pizza");
      const salad = context.get<Product>("salad");

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: [pizza.id, salad.id],
        totalAmount: 30.5,
        notes: "Test order notes",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(createOrderDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.status).toBe(OrderStatus.PENDING);
          expect(res.body.totalAmount).toBe(createOrderDto.totalAmount);
          expect(res.body.notes).toBe(createOrderDto.notes);
          expect(res.body.customer.id).toBe(customer.id);
          expect(res.body.products.length).toBe(2);

          // Track the created order for cleanup
          context.trackOrder(res.body.id);
        });
    });

    it("PATCH /:id/status should update order status", () => {
      const order = context.get<Order>("order3"); // READY status
      const newStatus = OrderStatus.DELIVERED;

      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: newStatus })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(order.id);
          expect(res.body.status).toBe(newStatus);
        });
    });

    it("PATCH /:id/status should prevent invalid status transitions", () => {
      const order = context.get<Order>("order1"); // DELIVERED status
      const newStatus = OrderStatus.PREPARING;

      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: newStatus })
        .expect(400);
    });

    // Example of how easy it is to create a custom test scenario
    it("should handle complex order scenarios", async () => {
      // Create a custom scenario with different data for this specific test
      const customContext = await fixture(app)
        .customer("vip", { name: "VIP Customer", email: "vip@premium.com" })
        .product("expensive", {
          name: "Truffle Pizza",
          price: 99.99,
          category: "premium",
        })
        .order("vip-order", {
          customer: "vip",
          products: ["expensive"],
          status: OrderStatus.PENDING,
        })
        .build();

      const vipOrder = customContext.get<Order>("vip-order");

      expect(vipOrder.totalAmount).toBe(99.99);
      expect(vipOrder.customer.name).toBe("VIP Customer");
      expect(vipOrder.products[0].name).toBe("Truffle Pizza");

      await customContext.cleanup();
    });

    it("DELETE /:id should cancel an order", () => {
      const order = context.get<Order>("order2"); // PREPARING status

      return request(app.getHttpServer())
        .delete(`/api/orders/${order.id}`)
        .expect(204)
        .then(() => {
          // Verify order status is cancelled
          return request(app.getHttpServer())
            .get(`/api/orders/${order.id}`)
            .expect(200)
            .expect((res) => {
              expect(res.body.status).toBe(OrderStatus.CANCELLED);
            });
        });
    });
  });
});
