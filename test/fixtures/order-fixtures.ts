import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";
import { Product } from "../../src/entities/product.entity";

export interface OrderTestScenario {
  customers: Customer[];
  products: Product[];
  orders: Order[];
  testCustomer: Customer;
  pendingOrder: Order;
  deliveredOrder: Order;
}

export class OrderFixtures {
  private app: INestApplication;
  private orderRepository: Repository<Order>;
  private customerRepository: Repository<Customer>;
  private productRepository: Repository<Product>;

  constructor(app: INestApplication) {
    this.app = app;
    this.orderRepository = app.get(getRepositoryToken(Order));
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
  }

  async createTestScenario(): Promise<OrderTestScenario> {
    // Créer des clients nécessaires pour les tests d'orders
    const customers = [
      this.customerRepository.create({
        name: "Order Test Customer",
        email: "order.test@example.com",
        phone: "555-0200",
        address: "123 Order Street",
      }),
      this.customerRepository.create({
        name: "Order Test Customer 2",
        email: "order.test2@example.com",
        phone: "555-0201",
        address: "456 Order Avenue",
      }),
    ];

    const savedCustomers = await this.customerRepository.save(customers);

    // Créer des produits nécessaires pour les tests d'orders
    const products = [
      this.productRepository.create({
        name: "Order Test Pizza",
        description: "Pizza for order testing",
        price: 14.99,
        category: "pizza",
        isAvailable: true,
      }),
      this.productRepository.create({
        name: "Order Test Salad",
        description: "Salad for order testing",
        price: 9.99,
        category: "salad",
        isAvailable: true,
      }),
      this.productRepository.create({
        name: "Order Test Dessert",
        description: "Dessert for order testing",
        price: 6.99,
        category: "dessert",
        isAvailable: true,
      }),
    ];

    const savedProducts = await this.productRepository.save(products);

    // Créer des commandes de test
    const orders = [
      this.orderRepository.create({
        customerId: savedCustomers[0].id,
        customer: savedCustomers[0],
        products: [savedProducts[0]],
        totalAmount: 14.99,
        status: OrderStatus.PENDING,
        notes: "Test pending order",
      }),
      this.orderRepository.create({
        customerId: savedCustomers[1].id,
        customer: savedCustomers[1],
        products: [savedProducts[1], savedProducts[2]],
        totalAmount: 16.98,
        status: OrderStatus.DELIVERED,
        notes: "Test delivered order",
      }),
    ];

    const savedOrders = await this.orderRepository.save(orders);

    return {
      customers: savedCustomers,
      products: savedProducts,
      orders: savedOrders,
      testCustomer: savedCustomers[0],
      pendingOrder: savedOrders[0],
      deliveredOrder: savedOrders[1],
    };
  }

  async cleanup(): Promise<void> {
    // Nettoyer dans l'ordre inverse des dépendances FK
    await this.orderRepository.query("TRUNCATE TABLE order_products CASCADE");
    await this.orderRepository.query("TRUNCATE TABLE orders CASCADE");
    await this.productRepository.query("TRUNCATE TABLE products CASCADE");
    await this.customerRepository.query("TRUNCATE TABLE customers CASCADE");
  }
} 