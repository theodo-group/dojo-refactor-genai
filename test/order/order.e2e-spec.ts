import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { GlobalFixtures } from "../fixtures/global-fixtures";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";
import { fixtures, ContextFromBuilder } from "../fixtures/typed-fixtures";

describe("OrderController (e2e)", () => {
  let app: INestApplication;
  let globalFixtures: GlobalFixtures;

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
    globalFixtures = new GlobalFixtures(app);
    await globalFixtures.load();
  });

  afterAll(async () => {
    await globalFixtures.clear();
    await app.close();
  });

  describe("/api/orders", () => {
    const getBaseScenario = () => fixtures(app)
      .withCustomers(() => ({
        johnDoe: { name: 'John Doe', email: 'john@example.com', phone: '123-456-7890', address: '123 Main St' }
      }))
      .withProducts(() => ({
        margheritaPizza: { name: 'Margherita Pizza', price: 12.99, category: 'pizza', description: 'Classic pizza with tomato sauce and mozzarella' },
        garlicBread: { name: 'Garlic Bread', price: 4.99, category: 'appetizer', description: 'Toasted bread with garlic butter' }
      }))
      .withOrders(() => ({
        testOrder: { customer: 'johnDoe', products: ['margheritaPizza', 'garlicBread'], status: OrderStatus.PENDING, totalAmount: 17.98, notes: 'Test order' }
      }));

    let context: ContextFromBuilder<ReturnType<typeof getBaseScenario>>;
    let currentScenario: any;

    beforeEach(async () => {
      // Clear any existing data first
      await globalFixtures.clear();
      currentScenario = getBaseScenario();
      context = await currentScenario.create();
    })

    afterEach(async () => {
      if (currentScenario) {
        await currentScenario.cleanup();
      }
    })

    it("GET / should return all orders", async () => {
      return request(app.getHttpServer())
        .get("/api/orders")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);

          // Check if each order has customer and products
          res.body.forEach((order) => {
            expect(order.customer).toBeDefined();
            expect(order.products).toBeDefined();
            expect(Array.isArray(order.products)).toBe(true);
          });
        });
    });

    it("GET /?status=pending should filter orders by status", async () => {
      return request(app.getHttpServer())
        .get("/api/orders?status=pending")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
          expect(res.body[0].status).toBe('pending');
        });
    });

    it("GET /:id should return order by id", async () => {
      return request(app.getHttpServer())
        .get(`/api/orders/${context.orders.testOrder.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(context.orders.testOrder.id);
          expect(res.body.status).toBe('pending');
          expect(res.body.customer.id).toBe(context.customers.johnDoe.id);
          expect(Array.isArray(res.body.products)).toBe(true);
        });
    });

    it("GET /customer/:customerId should return orders for a customer", async () => {
      return request(app.getHttpServer())
        .get(`/api/orders/customer/${context.customers.johnDoe.id}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((order) => {
            expect(order.customer.id).toBe(context.customers.johnDoe.id);
          });
        });
    });

    it("POST / should create a new order", async () => {
      const emptyOrderScenario = getBaseScenario()
        .withOrders(() => ({}));
      const emptyOrderContext = await emptyOrderScenario.create();
      currentScenario = emptyOrderScenario;

      const createOrderDto: CreateOrderDto = {
        customerId: emptyOrderContext.customers.johnDoe.id,
        productIds: [emptyOrderContext.products.margheritaPizza.id, emptyOrderContext.products.garlicBread.id],
        totalAmount: 17.98,
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
          expect(res.body.customer.id).toBe(emptyOrderContext.customers.johnDoe.id);
          expect(res.body.products.length).toBe(2);
        });
    });

    it("PATCH /:id/status should update order status", async () => {
      const readyOrderScenario = getBaseScenario()
        .withOrders(() => ({
          readyOrder: { customer: 'johnDoe', products: ['margheritaPizza'], status: OrderStatus.READY, totalAmount: 12.99 }
        }));
      const readyOrderContext = await readyOrderScenario.create();
      currentScenario = readyOrderScenario;

      const newStatus = OrderStatus.DELIVERED;

      return request(app.getHttpServer())
        .patch(`/api/orders/${readyOrderContext.orders.readyOrder.id}/status`)
        .send({ status: newStatus })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(readyOrderContext.orders.readyOrder.id);
          expect(res.body.status).toBe(newStatus);
        });
    });

    it("PATCH /:id/status should prevent invalid status transitions", async () => {
      const deliveredOrderScenario = getBaseScenario()
        .withOrders(() => ({
          deliveredOrder: { customer: 'johnDoe', products: ['margheritaPizza'], status: OrderStatus.DELIVERED, totalAmount: 12.99 }
        }));
      const deliveredOrderContext = await deliveredOrderScenario.create();
      currentScenario = deliveredOrderScenario;

      const newStatus = OrderStatus.PREPARING;

      return request(app.getHttpServer())
        .patch(`/api/orders/${deliveredOrderContext.orders.deliveredOrder.id}/status`)
        .send({ status: newStatus })
        .expect(400);
    });

    it("DELETE /:id should cancel an order", async () => {
      const preparingOrderScenario = getBaseScenario()
        .withOrders(() => ({
          preparingOrder: { customer: 'johnDoe', products: ['margheritaPizza'], status: OrderStatus.PREPARING, totalAmount: 12.99 }
        }));
      const preparingOrderContext = await preparingOrderScenario.create();
      currentScenario = preparingOrderScenario;

      return request(app.getHttpServer())
        .delete(`/api/orders/${preparingOrderContext.orders.preparingOrder.id}`)
        .expect(204)
        .then(() => {
          // Verify order status is cancelled
          return request(app.getHttpServer())
            .get(`/api/orders/${preparingOrderContext.orders.preparingOrder.id}`)
            .expect(200)
            .expect((res) => {
              expect(res.body.status).toBe(OrderStatus.CANCELLED);
            });
        });
    });
  });
});
