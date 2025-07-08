import { BaseFixture } from "./base-fixture";
import { CustomerBuilder, ProductBuilder, OrderBuilder } from "./builders";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

export class OrderFixtures extends BaseFixture {
  private customers: Customer[] = [];
  private products: Product[] = [];
  private orders: Order[] = [];

  async load(): Promise<void> {
    await this.clear();

    // Create minimal customers and products needed for order tests
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

  // Helper methods for specific test scenarios
  getProductsInActiveOrders(): Product[] {
    // Return products that are in active orders
    return this.products.slice(0, 2); // Products used in PENDING/PREPARING orders
  }

  getRecentOrderForModification(): Order {
    // Return recent order that can be modified
    return this.orders.find(
      (order) =>
        order.status === OrderStatus.PENDING &&
        order.createdAt &&
        new Date().getTime() - order.createdAt.getTime() < 5 * 60 * 1000 // within 5 minutes
    );
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

      await customerBuilder
        .withName("Charlie Test")
        .withEmail("charlie@example.com")
        .withPhone("222-222-2222")
        .withAddress("123 Test St")
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

      // Unavailable product for testing
      await productBuilder
        .withName("Seasonal Special")
        .withDescription("Limited time offer - currently unavailable")
        .withPrice(15.99)
        .withCategory("special")
        .withIsAvailable(false)
        .build(),
    ];
  }

  private async createOrders(): Promise<Order[]> {
    const orderBuilder = this.getOrderBuilder();
    const now = new Date();

    // Create orders with various statuses for testing
    const orders = [
      // Delivered order
      await orderBuilder
        .withCustomer(this.customers[0])
        .withProducts([this.products[0], this.products[3]]) // Margherita + Garlic Bread
        .withStatus(OrderStatus.DELIVERED)
        .withNotes("Extra cheese please")
        .withCreatedAt(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)) // 10 days ago
        .build(),

      // Pending order
      await orderBuilder
        .withCustomer(this.customers[1])
        .withProducts([this.products[2]]) // Caesar Salad
        .withStatus(OrderStatus.PENDING)
        .withNotes("Please deliver quickly")
        .build(),

      // Preparing order (active)
      await orderBuilder
        .withCustomer(this.customers[2])
        .withProducts([this.products[1]]) // Pepperoni Pizza - will be in active order
        .withStatus(OrderStatus.PREPARING)
        .withNotes("Order to test product deletion prevention")
        .withCreatedAt(new Date(now.getTime() - 30 * 60 * 1000)) // 30 minutes ago
        .build(),

      // Recent order for modification testing
      await orderBuilder
        .withCustomer(this.customers[4])
        .withProducts([this.products[0]]) // Margherita Pizza
        .withStatus(OrderStatus.PENDING)
        .withNotes("Recent order for modification testing")
        .withCreatedAt(new Date(now.getTime() - 2 * 60 * 1000)) // 2 minutes ago
        .build(),

      // Additional delivered order
      await orderBuilder
        .withCustomer(this.customers[0])
        .withProducts([this.products[2], this.products[4]]) // Caesar Salad + Tiramisu
        .withStatus(OrderStatus.DELIVERED)
        .withCreatedAt(new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)) // 15 days ago
        .build(),
    ];

    return orders;
  }
}
