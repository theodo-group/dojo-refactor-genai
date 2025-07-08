import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";
import { Product } from "../../src/entities/product.entity";

export interface LoyaltyTestScenario {
  customers: Customer[];
  products: Product[];
  orders: Order[];
  loyalCustomer: Customer;
  newCustomer: Customer;
  bronzeCustomer: Customer;
  silverCustomer: Customer;
}

export class LoyaltyFixtures {
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

  async createTestScenario(): Promise<LoyaltyTestScenario> {
    // Créer des clients avec différents niveaux de fidélité
    const customers = [
      // Client avec beaucoup de commandes (loyal)
      this.customerRepository.create({
        name: "Loyal Customer",
        email: "loyal.customer@example.com",
        phone: "555-0300",
        address: "123 Loyalty Street",
      }),
      // Nouveau client (aucune commande)
      this.customerRepository.create({
        name: "New Customer",
        email: "new.customer@example.com",
        phone: "555-0301",
        address: "456 New Avenue",
      }),
      // Client Bronze (quelques commandes)
      this.customerRepository.create({
        name: "Bronze Customer",
        email: "bronze.customer@example.com",
        phone: "555-0302",
        address: "789 Bronze Road",
      }),
      // Client Silver (commandes moyennes)
      this.customerRepository.create({
        name: "Silver Customer",
        email: "silver.customer@example.com",
        phone: "555-0303",
        address: "101 Silver Boulevard",
      }),
    ];

    const savedCustomers = await this.customerRepository.save(customers);

    // Créer des produits pour les tests de fidélité
    const products = [
      this.productRepository.create({
        name: "Loyalty Test Pizza",
        description: "Pizza for loyalty testing",
        price: 12.99,
        category: "pizza",
        isAvailable: true,
      }),
      this.productRepository.create({
        name: "Loyalty Test Salad",
        description: "Salad for loyalty testing",
        price: 8.99,
        category: "salad",
        isAvailable: true,
      }),
    ];

    const savedProducts = await this.productRepository.save(products);

    // Créer des commandes pour établir l'historique de fidélité
    const orders = [];

    // Créer des commandes passées pour le client loyal (6 commandes)
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const orderDate = new Date(now);
      orderDate.setDate(now.getDate() - (i + 1) * 5); // Espacer les commandes

      orders.push(
        this.orderRepository.create({
          customerId: savedCustomers[0].id,
          customer: savedCustomers[0],
          products: [savedProducts[0]],
          totalAmount: 12.99,
          status: OrderStatus.DELIVERED,
          notes: `Historical loyalty order ${i + 1}`,
          createdAt: orderDate,
          updatedAt: orderDate,
        })
      );
    }

    // Créer des commandes pour le client Bronze (2 commandes)
    for (let i = 0; i < 2; i++) {
      const orderDate = new Date(now);
      orderDate.setDate(now.getDate() - (i + 1) * 10);

      orders.push(
        this.orderRepository.create({
          customerId: savedCustomers[2].id,
          customer: savedCustomers[2],
          products: [savedProducts[1]],
          totalAmount: 8.99,
          status: OrderStatus.DELIVERED,
          notes: `Bronze customer order ${i + 1}`,
          createdAt: orderDate,
          updatedAt: orderDate,
        })
      );
    }

    // Créer des commandes pour le client Silver (4 commandes)
    for (let i = 0; i < 4; i++) {
      const orderDate = new Date(now);
      orderDate.setDate(now.getDate() - (i + 1) * 7);

      orders.push(
        this.orderRepository.create({
          customerId: savedCustomers[3].id,
          customer: savedCustomers[3],
          products: [savedProducts[0]],
          totalAmount: 12.99,
          status: OrderStatus.DELIVERED,
          notes: `Silver customer order ${i + 1}`,
          createdAt: orderDate,
          updatedAt: orderDate,
        })
      );
    }

    const savedOrders = await this.orderRepository.save(orders);

    return {
      customers: savedCustomers,
      products: savedProducts,
      orders: savedOrders,
      loyalCustomer: savedCustomers[0],
      newCustomer: savedCustomers[1],
      bronzeCustomer: savedCustomers[2],
      silverCustomer: savedCustomers[3],
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