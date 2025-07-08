import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

export class CustomerBuilder {
  private customerData: Partial<Customer> = {};

  constructor(private customerRepository: Repository<Customer>) {}

  withName(name: string): CustomerBuilder {
    this.customerData.name = name;
    return this;
  }

  withEmail(email: string): CustomerBuilder {
    this.customerData.email = email;
    return this;
  }

  withPhone(phone: string): CustomerBuilder {
    this.customerData.phone = phone;
    return this;
  }

  withAddress(address: string): CustomerBuilder {
    this.customerData.address = address;
    return this;
  }

  withIsActive(isActive: boolean): CustomerBuilder {
    this.customerData.isActive = isActive;
    return this;
  }

  withCreatedAt(createdAt: Date): CustomerBuilder {
    this.customerData.createdAt = createdAt;
    return this;
  }

  withUpdatedAt(updatedAt: Date): CustomerBuilder {
    this.customerData.updatedAt = updatedAt;
    return this;
  }

  async build(): Promise<Customer> {
    // Set defaults for required fields if not provided
    const customer = this.customerRepository.create({
      name: this.customerData.name || "Test Customer",
      email: this.customerData.email || `test-${Date.now()}@example.com`,
      phone: this.customerData.phone || "123-456-7890",
      address: this.customerData.address || "123 Test St",
      isActive: this.customerData.isActive ?? true,
      ...this.customerData,
    });

    return await this.customerRepository.save(customer);
  }

  async buildMany(count: number): Promise<Customer[]> {
    const customers: Customer[] = [];
    for (let i = 0; i < count; i++) {
      // Create unique email for each customer if not specified
      const uniqueEmail =
        this.customerData.email || `test-${Date.now()}-${i}@example.com`;
      const customer = this.customerRepository.create({
        name: this.customerData.name || `Test Customer ${i + 1}`,
        email: uniqueEmail,
        phone: this.customerData.phone || `123-456-789${i}`,
        address: this.customerData.address || `${i + 1}23 Test St`,
        isActive: this.customerData.isActive ?? true,
        ...this.customerData,
      });
      // Override email to ensure uniqueness
      customer.email = uniqueEmail;
      customers.push(await this.customerRepository.save(customer));
    }
    return customers;
  }
}

export class ProductBuilder {
  private productData: Partial<Product> = {};

  constructor(private productRepository: Repository<Product>) {}

  withName(name: string): ProductBuilder {
    this.productData.name = name;
    return this;
  }

  withDescription(description: string): ProductBuilder {
    this.productData.description = description;
    return this;
  }

  withPrice(price: number): ProductBuilder {
    this.productData.price = price;
    return this;
  }

  withCategory(category: string): ProductBuilder {
    this.productData.category = category;
    return this;
  }

  withIsAvailable(isAvailable: boolean): ProductBuilder {
    this.productData.isAvailable = isAvailable;
    return this;
  }

  withCreatedAt(createdAt: Date): ProductBuilder {
    this.productData.createdAt = createdAt;
    return this;
  }

  withUpdatedAt(updatedAt: Date): ProductBuilder {
    this.productData.updatedAt = updatedAt;
    return this;
  }

  async build(): Promise<Product> {
    // Set defaults for required fields if not provided
    const product = this.productRepository.create({
      name: this.productData.name || "Test Product",
      description: this.productData.description || "Test product description",
      price: this.productData.price ?? 9.99,
      category: this.productData.category || "test",
      isAvailable: this.productData.isAvailable ?? true,
      ...this.productData,
    });

    return await this.productRepository.save(product);
  }

  async buildMany(count: number): Promise<Product[]> {
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
      const product = this.productRepository.create({
        name: this.productData.name || `Test Product ${i + 1}`,
        description:
          this.productData.description || `Test product ${i + 1} description`,
        price: this.productData.price ?? 9.99 + i,
        category: this.productData.category || "test",
        isAvailable: this.productData.isAvailable ?? true,
        ...this.productData,
      });
      products.push(await this.productRepository.save(product));
    }
    return products;
  }
}

export class OrderBuilder {
  private orderData: Partial<Order> = {};

  constructor(private orderRepository: Repository<Order>) {}

  withCustomer(customer: Customer): OrderBuilder {
    this.orderData.customer = customer;
    this.orderData.customerId = customer.id;
    return this;
  }

  withProducts(products: Product[]): OrderBuilder {
    this.orderData.products = products;
    return this;
  }

  withTotalAmount(totalAmount: number): OrderBuilder {
    this.orderData.totalAmount = totalAmount;
    return this;
  }

  withStatus(status: OrderStatus): OrderBuilder {
    this.orderData.status = status;
    return this;
  }

  withNotes(notes: string): OrderBuilder {
    this.orderData.notes = notes;
    return this;
  }

  withCreatedAt(createdAt: Date): OrderBuilder {
    this.orderData.createdAt = createdAt;
    return this;
  }

  withUpdatedAt(updatedAt: Date): OrderBuilder {
    this.orderData.updatedAt = updatedAt;
    return this;
  }

  async build(): Promise<Order> {
    if (!this.orderData.customer) {
      throw new Error("Order requires a customer. Use withCustomer() method.");
    }

    if (!this.orderData.products || this.orderData.products.length === 0) {
      throw new Error("Order requires products. Use withProducts() method.");
    }

    // Calculate total amount if not provided
    if (this.orderData.totalAmount === undefined) {
      this.orderData.totalAmount = this.orderData.products.reduce(
        (sum, product) => sum + parseFloat(product.price.toString()),
        0
      );
    }

    const order = this.orderRepository.create({
      status: this.orderData.status || OrderStatus.PENDING,
      notes: this.orderData.notes || "",
      ...this.orderData,
    });

    return await this.orderRepository.save(order);
  }
}
