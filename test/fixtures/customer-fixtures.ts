import { BaseFixture } from "./base-fixture";
import { CustomerBuilder, ProductBuilder, OrderBuilder } from "./builders";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

export class CustomerFixtures extends BaseFixture {
  private customers: Customer[] = [];
  private products: Product[] = [];
  private orders: Order[] = [];

  async load(): Promise<void> {
    await this.clear();
    this.customers = await this.createCustomers();
    this.products = await this.createProducts();
    this.orders = await this.createOrders();
  }

  getCustomers(): Customer[] {
    return this.customers;
  }

  getCustomerBuilder(): CustomerBuilder {
    return new CustomerBuilder(this.customerRepository);
  }

  // Helper methods for specific test scenarios
  getUpdateTestCustomers(): Customer[] {
    return this.customers.slice(0, 3); // First 3 customers for update tests
  }

  getPartialUpdateTestCustomer(): Customer {
    return this.customers[1]; // Second customer for partial update tests
  }

  private async createProducts(): Promise<Product[]> {
    const productBuilder = new ProductBuilder(this.productRepository);

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
    ];
  }

  private async createOrders(): Promise<Order[]> {
    const orderBuilder = new OrderBuilder(this.orderRepository);

    return [
      // Create an order for the first customer so they have order history
      await orderBuilder
        .withCustomer(this.customers[0])
        .withProducts([this.products[0]]) // Margherita Pizza
        .withStatus(OrderStatus.DELIVERED)
        .withNotes("Customer order history")
        .build(),
    ];
  }

  private async createCustomers(): Promise<Customer[]> {
    const customerBuilder = this.getCustomerBuilder();

    // Create customers needed for customer tests
    const customers = [
      // Customer for basic operations
      await customerBuilder
        .withName("John Doe")
        .withEmail("john@example.com")
        .withPhone("123-456-7890")
        .withAddress("123 Main St")
        .build(),

      // Customer for partial update tests
      await customerBuilder
        .withName("Jane Smith")
        .withEmail("jane@example.com")
        .withPhone("987-654-3210")
        .withAddress("456 Oak Ave")
        .build(),

      // Customer for delete tests
      await customerBuilder
        .withName("Bob Johnson")
        .withEmail("bob@example.com")
        .withPhone("555-555-5555")
        .withAddress("789 Pine Rd")
        .build(),

      // Additional customers for various test scenarios
      await customerBuilder
        .withName("Alice Test")
        .withEmail("alice@example.com")
        .withPhone("111-111-1111")
        .withAddress("999 Test Ave")
        .build(),

      await customerBuilder
        .withName("Charlie Update")
        .withEmail("charlie@example.com")
        .withPhone("222-222-2222")
        .withAddress("123 Update St")
        .build(),
    ];

    return customers;
  }
}
