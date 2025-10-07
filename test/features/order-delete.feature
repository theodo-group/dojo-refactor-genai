Feature: Cancel Orders
  As a user of the restaurant API
  I want to cancel orders
  So that I can manage order cancellations

  Scenario: OK case - Cancel a pending order
    Given the customer "JohnDoe" exists
    Given the product "Pizza" exists with price "12.99"
    Given the order "Order1" exists for customer "JohnDoe" with products "Pizza" and status "pending"
    When a DELETE request is made to "/api/orders/{:Order1.id}"
    Then the response status code should be 204
    When a GET request is made to "/api/orders/{:Order1.id}"
    Then the response status code should be 200
    Then the order "Order1" should have status "cancelled"
