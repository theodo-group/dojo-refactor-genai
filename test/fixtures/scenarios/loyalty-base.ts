import { registerScenario } from "../scenario/registry";
import { OrderStatus } from "../../../src/entities/order.entity";

// A base scenario where 'john' has >3 historical orders to be eligible for loyalty discounts
registerScenario("loyalty-base", (p) => {
  p.ensureMany.customer({
    john: { name: "John Doe", email: "john@example.com" },
  });
  p.ensureMany.product({
    margherita: {
      name: "Margherita Pizza",
      description: "Classic",
      price: 12.99,
      category: "pizza",
    },
    garlic: {
      name: "Garlic Bread",
      description: "Bread",
      price: 4.99,
      category: "appetizer",
    },
    pepperoni: {
      name: "Pepperoni Pizza",
      description: "Pep",
      price: 14.99,
      category: "pizza",
    },
    caesar: {
      name: "Caesar Salad",
      description: "Fresh",
      price: 8.99,
      category: "salad",
    },
    tiramisu: {
      name: "Tiramisu",
      description: "Dessert",
      price: 7.99,
      category: "dessert",
    },
  });

  // 4 orders in the past
  p.ensureOrder("o1", {
    customer: "john",
    products: ["margherita", "garlic"],
    totalAmount: 17.98,
    status: OrderStatus.DELIVERED,
  });
  p.ensureOrder("o2", {
    customer: "john",
    products: ["pepperoni", "caesar", "tiramisu"],
    totalAmount: 31.97,
    status: OrderStatus.DELIVERED,
  });
  p.ensureOrder("o3", {
    customer: "john",
    products: ["margherita", "caesar"],
    totalAmount: 21.98,
    status: OrderStatus.DELIVERED,
  });
  p.ensureOrder("o4", {
    customer: "john",
    products: ["tiramisu"],
    totalAmount: 7.99,
    status: OrderStatus.READY,
  });
});
