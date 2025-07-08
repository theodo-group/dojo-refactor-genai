import { BaseFixture } from "./base-fixture";
import { ProductBuilder, CustomerBuilder, OrderBuilder } from "./builders";
import { Product } from "../../src/entities/product.entity";
import { Customer } from "../../src/entities/customer.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

export class ProductFixtures extends BaseFixture {
  private products: Product[] = [];
  private customers: Customer[] = [];
  private orders: Order[] = [];

  async load(): Promise<void> {
    await this.clear();
    this.products = await this.createProducts();
    this.customers = await this.createCustomers();
    this.orders = await this.createOrders();
  }

  getProducts(): Product[] {
    return this.products;
  }

  getProductBuilder(): ProductBuilder {
    return new ProductBuilder(this.productRepository);
  }

  // Helper methods for specific test scenarios
  getDeletableProducts(): Product[] {
    return this.products.slice(5, 8); // Products 5-7 for deletion tests
  }

  getUpdateTestProducts(): Product[] {
    return this.products.slice(8, 11); // Products 8-10 for update tests
  }

  getProductsInActiveOrders(): Product[] {
    // Returns products that are currently in active orders
    return [this.products[1]]; // Pepperoni Pizza in PREPARING order
  }

  private async createCustomers(): Promise<Customer[]> {
    const customerBuilder = new CustomerBuilder(this.customerRepository);

    return [
      await customerBuilder
        .withName("John Doe")
        .withEmail("john@example.com")
        .withPhone("123-456-7890")
        .withAddress("123 Main St")
        .build(),
    ];
  }

  private async createOrders(): Promise<Order[]> {
    const orderBuilder = new OrderBuilder(this.orderRepository);

    return [
      // Create an order with Pepperoni Pizza to test deletion prevention
      await orderBuilder
        .withCustomer(this.customers[0])
        .withProducts([this.products[1]]) // Pepperoni Pizza - will be in active order
        .withStatus(OrderStatus.PREPARING)
        .withNotes("Order to test product deletion prevention")
        .build(),
    ];
  }

  private async createProducts(): Promise<Product[]> {
    const productBuilder = this.getProductBuilder();

    const products = [
      // Core products for basic functionality
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

      // Products specifically for deletion tests (NOT in any orders)
      await productBuilder
        .withName("Deletable Product 1")
        .withDescription(
          "Product that can be safely deleted - not in any orders"
        )
        .withPrice(9.99)
        .withCategory("test")
        .build(),

      await productBuilder
        .withName("Deletable Product 2")
        .withDescription("Another product that can be safely deleted")
        .withPrice(11.99)
        .withCategory("test")
        .build(),

      await productBuilder
        .withName("Soft Delete Test Product")
        .withDescription("Product used for soft delete testing")
        .withPrice(6.99)
        .withCategory("test")
        .build(),

      // Products for update tests
      await productBuilder
        .withName("Update Test Pizza")
        .withDescription("Pizza used for testing partial updates")
        .withPrice(13.99)
        .withCategory("pizza")
        .build(),

      await productBuilder
        .withName("Category Change Test")
        .withDescription("Product used for testing category changes")
        .withPrice(10.99)
        .withCategory("original-category")
        .build(),

      await productBuilder
        .withName("Price Validation Test")
        .withDescription("Product used for price validation testing")
        .withPrice(5.99)
        .withCategory("validation")
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

    return products;
  }
}
