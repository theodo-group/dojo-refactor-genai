import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { FixtureEngine, customer, product, order } from "../fixtures/fixture-engine";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order } from "../../src/entities/order.entity";

describe("OrderController (e2e)", () => {
  let app: INestApplication;
  let fixtures: FixtureEngine<{
    customers: {
      john: Customer;
      jane: Customer;
      bob: Customer;
    };
    products: {
      margherita: Product;
      pepperoni: Product;
      caesarSalad: Product;
      garlicBread: Product;
      tiramisu: Product;
    };
    orders: {
      johnOrder1: Order;
      johnOrder2: Order;
      johnOrder3: Order;
      johnOrder4: Order;
    };
  }>;

  beforeEach(async () => {
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

    fixtures = await FixtureEngine.create(app)
      .withCustomers({
        john: customer({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          address: '123 Main St'
        }),
        jane: customer({
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '987-654-3210',
          address: '456 Oak Ave'
        }),
        bob: customer({
          name: 'Bob Johnson',
          email: 'bob@example.com',
          phone: '555-555-5555',
          address: '789 Pine Rd'
        })
      })
      .withProducts({
        margherita: product({
          name: 'Margherita Pizza',
          description: 'Classic pizza with tomato sauce and mozzarella',
          price: 12.99,
          category: 'pizza'
        }),
        pepperoni: product({
          name: 'Pepperoni Pizza',
          description: 'Pizza with tomato sauce, mozzarella, and pepperoni',
          price: 14.99,
          category: 'pizza'
        }),
        caesarSalad: product({
          name: 'Caesar Salad',
          description: 'Fresh salad with romaine lettuce, croutons, and Caesar dressing',
          price: 8.99,
          category: 'salad'
        }),
        garlicBread: product({
          name: 'Garlic Bread',
          description: 'Toasted bread with garlic butter',
          price: 4.99,
          category: 'appetizer'
        }),
        tiramisu: product({
          name: 'Tiramisu',
          description: 'Classic Italian dessert with coffee and mascarpone',
          price: 7.99,
          category: 'dessert'
        })
      })
      .withOrders({
        johnOrder1: order('john', ['margherita', 'garlicBread'], {
          totalAmount: 17.98,
          status: OrderStatus.DELIVERED,
          notes: 'Extra cheese please',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        }),
        johnOrder2: order('john', ['pepperoni', 'caesarSalad', 'tiramisu'], {
          totalAmount: 31.97,
          status: OrderStatus.PREPARING,
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
        }),
        johnOrder3: order('john', ['margherita', 'caesarSalad'], {
          totalAmount: 21.98,
          status: OrderStatus.DELIVERED,
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
        }),
        johnOrder4: order('john', ['tiramisu'], {
          totalAmount: 7.99,
          status: OrderStatus.READY,
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
        })
      })
      .build();
  });

  afterEach(async () => {
    await fixtures.cleanup();
    await app.close();
  });

  describe("/api/orders", () => {
    it("GET / should return all orders", () => {
      const expectedOrdersCount = Object.keys(fixtures.orders).length;

      return request(app.getHttpServer())
        .get("/api/orders")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(expectedOrdersCount);

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
      const order = fixtures.orders.johnOrder1;

      return request(app.getHttpServer())
        .get(`/api/orders/${order.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(order.id);
          expect(res.body.status).toBe(order.status);
          expect(res.body.customer.id).toBe(order.customer.id);
          expect(res.body.notes).toBe('Extra cheese please');
          expect(Array.isArray(res.body.products)).toBe(true);
          expect(res.body.products).toHaveLength(2);
        });
    });

    it("GET /customer/:customerId should return orders for a customer", () => {
      const customer = fixtures.customers.john;

      return request(app.getHttpServer())
        .get(`/api/orders/customer/${customer.id}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(4); // John has 4 orders
          res.body.forEach((order) => {
            expect(order.customer.id).toBe(customer.id);
          });
        });
    });

    it("POST / should create a new order", () => {
      const customer = fixtures.customers.jane;
      const products = [fixtures.products.margherita, fixtures.products.caesarSalad];

      const createOrderDto: CreateOrderDto = {
        customerId: customer.id,
        productIds: products.map((p) => p.id),
        totalAmount: 21.98,
        notes: "Test order for Jane",
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
          expect(res.body.customer.name).toBe('Jane Smith');
          expect(res.body.products.length).toBe(products.length);
        });
    });

    it("PATCH /:id/status should update order status", () => {
      const order = fixtures.orders.johnOrder4; // This one has READY status
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
      const order = fixtures.orders.johnOrder1; // This one has DELIVERED status
      const newStatus = OrderStatus.PREPARING;

      return request(app.getHttpServer())
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: newStatus })
        .expect(400);
    });

    it("DELETE /:id should cancel an order", () => {
      const order = fixtures.orders.johnOrder2; // This one has PREPARING status

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

    it("should handle complex scenario with multiple customers and orders", () => {
      // Test accessing different customers and their data
      const john = fixtures.customers.john;
      const jane = fixtures.customers.jane;
      const bob = fixtures.customers.bob;

      expect(john.name).toBe('John Doe');
      expect(jane.email).toBe('jane@example.com');
      expect(bob.address).toBe('789 Pine Rd');

      // Test product access
      const pizza = fixtures.products.margherita;
      const dessert = fixtures.products.tiramisu;

      expect(pizza.price).toBe(12.99);
      expect(dessert.category).toBe('dessert');

      // Test order relationships
      const johnOrder = fixtures.orders.johnOrder1;
      expect(johnOrder.customer.id).toBe(john.id);
      expect(johnOrder.totalAmount).toBe(17.98);
    });
  });
});
