import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

// Base builder interface
interface Builder<T> {
  build(): Promise<T>;
}

// Customer Builder
export class CustomerBuilder implements Builder<Customer> {
  private customer: Partial<Customer> = {};

  constructor(private customerRepository: Repository<Customer>) {
    // Set sensible defaults
    this.customer = {
      name: "Default Customer",
      email: "customer@example.com",
      phone: "555-0000",
      address: "123 Default St",
      isActive: true,
    };
  }

  withName(name: string): CustomerBuilder {
    this.customer.name = name;
    return this;
  }

  withEmail(email: string): CustomerBuilder {
    this.customer.email = email;
    return this;
  }

  withPhone(phone: string): CustomerBuilder {
    this.customer.phone = phone;
    return this;
  }

  withAddress(address: string): CustomerBuilder {
    this.customer.address = address;
    return this;
  }

  withIsActive(isActive: boolean): CustomerBuilder {
    this.customer.isActive = isActive;
    return this;
  }

  async build(): Promise<Customer> {
    const customer = this.customerRepository.create(this.customer);
    return await this.customerRepository.save(customer);
  }
}

// Product Builder
export class ProductBuilder implements Builder<Product> {
  private product: Partial<Product> = {};

  constructor(private productRepository: Repository<Product>) {
    // Set sensible defaults
    this.product = {
      name: "Default Product",
      description: "A default product",
      price: 10.0,
      isAvailable: true,
      category: "general",
    };
  }

  withName(name: string): ProductBuilder {
    this.product.name = name;
    return this;
  }

  withDescription(description: string): ProductBuilder {
    this.product.description = description;
    return this;
  }

  withPrice(price: number): ProductBuilder {
    this.product.price = price;
    return this;
  }

  withCategory(category: string): ProductBuilder {
    this.product.category = category;
    return this;
  }

  withIsAvailable(isAvailable: boolean): ProductBuilder {
    this.product.isAvailable = isAvailable;
    return this;
  }

  // Convenience methods for common products
  asPizza(name: string = "Margherita Pizza"): ProductBuilder {
    return this.withName(name)
      .withDescription(`Classic ${name.toLowerCase()}`)
      .withPrice(12.99)
      .withCategory("pizza");
  }

  asSalad(name: string = "Caesar Salad"): ProductBuilder {
    return this.withName(name)
      .withDescription(`Fresh ${name.toLowerCase()}`)
      .withPrice(8.99)
      .withCategory("salad");
  }

  asDessert(name: string = "Tiramisu"): ProductBuilder {
    return this.withName(name)
      .withDescription(`Delicious ${name.toLowerCase()}`)
      .withPrice(7.99)
      .withCategory("dessert");
  }

  async build(): Promise<Product> {
    const product = this.productRepository.create(this.product);
    return await this.productRepository.save(product);
  }
}

// Order Builder
export class OrderBuilder implements Builder<Order> {
  private order: Partial<Order> = {};
  private products: Product[] = [];
  private shouldCalculateTotal = false;

  constructor(private orderRepository: Repository<Order>) {
    // Set sensible defaults
    this.order = {
      status: OrderStatus.PENDING,
      totalAmount: 0,
      notes: null,
    };
  }

  forCustomer(customer: Customer): OrderBuilder {
    this.order.customer = customer;
    return this;
  }

  withProduct(product: Product): OrderBuilder {
    this.products.push(product);
    return this;
  }

  withProducts(products: Product[]): OrderBuilder {
    this.products = [...this.products, ...products];
    return this;
  }

  withStatus(status: OrderStatus): OrderBuilder {
    this.order.status = status;
    return this;
  }

  withTotalAmount(amount: number): OrderBuilder {
    this.order.totalAmount = amount;
    this.shouldCalculateTotal = false; // Don't auto-calculate if manually set
    return this;
  }

  withNotes(notes: string): OrderBuilder {
    this.order.notes = notes;
    return this;
  }

  calculateTotal(): OrderBuilder {
    this.shouldCalculateTotal = true;
    return this;
  }

  createdDaysAgo(days: number): OrderBuilder {
    const date = new Date();
    date.setDate(date.getDate() - days);
    this.order.createdAt = date;
    this.order.updatedAt = date;
    return this;
  }

  async build(): Promise<Order> {
    if (this.shouldCalculateTotal && this.products.length > 0) {
      this.order.totalAmount = this.products.reduce(
        (sum, product) => sum + Number(product.price),
        0
      );
    }

    this.order.products = this.products;
    const order = this.orderRepository.create(this.order);
    return await this.orderRepository.save(order);
  }
}

// Scenario Builder for complex test setups
export class ScenarioBuilder {
  constructor(private fixtures: FixtureFactory) {}

  loyalCustomer(): LoyalCustomerScenarioBuilder {
    return new LoyalCustomerScenarioBuilder(this.fixtures);
  }

  newCustomer(): NewCustomerScenarioBuilder {
    return new NewCustomerScenarioBuilder(this.fixtures);
  }

  restaurantMenu(): RestaurantMenuScenarioBuilder {
    return new RestaurantMenuScenarioBuilder(this.fixtures);
  }
}

// Loyal Customer Scenario Builder
export class LoyalCustomerScenarioBuilder {
  private customer: Partial<Customer> = {
    name: "Loyal Customer",
    email: "loyal@example.com",
    phone: "555-1234",
    address: "456 Loyalty St",
  };
  private orderHistory: Array<{
    daysAgo: number;
    products: string[];
    status: OrderStatus;
  }> = [];

  constructor(private fixtures: FixtureFactory) {}

  withName(name: string): LoyalCustomerScenarioBuilder {
    this.customer.name = name;
    return this;
  }

  withEmail(email: string): LoyalCustomerScenarioBuilder {
    this.customer.email = email;
    return this;
  }

  withOrderHistory(
    history: Array<{
      daysAgo: number;
      products: string[];
      status: OrderStatus;
    }>
  ): LoyalCustomerScenarioBuilder {
    this.orderHistory = history;
    return this;
  }

  async build(): Promise<{ customer: Customer; orders: Order[] }> {
    // Create the customer
    const customer = await this.fixtures
      .customer()
      .withName(this.customer.name!)
      .withEmail(this.customer.email!)
      .withPhone(this.customer.phone!)
      .withAddress(this.customer.address!)
      .build();

    // Create order history
    const orders: Order[] = [];
    for (const orderSpec of this.orderHistory) {
      // Create products for this order
      const products: Product[] = [];
      for (const productName of orderSpec.products) {
        let product: Product;
        switch (productName.toLowerCase()) {
          case "pizza":
            product = await this.fixtures
              .product()
              .asPizza("Margherita Pizza")
              .build();
            break;
          case "salad":
            product = await this.fixtures
              .product()
              .asSalad("Caesar Salad")
              .build();
            break;
          case "dessert":
            product = await this.fixtures
              .product()
              .asDessert("Tiramisu")
              .build();
            break;
          default:
            product = await this.fixtures
              .product()
              .withName(productName)
              .build();
        }
        products.push(product);
      }

      // Create the order
      const order = await this.fixtures
        .order()
        .forCustomer(customer)
        .withProducts(products)
        .withStatus(orderSpec.status)
        .createdDaysAgo(orderSpec.daysAgo)
        .calculateTotal()
        .build();

      orders.push(order);
    }

    return { customer, orders };
  }
}

// New Customer Scenario Builder
export class NewCustomerScenarioBuilder {
  private customer: Partial<Customer> = {
    name: "New Customer",
    email: "new@example.com",
    phone: "555-9999",
    address: "789 New St",
  };

  constructor(private fixtures: FixtureFactory) {}

  withName(name: string): NewCustomerScenarioBuilder {
    this.customer.name = name;
    return this;
  }

  withEmail(email: string): NewCustomerScenarioBuilder {
    this.customer.email = email;
    return this;
  }

  async build(): Promise<Customer> {
    return await this.fixtures
      .customer()
      .withName(this.customer.name!)
      .withEmail(this.customer.email!)
      .withPhone(this.customer.phone!)
      .withAddress(this.customer.address!)
      .build();
  }
}

// Restaurant Menu Scenario Builder
export class RestaurantMenuScenarioBuilder {
  private pizzas: string[] = [];
  private salads: string[] = [];
  private desserts: string[] = [];

  constructor(private fixtures: FixtureFactory) {}

  withPizzas(pizzas: string[]): RestaurantMenuScenarioBuilder {
    this.pizzas = pizzas;
    return this;
  }

  withSalads(salads: string[]): RestaurantMenuScenarioBuilder {
    this.salads = salads;
    return this;
  }

  withDesserts(desserts: string[]): RestaurantMenuScenarioBuilder {
    this.desserts = desserts;
    return this;
  }

  async build(): Promise<{
    pizzas: Product[];
    salads: Product[];
    desserts: Product[];
  }> {
    const pizzaProducts: Product[] = [];
    const saladProducts: Product[] = [];
    const dessertProducts: Product[] = [];

    // Create pizzas
    for (const pizzaName of this.pizzas) {
      const pizza = await this.fixtures.product().asPizza(pizzaName).build();
      pizzaProducts.push(pizza);
    }

    // Create salads
    for (const saladName of this.salads) {
      const salad = await this.fixtures.product().asSalad(saladName).build();
      saladProducts.push(salad);
    }

    // Create desserts
    for (const dessertName of this.desserts) {
      const dessert = await this.fixtures
        .product()
        .asDessert(dessertName)
        .build();
      dessertProducts.push(dessert);
    }

    return {
      pizzas: pizzaProducts,
      salads: saladProducts,
      desserts: dessertProducts,
    };
  }
}

// Main Fixture Factory
export class FixtureFactory {
  private customerRepository: Repository<Customer>;
  private productRepository: Repository<Product>;
  private orderRepository: Repository<Order>;

  constructor(private app: INestApplication) {
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  customer(): CustomerBuilder {
    return new CustomerBuilder(this.customerRepository);
  }

  product(): ProductBuilder {
    return new ProductBuilder(this.productRepository);
  }

  order(): OrderBuilder {
    return new OrderBuilder(this.orderRepository);
  }

  scenario(): ScenarioBuilder {
    return new ScenarioBuilder(this);
  }

  // Utility method to clean up test data
  async cleanup(): Promise<void> {
    await this.orderRepository.query("TRUNCATE TABLE order_products CASCADE");
    await this.orderRepository.query("TRUNCATE TABLE orders CASCADE");
    await this.productRepository.query("TRUNCATE TABLE products CASCADE");
    await this.customerRepository.query("TRUNCATE TABLE customers CASCADE");
  }
}
