Feature: Update Order Status
  As a user of the restaurant API
  I want to update order status
  So that I can track order progress

  Scenario: OK case - Update order status
    Given the customer "JohnDoe" exists
    Given the product "Pizza" exists with price "12.99"
    Given the order "Order1" exists for customer "JohnDoe" with products "Pizza" and status "ready"
    When a PATCH request is made to "/api/orders/{:Order1.id}/status" with body:
      """
      {
        "status": "delivered"
      }
      """
    Then the response status code should be 200
    Then the response body should match order "Order1"
    Then the order "Order1" should have status "delivered"

  Scenario: KO case - Prevent invalid status transitions
    Given the customer "JohnDoe" exists
    Given the product "Pizza" exists with price "12.99"
    Given the order "Order1" exists for customer "JohnDoe" with products "Pizza" and status "delivered"
    When a PATCH request is made to "/api/orders/{:Order1.id}/status" with body:
      """
      {
        "status": "preparing"
      }
      """
    Then the response status code should be 400
