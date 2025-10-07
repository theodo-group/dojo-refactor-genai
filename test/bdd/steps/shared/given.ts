import { DefineStepFunction } from "jest-cucumber";
import { Context } from "../../context";
import { Product } from "../../../../src/entities/product.entity";
import { Customer } from "../../../../src/entities/customer.entity";
import { Order, OrderStatus } from "../../../../src/entities/order.entity";

/**
 * Given step: Create a product with default values
 * Example: Given the product "MargheritaPizza" exists
 */
export const givenTheProductExists = (
  given: DefineStepFunction,
  context: Context
) => {
  given(/^the product "([^"]*)" exists$/, async (productName: string) => {
    const product = await context.productRepository.save({
      name: productName,
      description: `Description for ${productName}`,
      price: 12.99,
      category: "pizza",
      isAvailable: true,
    });
    context.data[productName] = product;
  });
};

/**
 * Given step: Create a product with specific properties
 * Example: Given the product "ExpensivePizza" exists with price "25.99" and category "premium"
 */
export const givenTheProductExistsWithProperties = (
  given: DefineStepFunction,
  context: Context
) => {
  given(
    /^the product "([^"]*)" exists with price "([^"]*)" and category "([^"]*)"$/,
    async (productName: string, price: string, category: string) => {
      const product = await context.productRepository.save({
        name: productName,
        description: `Description for ${productName}`,
        price: parseFloat(price),
        category,
        isAvailable: true,
      });
      context.data[productName] = product;
    }
  );
};

/**
 * Given step: Create an unavailable product
 * Example: Given the unavailable product "OutOfStock" exists
 */
export const givenTheUnavailableProductExists = (
  given: DefineStepFunction,
  context: Context
) => {
  given(
    /^the unavailable product "([^"]*)" exists$/,
    async (productName: string) => {
      const product = await context.productRepository.save({
        name: productName,
        description: `Description for ${productName}`,
        price: 15.99,
        category: "special",
        isAvailable: false,
      });
      context.data[productName] = product;
    }
  );
};

/**
 * Given step: Create a customer with default values
 * Example: Given the customer "JohnDoe" exists
 */
export const givenTheCustomerExists = (
  given: DefineStepFunction,
  context: Context
) => {
  given(/^the customer "([^"]*)" exists$/, async (customerName: string) => {
    const customer = await context.customerRepository.save({
      name: customerName,
      email: `${customerName.toLowerCase()}@example.com`,
      phone: "123-456-7890",
      address: "123 Main St",
      isActive: true,
    });
    context.data[customerName] = customer;
  });
};

/**
 * Given step: Create a customer with specific email
 * Example: Given the customer "JaneDoe" exists with email "jane@test.com"
 */
export const givenTheCustomerExistsWithEmail = (
  given: DefineStepFunction,
  context: Context
) => {
  given(
    /^the customer "([^"]*)" exists with email "([^"]*)"$/,
    async (customerName: string, email: string) => {
      const customer = await context.customerRepository.save({
        name: customerName,
        email,
        phone: "123-456-7890",
        address: "123 Main St",
        isActive: true,
      });
      context.data[customerName] = customer;
    }
  );
};

/**
 * Given step: Create an order for a customer
 * Example: Given the order "Order1" exists for customer "JohnDoe" with product "Pizza" and total "12.99"
 */
export const givenTheOrderExists = (
  given: DefineStepFunction,
  context: Context
) => {
  given(
    /^the order "([^"]*)" exists for customer "([^"]*)" with product "([^"]*)" and total "([^"]*)"$/,
    async (
      orderName: string,
      customerName: string,
      productName: string,
      total: string
    ) => {
      const customer = context.data[customerName] as Customer;
      const product = context.data[productName] as Product;

      if (!customer) {
        throw new Error(`Customer ${customerName} not found in context`);
      }
      if (!product) {
        throw new Error(`Product ${productName} not found in context`);
      }

      const order = await context.orderRepository.save({
        customer,
        customerId: customer.id,
        products: [product],
        totalAmount: parseFloat(total),
        status: OrderStatus.PENDING,
        notes: `Order ${orderName}`,
      });

      context.data[orderName] = order;
    }
  );
};

/**
 * Given step: Create an order with specific status
 * Example: Given the order "Order1" exists for customer "JohnDoe" with status "delivered"
 */
export const givenTheOrderExistsWithStatus = (
  given: DefineStepFunction,
  context: Context
) => {
  given(
    /^the order "([^"]*)" exists for customer "([^"]*)" with product "([^"]*)" and status "([^"]*)"$/,
    async (
      orderName: string,
      customerName: string,
      productName: string,
      status: string
    ) => {
      const customer = context.data[customerName] as Customer;
      const product = context.data[productName] as Product;

      if (!customer) {
        throw new Error(`Customer ${customerName} not found in context`);
      }
      if (!product) {
        throw new Error(`Product ${productName} not found in context`);
      }

      // Map lowercase status string to OrderStatus enum
      const statusMap: Record<string, OrderStatus> = {
        pending: OrderStatus.PENDING,
        preparing: OrderStatus.PREPARING,
        ready: OrderStatus.READY,
        delivered: OrderStatus.DELIVERED,
        cancelled: OrderStatus.CANCELLED,
      };

      const orderStatus = statusMap[status.toLowerCase()];
      if (!orderStatus) {
        throw new Error(`Invalid order status: ${status}`);
      }

      const order = await context.orderRepository.save({
        customer,
        customerId: customer.id,
        products: [product],
        totalAmount: product.price,
        status: orderStatus,
        notes: `Order ${orderName}`,
      });

      context.data[orderName] = order;
    }
  );
};
