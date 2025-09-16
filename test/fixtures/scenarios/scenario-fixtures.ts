import { INestApplication } from "@nestjs/common";
import { TestDataManager } from "../base/test-data-manager";
import { Customer } from "../../../src/entities/customer.entity";
import { Product } from "../../../src/entities/product.entity";
import { Order } from "../../../src/entities/order.entity";

export interface LoyaltyScenarioResult {
  customer: Customer;
  historicalOrders: Order[];
  availableProducts: Product[];
}

export interface BasicMenuScenarioResult {
  pizzas: Product[];
  salads: Product[];
  appetizers: Product[];
  desserts: Product[];
}

export interface OrderProcessingScenarioResult {
  customer: Customer;
  products: Product[];
  pendingOrder: Order;
  preparingOrder: Order;
}

export class ScenarioFixtures {
  private dataManager: TestDataManager;

  constructor(app: INestApplication) {
    this.dataManager = new TestDataManager(app);
  }

  async setupLoyaltyEligibleCustomer(): Promise<LoyaltyScenarioResult> {
    // GIVEN: A customer with qualifying order history for loyalty discounts
    const customer = await this.dataManager.customerFactory.createLoyalCustomer({
      name: "John Doe",
      email: `john.loyalty.${Date.now()}@example.com`,
    });

    // GIVEN: A variety of products for order history
    const products = await Promise.all([
      this.dataManager.productFactory.createMargheritaPizza(),
      this.dataManager.productFactory.createGarlicBread(),
      this.dataManager.productFactory.createCaesarSalad(),
      this.dataManager.productFactory.createTiramisu(),
    ]);

    // GIVEN: Historical orders that qualify the customer for loyalty tier
    const historicalOrders = await this.dataManager.orderFactory.createOrdersForLoyaltyQualification(
      customer,
      products
    );

    return {
      customer,
      historicalOrders,
      availableProducts: products,
    };
  }

  async setupBasicMenuScenario(): Promise<BasicMenuScenarioResult> {
    // GIVEN: A complete menu setup with different categories
    const [pizzas, salads, appetizers, desserts] = await Promise.all([
      Promise.all([
        this.dataManager.productFactory.createMargheritaPizza(),
        this.dataManager.productFactory.createPepperoniPizza(),
      ]),
      Promise.all([
        this.dataManager.productFactory.createCaesarSalad(),
      ]),
      Promise.all([
        this.dataManager.productFactory.createGarlicBread(),
      ]),
      Promise.all([
        this.dataManager.productFactory.createTiramisu(),
      ]),
    ]);

    return { pizzas, salads, appetizers, desserts };
  }

  async setupOrderProcessingScenario(): Promise<OrderProcessingScenarioResult> {
    // GIVEN: A customer and products for order processing
    const customer = await this.dataManager.customerFactory.createBasicCustomer({
      name: "Processing Test Customer",
      email: `processing.${Date.now()}@example.com`,
    });

    const products = await Promise.all([
      this.dataManager.productFactory.createMargheritaPizza(),
      this.dataManager.productFactory.createCaesarSalad(),
    ]);

    // GIVEN: Orders in different processing states
    const pendingOrder = await this.dataManager.orderFactory.createPendingOrder({
      customer,
      products: [products[0]],
      notes: "Please deliver quickly",
    });

    const preparingOrder = await this.dataManager.orderFactory.createPreparingOrder({
      customer,
      products: [products[1]],
      notes: "Order being prepared",
    });

    return {
      customer,
      products,
      pendingOrder,
      preparingOrder,
    };
  }

  async setupCustomerCrudScenario(): Promise<{
    updateableCustomer: Customer;
    deletableCustomer: Customer;
    activeCustomers: Customer[];
  }> {
    // GIVEN: Customers specifically designed for CRUD testing
    const updateableCustomer = await this.dataManager.customerFactory.createTestCustomerForUpdates({
      name: "Update Test Customer",
      email: `update.crud.${Date.now()}@example.com`,
    });

    const deletableCustomer = await this.dataManager.customerFactory.createTestCustomerForDeletion({
      name: "Delete Test Customer",
      email: `delete.crud.${Date.now()}@example.com`,
    });

    const activeCustomers = await this.dataManager.customerFactory.buildMany(3, {
      name: "Active Customer",
    });

    return {
      updateableCustomer,
      deletableCustomer,
      activeCustomers,
    };
  }

  async setupProductCrudScenario(): Promise<{
    updateableProducts: Product[];
    deletableProducts: Product[];
    productsInActiveOrders: Product[];
  }> {
    // GIVEN: Products for different testing scenarios
    const updateableProducts = await this.dataManager.productFactory.createProductsForUpdates(3);
    const deletableProducts = await this.dataManager.productFactory.createProductsForDeletion(3);

    // GIVEN: Products that are in active orders (should not be deletable)
    const customer = await this.dataManager.customerFactory.createBasicCustomer();
    const productsInActiveOrders = await Promise.all([
      this.dataManager.productFactory.createPepperoniPizza({ name: "Pizza in Active Order" }),
      this.dataManager.productFactory.createCaesarSalad({ name: "Salad in Active Order" }),
    ]);

    // Create active orders with these products
    await this.dataManager.orderFactory.createPreparingOrder({
      customer,
      products: [productsInActiveOrders[0]],
    });

    await this.dataManager.orderFactory.createPendingOrder({
      customer,
      products: [productsInActiveOrders[1]],
    });

    return {
      updateableProducts,
      deletableProducts,
      productsInActiveOrders,
    };
  }

  getDataManager(): TestDataManager {
    return this.dataManager;
  }
}