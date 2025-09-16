import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";
import { OrderStatus } from "../../src/entities/order.entity";
import { useScenario, resetDatabase } from "../fixtures/scenario/registry";
import "../fixtures/scenarios/small-catalog";

describe("OrderController (e2e)", () => {
  let app: INestApplication;

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
    await resetDatabase(app);
    await app.close();
  });

  describe("/api/orders", () => {
    it("GET / should return all orders", async () => {
      const s = await useScenario(app, "small-catalog")
        .patch((p) => {
          // Seed some initial orders to validate listing
          p.ensureOrder("o1", {
            customer: "alice",
            products: ["pizza"],
            totalAmount: 12.99,
            status: OrderStatus.DELIVERED,
          });
          p.ensureOrder("o2", {
            customer: "alice",
            products: ["cola", "salad"],
            totalAmount: 13.98,
            status: OrderStatus.PREPARING,
          });
        })
        .load();

      return request(app.getHttpServer())
        .get("/api/orders")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);

          res.body.forEach((order: any) => {
            expect(order.customer).toBeDefined();
            expect(order.products).toBeDefined();
            expect(Array.isArray(order.products)).toBe(true);
          });
        });
    });

    it("GET /?status=pending should filter orders by status", async () => {
      await useScenario(app, "small-catalog")
        .patch((p) => {
          p.ensureOrder("p1", {
            customer: "alice",
            products: ["pizza"],
            totalAmount: 10,
            status: OrderStatus.PENDING,
          });
          p.ensureOrder("d1", {
            customer: "bob",
            products: ["salad"],
            totalAmount: 8.99,
            status: OrderStatus.DELIVERED,
          });
        })
        .load();

      return request(app.getHttpServer())
        .get("/api/orders?status=pending")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((order: any) => {
            expect(order.status).toBe("pending");
          });
        });
    });

    it("GET /:id should return order by id", async () => {
      const s = await useScenario(app, "small-catalog")
        .patch((p) => {
          p.ensureOrder("target", {
            customer: "alice",
            products: ["pizza", "cola"],
            totalAmount: 17.98,
            status: OrderStatus.READY,
          });
        })
        .load();

      const orderId = s.id("target");

      return request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(orderId);
          expect(res.body.status).toBe(OrderStatus.READY);
          expect(res.body.customer.id).toBe(s.customer("alice").id);
          expect(Array.isArray(res.body.products)).toBe(true);
        });
    });

    it("GET /customer/:customerId should return orders for a customer", async () => {
      const s = await useScenario(app, "small-catalog")
        .patch((p) => {
          p.ensureOrder("ca1", {
            customer: "alice",
            products: ["pizza"],
            totalAmount: 12.99,
            status: OrderStatus.DELIVERED,
          });
          p.ensureOrder("ca2", {
            customer: "alice",
            products: ["cola"],
            totalAmount: 4.99,
            status: OrderStatus.PENDING,
          });
          p.ensureOrder("cb1", {
            customer: "bob",
            products: ["salad"],
            totalAmount: 8.99,
            status: OrderStatus.PREPARING,
          });
        })
        .load();

      const customer = s.customer("alice");

      return request(app.getHttpServer())
        .get(`/api/orders/customer/${customer.id}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((order: any) => {
            expect(order.customer.id).toBe(customer.id);
          });
        });
    });

    it("POST / should create a new order", async () => {
      const s = await useScenario(app, "small-catalog").load();

      const createOrderDto: CreateOrderDto = {
        customerId: s.customer("alice").id,
        productIds: s.ids(["pizza", "cola"]),
        totalAmount: 30.5,
        notes: "Test order notes",
      };

      return request(app.getHttpServer())
        .post("/api/orders")
        .send(createOrderDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.status).toBe(OrderStatus.PENDING);
          expect(parseFloat(res.body.totalAmount)).toBe(
            createOrderDto.totalAmount
          );
          expect(res.body.notes).toBe(createOrderDto.notes);
          expect(res.body.customer.id).toBe(s.customer("alice").id);
          expect(res.body.products.length).toBe(2);
        });
    });

    it("PATCH /:id/status should update order status", async () => {
      const s = await useScenario(app, "small-catalog")
        .patch((p) => {
          p.ensureOrder("readyOrder", {
            customer: "alice",
            products: ["pizza"],
            totalAmount: 12.99,
            status: OrderStatus.READY,
          });
        })
        .load();

      const orderId = s.order("readyOrder").id;
      const newStatus = OrderStatus.DELIVERED;

      return request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: newStatus })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(orderId);
          expect(res.body.status).toBe(newStatus);
        });
    });

    it("PATCH /:id/status should prevent invalid status transitions", async () => {
      const s = await useScenario(app, "small-catalog")
        .patch((p) => {
          p.ensureOrder("deliv", {
            customer: "alice",
            products: ["pizza"],
            totalAmount: 12.99,
            status: OrderStatus.DELIVERED,
          });
        })
        .load();

      const orderId = s.order("deliv").id;
      const newStatus = OrderStatus.PREPARING;

      return request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: newStatus })
        .expect(400);
    });

    it("DELETE /:id should cancel an order", async () => {
      const s = await useScenario(app, "small-catalog")
        .patch((p) => {
          p.ensureOrder("toCancel", {
            customer: "alice",
            products: ["pizza"],
            totalAmount: 12.99,
            status: OrderStatus.PENDING,
          });
        })
        .load();

      const orderId = s.order("toCancel").id;

      return request(app.getHttpServer())
        .delete(`/api/orders/${orderId}`)
        .expect(204)
        .then(() => {
          return request(app.getHttpServer())
            .get(`/api/orders/${orderId}`)
            .expect(200)
            .expect((res) => {
              expect(res.body.status).toBe(OrderStatus.CANCELLED);
            });
        });
    });
  });
});
