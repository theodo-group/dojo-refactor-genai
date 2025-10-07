Feature: Read Orders
  As a user of the restaurant API
  I want to retrieve orders
  So that I can view order information

  Scenario: OK case - Get all orders
    Given the customer "JohnDoe" exists
    Given the customer "JaneSmith" exists
    Given the product "Pizza" exists with price "12.99"
    Given the product "Salad" exists with price "8.99"
    Given the order "Order1" exists for customer "JohnDoe" with products "Pizza" and status "pending"
    Given the order "Order2" exists for customer "JaneSmith" with products "Salad" and status "delivered"
    When a GET request is made to "/api/orders"
    Then the response status code should be 200
    Then the response should be an array
    Then the number of orders should be 2
    Then all orders should have customer and products

  Scenario: OK case - Get orders filtered by status
    Given the customer "JohnDoe" exists
    Given the product "Pizza" exists with price "12.99"
    Given the product "Salad" exists with price "8.99"
    Given the order "Order1" exists for customer "JohnDoe" with products "Pizza" and status "pending"
    Given the order "Order2" exists for customer "JohnDoe" with products "Salad" and status "delivered"
    When a GET request is made to "/api/orders?status=pending"
    Then the response status code should be 200
    Then the response should be an array
    Then all orders should have status "pending"

  Scenario: OK case - Get order by id
    Given the customer "JohnDoe" exists
    Given the product "Pizza" exists with price "12.99"
    Given the order "Order1" exists for customer "JohnDoe" with products "Pizza" and status "pending"
    When a GET request is made to "/api/orders/{:Order1.id}"
    Then the response status code should be 200
    Then the response should have an id
    Then the response body should match order "Order1"
    Then the order should belong to customer "JohnDoe"
    Then the order should have 1 product

  Scenario: OK case - Get orders for a customer
    Given the customer "JohnDoe" exists
    Given the customer "JaneSmith" exists
    Given the product "Pizza" exists with price "12.99"
    Given the product "Salad" exists with price "8.99"
    Given the order "Order1" exists for customer "JohnDoe" with products "Pizza" and status "pending"
    Given the order "Order2" exists for customer "JohnDoe" with products "Salad" and status "delivered"
    Given the order "Order3" exists for customer "JaneSmith" with products "Pizza" and status "ready"
    When a GET request is made to "/api/orders/customer/{:JohnDoe.id}"
    Then the response status code should be 200
    Then the response should be an array
    Then the number of orders should be 2
    Then all orders should belong to customer "JohnDoe"
