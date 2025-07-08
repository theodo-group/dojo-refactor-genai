import { BaseFixture } from "./base-fixture";
import { CustomerBuilder, ProductBuilder, OrderBuilder } from "./builders";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

export class AppFixtures extends BaseFixture {
  private customers: Customer[] = [];
  private products: Product[] = [];
  private orders: Order[] = [];

  async load(): Promise<void> {
    await this.clear();

    // Create minimal data needed for general app tests
    this.customers = await this.createCustomers();
    this.products = await this.createProducts();
    this.orders = await this.createOrders();
  }

  getCustomers(): Customer[] {
    return this.customers;
  }

  getProducts(): Product[] {
    return this.products;
  }

  getOrders(): Order[] {
    return this.orders;
  }

  getCustomerBuilder(): CustomerBuilder {
    return new CustomerBuilder(this.customerRepository);
  }

  getProductBuilder(): ProductBuilder {
    return new ProductBuilder(this.productRepository);
  }

  getOrderBuilder(): OrderBuilder {
    return new OrderBuilder(this.orderRepository);
  }

  // Helper methods for app test scenarios
  getUpdateTestCustomers(): Customer[] {
    return this.customers.slice(1, 4); // Customers for concurrent update tests
  }

  private async createCustomers(): Promise<Customer[]> {
    const customerBuilder = this.getCustomerBuilder();

    return [
      await customerBuilder
        .withName("John Doe")
        .withEmail("john@example.com")
        .withPhone("123-456-7890")
        .withAddress("123 Main St")
        .build(),

      await customerBuilder
        .withName("Jane Smith")
        .withEmail("jane@example.com")
        .withPhone("987-654-3210")
        .withAddress("456 Oak Ave")
        .build(),

      await customerBuilder
        .withName("Bob Johnson")
        .withEmail("bob@example.com")
        .withPhone("555-555-5555")
        .withAddress("789 Pine Rd")
        .build(),

      await customerBuilder
        .withName("Alice Test")
        .withEmail("alice@example.com")
        .withPhone("111-111-1111")
        .withAddress("999 Test Ave")
        .build(),
    ];
  }

  private async createProducts(): Promise<Product[]> {
    const productBuilder = this.getProductBuilder();

    return [
      await productBuilder
        .withName("Margherita Pizza")
        .withDescription("Classic pizza with tomato sauce and mozzarella")
        .withPrice(12.99)
        .withCategory("pizza")
        .build(),

      await productBuilder
        .withName("Caesar Salad")
        .withDescription(
          "Fresh salad with romaine lettuce, croutons, and Caesar dressing"
        )
        .withPrice(8.99)
        .withCategory("salad")
        .build(),

      await productBuilder
        .withName("Garlic Bread")
        .withDescription("Toasted bread with garlic butter")
        .withPrice(4.99)
        .withCategory("appetizer")
        .build(),
    ];
  }

  private async createOrders(): Promise<Order[]> {
    const orderBuilder = this.getOrderBuilder();

    return [
      await orderBuilder
        .withCustomer(this.customers[0])
        .withProducts([this.products[0]]) // Margherita Pizza
        .withStatus(OrderStatus.DELIVERED)
        .withNotes("Test order")
        .build(),

      await orderBuilder
        .withCustomer(this.customers[1])
        .withProducts([this.products[1]]) // Caesar Salad
        .withStatus(OrderStatus.PENDING)
        .withNotes("Another test order")
        .build(),
    ];
  }
}
