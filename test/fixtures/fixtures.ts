import { Customer } from "src/entities/customer.entity";
import { OrderStatus } from "src/entities/order.entity";
import { DeepPartial } from "typeorm";

export const customer_0: DeepPartial<Customer> = {
  name: "John Doe",
  email: "john@example.com",
  phone: "123-456-7890",
  address: "123 Main St",
};

export const customer_1: DeepPartial<Customer> = {
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "987-654-3210",
  address: "456 Oak Ave",
};

export const customer_2: DeepPartial<Customer> = {
  name: "Bob Johnson",
  email: "bob@example.com",
  phone: "555-555-5555",
  address: "789 Pine Rd",
};

export const product_0 = {
  name: "Margherita Pizza",
  description: "Classic pizza with tomato sauce and mozzarella",
  price: 12.99,
  category: "pizza",
};

export const product_1 = {
  name: "Pepperoni Pizza",
  description: "Pizza with tomato sauce, mozzarella, and pepperoni",
  price: 14.99,
  category: "pizza",
};

export const product_2 = {
  name: "Caesar Salad",
  description:
    "Fresh salad with romaine lettuce, croutons, and Caesar dressing",
  price: 8.99,
  category: "salad",
};

export const product_3 = {
  name: "Garlic Bread",
  description: "Toasted bread with garlic butter",
  price: 4.99,
  category: "appetizer",
};

export const product_4 = {
  name: "Tiramisu",
  description: "Classic Italian dessert with coffee and mascarpone",
  price: 7.99,
  category: "dessert",
};

const now = new Date();
const tenDaysAgo = new Date(now);
tenDaysAgo.setDate(now.getDate() - 10);

const fifteenDaysAgo = new Date(now);
fifteenDaysAgo.setDate(now.getDate() - 15);

const twentyDaysAgo = new Date(now);
twentyDaysAgo.setDate(now.getDate() - 20);

const twentyFiveDaysAgo = new Date(now);
twentyFiveDaysAgo.setDate(now.getDate() - 25);

export const order_0 = {
  customer: customer_0,
  products: [product_0, product_3],
  totalAmount: 17.98,
  status: OrderStatus.DELIVERED,
  notes: "Extra cheese please",
  createdAt: tenDaysAgo,
  updatedAt: tenDaysAgo,
};
export const order_1 = {
  customer: customer_0,
  products: [product_1, product_2, product_4],
  totalAmount: 17.98,
  status: OrderStatus.DELIVERED,
  notes: "Extra cheese please",
  createdAt: tenDaysAgo,
  updatedAt: tenDaysAgo,
};
export const order_2 = {
  customer: customer_0,
  products: [product_0, product_2],
  totalAmount: 17.98,
  status: OrderStatus.DELIVERED,
  notes: "Extra cheese please",
  createdAt: tenDaysAgo,
  updatedAt: tenDaysAgo,
};
export const order_3 = {
  customer: customer_0,
  products: [product_4],
  totalAmount: 17.98,
  status: OrderStatus.DELIVERED,
  notes: "Extra cheese please",
  createdAt: tenDaysAgo,
  updatedAt: tenDaysAgo,
};
