import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../../src/entities/customer.entity";
import { Product } from "../../../src/entities/product.entity";
import { Order, OrderStatus } from "../../../src/entities/order.entity";
import {
  Alias,
  EntityMap,
  PatchBuilder,
  ScenarioDefinition,
  ScenarioLoader,
  ScenarioResult,
} from "./types";

const registry = new Map<string, (p: PatchBuilder) => void | Promise<void>>();

export function registerScenario(
  name: string,
  build: (p: PatchBuilder) => void | Promise<void>
) {
  registry.set(name, build);
}

class Patch implements PatchBuilder {
  private customers = new Map<string, Partial<Customer>>();
  private products = new Map<string, Partial<Product>>();
  private orders = new Map<
    string,
    {
      customer: string | Customer;
      products: Array<string | Product>;
      status?: OrderStatus;
      totalAmount?: number;
      notes?: string;
      createdAt?: Date;
      updatedAt?: Date;
    }
  >();

  ensureCustomer(alias: string, data: Partial<Customer>): PatchBuilder {
    const existing = this.customers.get(alias) || {};
    this.customers.set(alias, { ...existing, ...data });
    return this;
  }
  ensureProduct(alias: string, data: Partial<Product>): PatchBuilder {
    const existing = this.products.get(alias) || {};
    this.products.set(alias, { ...existing, ...data });
    return this;
  }
  ensureOrder(alias: string, data: any): PatchBuilder {
    const existing = this.orders.get(alias) || ({} as any);
    this.orders.set(alias, { ...existing, ...data });
    return this;
  }
  ensureMany = {
    product: (records: Record<string, Partial<Product>>) => {
      Object.entries(records).forEach(([alias, data]) =>
        this.ensureProduct(alias, data)
      );
      return this as PatchBuilder;
    },
    customer: (records: Record<string, Partial<Customer>>) => {
      Object.entries(records).forEach(([alias, data]) =>
        this.ensureCustomer(alias, data)
      );
      return this as PatchBuilder;
    },
  };

  snapshot() {
    return {
      customers: new Map(this.customers),
      products: new Map(this.products),
      orders: new Map(this.orders),
    };
  }
}

class Result implements ScenarioResult {
  constructor(private map: EntityMap) {}
  handle(alias: Alias) {
    return (
      this.map.customers[alias] ||
      this.map.products[alias] ||
      this.map.orders[alias]
    );
  }
  handles(aliases: Alias[]) {
    return aliases.map((a) => this.handle(a));
  }
  id(alias: Alias) {
    return (this.handle(alias) as any).id;
  }
  ids(aliases: Alias[]) {
    return aliases.map((a) => this.id(a));
  }
  customer(alias: Alias) {
    return this.map.customers[alias];
  }
  product(alias: Alias) {
    return this.map.products[alias];
  }
  order(alias: Alias) {
    return this.map.orders[alias];
  }
}

export async function resetDatabase(app: INestApplication) {
  const customerRepo: Repository<Customer> = app.get(
    getRepositoryToken(Customer)
  );
  const productRepo: Repository<Product> = app.get(getRepositoryToken(Product));
  const orderRepo: Repository<Order> = app.get(getRepositoryToken(Order));

  await orderRepo.query("TRUNCATE TABLE order_products CASCADE");
  await orderRepo.query("TRUNCATE TABLE orders CASCADE");
  await productRepo.query("TRUNCATE TABLE products CASCADE");
  await customerRepo.query("TRUNCATE TABLE customers CASCADE");
}

export function useScenario(
  app: INestApplication,
  name: string
): ScenarioLoader {
  const customerRepo: Repository<Customer> = app.get(
    getRepositoryToken(Customer)
  );
  const productRepo: Repository<Product> = app.get(getRepositoryToken(Product));
  const orderRepo: Repository<Order> = app.get(getRepositoryToken(Order));

  const base = registry.get(name);
  if (!base) throw new Error(`Scenario '${name}' is not registered`);

  const patch = new Patch();

  const loader: ScenarioLoader = {
    patch: (fn) => {
      fn(patch);
      return loader;
    },
    load: async () => {
      // reset tables per load
      await resetDatabase(app);

      // apply base then patch (base mutates the same patch instance)
      await base(patch);

      const snap = patch.snapshot();
      const map: EntityMap = { customers: {}, products: {}, orders: {} } as any;

      // persist customers
      for (const [alias, data] of snap.customers.entries()) {
        const entity = customerRepo.create({
          name: data.name ?? `Customer ${alias}`,
          email: (data as any).email ?? `${alias}@example.com`,
          phone: (data as any).phone ?? null,
          address: (data as any).address ?? null,
          isActive: (data as any).isActive ?? true,
        });
        map.customers[alias] = await customerRepo.save(entity);
      }

      // persist products
      for (const [alias, data] of snap.products.entries()) {
        const entity = productRepo.create({
          name: data.name ?? `Product ${alias}`,
          description: (data as any).description ?? "",
          price: (data as any).price ?? 0,
          isAvailable: (data as any).isAvailable ?? true,
          category: (data as any).category ?? null,
        });
        map.products[alias] = await productRepo.save(entity);
      }

      // resolve helper
      const resolveCustomer = (ref: string | Customer) =>
        typeof ref === "string" ? map.customers[ref] : ref;
      const resolveProduct = (ref: string | Product) =>
        typeof ref === "string" ? map.products[ref] : ref;

      // persist orders (after customers/products)
      for (const [alias, data] of snap.orders.entries()) {
        const entity = orderRepo.create({
          customer: resolveCustomer(data.customer),
          products: data.products.map((p) => resolveProduct(p)),
          status: data.status ?? OrderStatus.PENDING,
          totalAmount: data.totalAmount ?? 0,
          notes: data.notes ?? null,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
        map.orders[alias] = await orderRepo.save(entity);
      }

      return new Result(map);
    },
  };

  return loader;
}
