import { BaseFixture } from "./base-fixture";
import { CustomerBuilder, ProductBuilder, OrderBuilder } from "./builders";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

export class LoyaltyFixtures extends BaseFixture {
  private customers: Customer[] = [];
  private products: Product[] = [];
  private orders: Order[] = [];

  async load(): Promise<void> {
    await this.clear();

    // Create customers, products, and orders needed for loyalty tests
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

  // Helper methods for specific loyalty test scenarios
  getCustomerWithManyOrders(): Customer {
    // Returns customer with multiple orders for loyalty testing
    return this.customers[0]; // John Doe with multiple orders
  }

  getHighTierLoyaltyCustomer(): Customer {
    // Returns VIP customer for high-tier loyalty testing
    return this.customers[3]; // Alice VIP
  }

  private async createCustomers(): Promise<Customer[]> {
    const customerBuilder = this.getCustomerBuilder();

    return [
      // Customer with many orders for loyalty testing
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

      // VIP customer for high-tier loyalty testing
      await customerBuilder
        .withName("Alice VIP")
        .withEmail("alice.vip@example.com")
        .withPhone("111-111-1111")
        .withAddress("999 Premium Ave")
        .build(),

      // Customer for progressive loyalty testing
      await customerBuilder
        .withName("Charlie Test")
        .withEmail("charlie.test@example.com")
        .withPhone("222-222-2222")
        .withAddress("123 Test Avenue")
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
        .withName("Pepperoni Pizza")
        .withDescription("Pizza with tomato sauce, mozzarella, and pepperoni")
        .withPrice(14.99)
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

      await productBuilder
        .withName("Tiramisu")
        .withDescription("Classic Italian dessert with coffee and mascarpone")
        .withPrice(7.99)
        .withCategory("dessert")
        .build(),
    ];
  }

  private async createOrders(): Promise<Order[]> {
    const orderBuilder = this.getOrderBuilder();
    const now = new Date();

    // Create dates to make first customer eligible for loyalty program
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    const twentyFiveDaysAgo = new Date(
      now.getTime() - 25 * 24 * 60 * 60 * 1000
    );

    const orders = [
      // John Doe's orders (first customer - has 4 orders for loyalty testing)
      await orderBuilder
        .withCustomer(this.customers[0])
        .withProducts([this.products[0], this.products[3]]) // Margherita Pizza + Garlic Bread
        .withStatus(OrderStatus.DELIVERED)
        .withNotes("Extra cheese please")
        .withCreatedAt(tenDaysAgo)
        .withUpdatedAt(tenDaysAgo)
        .build(),

      await orderBuilder
        .withCustomer(this.customers[0])
        .withProducts([this.products[2], this.products[4]]) // Caesar Salad + Tiramisu
        .withStatus(OrderStatus.DELIVERED)
        .withCreatedAt(fifteenDaysAgo)
        .withUpdatedAt(fifteenDaysAgo)
        .build(),

      await orderBuilder
        .withCustomer(this.customers[0])
        .withProducts([this.products[0], this.products[2]]) // Margherita Pizza + Caesar Salad
        .withStatus(OrderStatus.DELIVERED)
        .withCreatedAt(twentyDaysAgo)
        .withUpdatedAt(twentyDaysAgo)
        .build(),

      await orderBuilder
        .withCustomer(this.customers[0])
        .withProducts([this.products[4]]) // Tiramisu only
        .withStatus(OrderStatus.DELIVERED)
        .withCreatedAt(twentyFiveDaysAgo)
        .withUpdatedAt(twentyFiveDaysAgo)
        .build(),

      // Bob Johnson's order (pending status for testing)
      await orderBuilder
        .withCustomer(this.customers[2])
        .withProducts([this.products[2]]) // Caesar Salad
        .withStatus(OrderStatus.PENDING)
        .withNotes("Please deliver quickly")
        .build(),

      // Alice VIP's orders (many orders for high-tier loyalty testing)
      await orderBuilder
        .withCustomer(this.customers[3])
        .withProducts([this.products[0]]) // Margherita Pizza
        .withStatus(OrderStatus.DELIVERED)
        .withCreatedAt(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)) // 5 days ago
        .withUpdatedAt(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000))
        .build(),

      await orderBuilder
        .withCustomer(this.customers[3])
        .withProducts([this.products[3]]) // Garlic Bread
        .withStatus(OrderStatus.DELIVERED)
        .withCreatedAt(new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)) // 8 days ago
        .withUpdatedAt(new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000))
        .build(),

      // Order with Pepperoni Pizza in PREPARING status for active order tests
      await orderBuilder
        .withCustomer(this.customers[1])
        .withProducts([this.products[1]]) // Pepperoni Pizza - active order
        .withStatus(OrderStatus.PREPARING)
        .withNotes("Order to test product deletion prevention")
        .withCreatedAt(new Date(now.getTime() - 30 * 60 * 1000)) // 30 minutes ago
        .withUpdatedAt(new Date(now.getTime() - 30 * 60 * 1000))
        .build(),
    ];

    return orders;
  }
}
