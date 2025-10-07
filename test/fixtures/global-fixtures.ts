import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../src/entities/customer.entity';
import { Product } from '../../src/entities/product.entity';
import { Order, OrderStatus } from '../../src/entities/order.entity';

// Helper to clear all database tables
export async function clearDatabase(app: INestApplication): Promise<void> {
  const orderRepository: Repository<Order> = app.get(getRepositoryToken(Order));
  const productRepository: Repository<Product> = app.get(getRepositoryToken(Product));
  const customerRepository: Repository<Customer> = app.get(getRepositoryToken(Customer));

  await orderRepository.query('TRUNCATE TABLE order_products CASCADE');
  await orderRepository.query('TRUNCATE TABLE orders CASCADE');
  await productRepository.query('TRUNCATE TABLE products CASCADE');
  await customerRepository.query('TRUNCATE TABLE customers CASCADE');
}

// Customer factory functions
export async function createStandardCustomer(
  app: INestApplication,
  overrides?: Partial<Customer>
): Promise<Customer> {
  const customerRepository: Repository<Customer> = app.get(getRepositoryToken(Customer));

  const customer = customerRepository.create({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '123-456-7890',
    address: '123 Main St',
    ...overrides,
  });

  return await customerRepository.save(customer);
}

export async function createCustomerWith4Orders(
  app: INestApplication
): Promise<{ customer: Customer; orders: Order[]; products: Product[] }> {
  const orderRepository: Repository<Order> = app.get(getRepositoryToken(Order));

  // Create customer
  const customer = await createStandardCustomer(app, {
    name: 'Loyal Customer',
    email: 'loyal@example.com',
  });

  // Create products for orders
  const products = await createStandardProducts(app);

  // Create dates for the orders - to make customer eligible for loyalty program
  const now = new Date();
  const tenDaysAgo = new Date(now);
  tenDaysAgo.setDate(now.getDate() - 10);

  const fifteenDaysAgo = new Date(now);
  fifteenDaysAgo.setDate(now.getDate() - 15);

  const twentyDaysAgo = new Date(now);
  twentyDaysAgo.setDate(now.getDate() - 20);

  const twentyFiveDaysAgo = new Date(now);
  twentyFiveDaysAgo.setDate(now.getDate() - 25);

  const orders = [
    orderRepository.create({
      customer: customer,
      products: [products[0], products[3]],
      totalAmount: 17.98,
      status: OrderStatus.DELIVERED,
      notes: 'Extra cheese please',
      createdAt: tenDaysAgo,
      updatedAt: tenDaysAgo
    }),
    orderRepository.create({
      customer: customer,
      products: [products[1], products[2], products[4]],
      totalAmount: 31.97,
      status: OrderStatus.PREPARING,
      createdAt: fifteenDaysAgo,
      updatedAt: fifteenDaysAgo
    }),
    orderRepository.create({
      customer: customer,
      products: [products[0], products[2]],
      totalAmount: 21.98,
      status: OrderStatus.DELIVERED,
      createdAt: twentyDaysAgo,
      updatedAt: twentyDaysAgo
    }),
    orderRepository.create({
      customer: customer,
      products: [products[4]],
      totalAmount: 7.99,
      status: OrderStatus.READY,
      createdAt: twentyFiveDaysAgo,
      updatedAt: twentyFiveDaysAgo
    }),
  ];

  const savedOrders = await orderRepository.save(orders);

  return { customer, orders: savedOrders, products };
}

export async function createMultipleCustomers(
  app: INestApplication,
  count: number = 3
): Promise<Customer[]> {
  const customerRepository: Repository<Customer> = app.get(getRepositoryToken(Customer));

  const customerData = [
    { name: 'John Doe', email: 'john@example.com', phone: '123-456-7890', address: '123 Main St' },
    { name: 'Jane Smith', email: 'jane@example.com', phone: '987-654-3210', address: '456 Oak Ave' },
    { name: 'Bob Johnson', email: 'bob@example.com', phone: '555-555-5555', address: '789 Pine Rd' },
  ];

  const customers = customerData.slice(0, count).map(data =>
    customerRepository.create(data)
  );

  return await customerRepository.save(customers);
}

// Product factory functions
export async function createStandardProducts(
  app: INestApplication
): Promise<Product[]> {
  const productRepository: Repository<Product> = app.get(getRepositoryToken(Product));

  const products = [
    productRepository.create({
      name: 'Margherita Pizza',
      description: 'Classic pizza with tomato sauce and mozzarella',
      price: 12.99,
      category: 'pizza',
    }),
    productRepository.create({
      name: 'Pepperoni Pizza',
      description: 'Pizza with tomato sauce, mozzarella, and pepperoni',
      price: 14.99,
      category: 'pizza',
    }),
    productRepository.create({
      name: 'Caesar Salad',
      description: 'Fresh salad with romaine lettuce, croutons, and Caesar dressing',
      price: 8.99,
      category: 'salad',
    }),
    productRepository.create({
      name: 'Garlic Bread',
      description: 'Toasted bread with garlic butter',
      price: 4.99,
      category: 'appetizer',
    }),
    productRepository.create({
      name: 'Tiramisu',
      description: 'Classic Italian dessert with coffee and mascarpone',
      price: 7.99,
      category: 'dessert',
    }),
  ];

  return await productRepository.save(products);
}

export async function createSingleProduct(
  app: INestApplication,
  overrides?: Partial<Product>
): Promise<Product> {
  const productRepository: Repository<Product> = app.get(getRepositoryToken(Product));

  const product = productRepository.create({
    name: 'Test Product',
    description: 'Test product description',
    price: 9.99,
    category: 'test',
    ...overrides,
  });

  return await productRepository.save(product);
}

// Order factory functions
export async function createPendingOrder(
  app: INestApplication,
  customer: Customer,
  products: Product[]
): Promise<Order> {
  const orderRepository: Repository<Order> = app.get(getRepositoryToken(Order));

  const totalAmount = products.reduce((sum, p) => sum + Number(p.price), 0);

  const order = orderRepository.create({
    customer,
    products,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    status: OrderStatus.PENDING,
    notes: 'Test pending order',
  });

  return await orderRepository.save(order);
}

export async function createDeliveredOrder(
  app: INestApplication,
  customer: Customer,
  products: Product[],
  createdAt?: Date
): Promise<Order> {
  const orderRepository: Repository<Order> = app.get(getRepositoryToken(Order));

  const totalAmount = products.reduce((sum, p) => sum + Number(p.price), 0);

  const order = orderRepository.create({
    customer,
    products,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    status: OrderStatus.DELIVERED,
    notes: 'Test delivered order',
    ...(createdAt && { createdAt, updatedAt: createdAt }),
  });

  return await orderRepository.save(order);
}

export async function createReadyOrder(
  app: INestApplication,
  customer: Customer,
  products: Product[]
): Promise<Order> {
  const orderRepository: Repository<Order> = app.get(getRepositoryToken(Order));

  const totalAmount = products.reduce((sum, p) => sum + Number(p.price), 0);

  const order = orderRepository.create({
    customer,
    products,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    status: OrderStatus.READY,
    notes: 'Test ready order',
  });

  return await orderRepository.save(order);
}

export async function createPreparingOrder(
  app: INestApplication,
  customer: Customer,
  products: Product[]
): Promise<Order> {
  const orderRepository: Repository<Order> = app.get(getRepositoryToken(Order));

  const totalAmount = products.reduce((sum, p) => sum + Number(p.price), 0);

  const order = orderRepository.create({
    customer,
    products,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    status: OrderStatus.PREPARING,
    notes: 'Test preparing order',
  });

  return await orderRepository.save(order);
}
