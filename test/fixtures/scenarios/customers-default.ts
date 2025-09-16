import { registerScenario } from "../scenario/registry";

registerScenario("customers-default", (p) => {
  p.ensureMany.customer({
    john: {
      name: "John Doe",
      email: "john@example.com",
      phone: "123-456-7890",
      address: "123 Main St",
    },
    jane: {
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "987-654-3210",
      address: "456 Oak Ave",
    },
    bob: {
      name: "Bob Johnson",
      email: "bob@example.com",
      phone: "555-555-5555",
      address: "789 Pine Rd",
    },
  });
});
