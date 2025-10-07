Feature: Create Orders
  As a user of the restaurant API
  I want to create orders
  So that I can place orders for customers

  Scenario: OK case - Create a new order
    Given the customer "JohnDoe" exists
    Given the product "Pizza" exists with price "12.99"
    Given the product "Salad" exists with price "8.99"
    When a POST request is made to "/api/orders" with body:
      """
      {
        "customerId": "{:JohnDoe.id}",
        "productIds": ["{:Pizza.id}", "{:Salad.id}"],
        "totalAmount": 21.98,
        "notes": "Test order notes"
      }
      """
    Then the response status code should be 201
    Then the response should have an id
    Then the order should belong to customer "JohnDoe"
    Then the order should have 2 products
    Then the order should have notes "Test order notes"
    Then the order should have total amount "21.98"
