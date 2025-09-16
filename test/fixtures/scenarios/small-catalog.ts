import { registerScenario } from "../scenario/registry";

registerScenario("small-catalog", (p) => {
  p.ensureCustomer("alice", { name: "Alice", email: "alice@example.com" });
  p.ensureCustomer("bob", { name: "Bob", email: "bob@example.com" });

  p.ensureMany.product({
    pizza: {
      name: "Margherita Pizza",
      description: "Classic",
      price: 12.99,
      category: "pizza",
    },
    cola: { name: "Cola", description: "Soda", price: 4.99, category: "drink" },
    salad: {
      name: "Caesar Salad",
      description: "Fresh",
      price: 8.99,
      category: "salad",
    },
  });
});
