import { INestApplication } from "@nestjs/common";
import { Customer } from "../../../src/entities/customer.entity";
import { Product } from "../../../src/entities/product.entity";
import { Order, OrderStatus } from "../../../src/entities/order.entity";

export type Alias = string;

export type EntityMap = {
  customers: Record<Alias, Customer>;
  products: Record<Alias, Product>;
  orders: Record<Alias, Order>;
};

export type AliasOrEntity<T> = Alias | T;

export interface ScenarioResult {
  handle(alias: Alias): Customer | Product | Order;
  handles(aliases: Alias[]): Array<Customer | Product | Order>;
  id(alias: Alias): string;
  ids(aliases: Alias[]): string[];
  customer(alias: Alias): Customer;
  product(alias: Alias): Product;
  order(alias: Alias): Order;
}

export interface PatchBuilder {
  ensureCustomer(alias: Alias, data: Partial<Customer>): PatchBuilder;
  ensureProduct(alias: Alias, data: Partial<Product>): PatchBuilder;
  ensureOrder(
    alias: Alias,
    data: {
      customer: AliasOrEntity<Customer>;
      products: Array<AliasOrEntity<Product>>;
      status?: OrderStatus;
      totalAmount?: number;
      notes?: string;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ): PatchBuilder;
  ensureMany: {
    product(records: Record<Alias, Partial<Product>>): PatchBuilder;
    customer(records: Record<Alias, Partial<Customer>>): PatchBuilder;
  };
}

export interface ScenarioDefinition {
  name: string;
  build: (p: PatchBuilder) => void | Promise<void>;
}

export interface ScenarioLoader {
  patch(fn: (p: PatchBuilder) => void | Promise<void>): ScenarioLoader;
  load(): Promise<ScenarioResult>;
}
