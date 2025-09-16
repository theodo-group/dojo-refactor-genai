import { INestApplication } from "@nestjs/common";
import { BaseFixtures } from "./base-fixtures";
import { CustomerFixtureFactory } from "../factories/customer-fixture.factory";
import { ProductFixtureFactory } from "../factories/product-fixture.factory";
import { OrderFixtureFactory } from "../factories/order-fixture.factory";

export class TestDataManager extends BaseFixtures {
  public readonly customerFactory: CustomerFixtureFactory;
  public readonly productFactory: ProductFixtureFactory;
  public readonly orderFactory: OrderFixtureFactory;

  constructor(app: INestApplication) {
    super(app);
    this.customerFactory = new CustomerFixtureFactory(app);
    this.productFactory = new ProductFixtureFactory(app);
    this.orderFactory = new OrderFixtureFactory(app);
  }

  async setup(): Promise<void> {
    await this.clearAllData();
  }

  async teardown(): Promise<void> {
    await this.clearAllData();
    await this.customerFactory.reset();
    await this.productFactory.reset();
    await this.orderFactory.reset();
  }
}