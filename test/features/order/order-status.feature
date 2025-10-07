Feature: Order Status Management
  As a restaurant staff member
  I want to update and cancel orders
  So that I can manage the order lifecycle

  Background:
    Given the application is running
    And the database is clean

  Scenario: Update order status from ready to delivered
    Given a customer exists
    And 2 products exist
    And the customer has an order with status "ready"
    When I update the order status to "delivered"
    Then the response status should be 200
    And the order status should be "delivered"

  Scenario: Prevent invalid status transition from delivered to preparing
    Given a customer exists
    And 2 products exist
    And the customer has an order with status "delivered"
    When I update the order status to "preparing"
    Then the response status should be 400

  Scenario: Cancel a pending order
    Given a customer exists
    And 2 products exist
    And the customer has an order with status "pending"
    When I cancel the order
    Then the response status should be 204
    And when I retrieve the order it should have status "cancelled"

  Scenario: Cancel a preparing order
    Given a customer exists
    And 2 products exist
    And the customer has an order with status "preparing"
    When I cancel the order
    Then the response status should be 204
    And when I retrieve the order it should have status "cancelled"
