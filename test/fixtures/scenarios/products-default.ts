import { registerScenario } from "../scenario/registry";

registerScenario("products-default", (p) => {
  p.ensureMany.product({
    margherita: {
      name: "Margherita Pizza",
      description: "Classic pizza with tomato sauce and mozzarella",
      price: 12.99,
      category: "pizza",
    },
    pepperoni: {
      name: "Pepperoni Pizza",
      description: "Pizza with tomato sauce, mozzarella, and pepperoni",
      price: 14.99,
      category: "pizza",
    },
    caesar: {
      name: "Caesar Salad",
      description:
        "Fresh salad with romaine lettuce, croutons, and Caesar dressing",
      price: 8.99,
      category: "salad",
    },
    garlic: {
      name: "Garlic Bread",
      description: "Toasted bread with garlic butter",
      price: 4.99,
      category: "appetizer",
    },
    tiramisu: {
      name: "Tiramisu",
      description: "Classic Italian dessert with coffee and mascarpone",
      price: 7.99,
      category: "dessert",
    },
  });
});
